import { Resvg } from "@resvg/resvg-js"
import { describe, expect, it } from "vitest"

import { getBounds } from "./geometry"
import { loadOutlineIcons } from "./outline"
import { renderUiSvg } from "./runtime/ui-svg"
import type { IconData } from "./types"
import { roundOutline } from "./ui-geometry"
import { loadUiIcons } from "./ui-icons"

describe("Fabricator UI drawings", () => {
  const compatibility = loadOutlineIcons()
  const icons = loadUiIcons()

  it("keeps every canonical name and its alias and search metadata", () => {
    const metadata = ({
      name,
      aliases,
      categories,
      tags,
    }: (typeof compatibility)[number]) => ({
      name,
      aliases,
      categories,
      tags,
    })
    expect(icons.map(metadata)).toEqual(compatibility.map(metadata))
  })

  it("provides three drawings and a motion for every UI icon", () => {
    for (const icon of icons) {
      expect(icon.node.length, icon.name).toBeGreaterThan(0)
      expect(icon.fill.node.length, icon.name).toBeGreaterThan(0)
      expect(icon.duotone.secondary.length, icon.name).toBeGreaterThan(0)
      expect(icon.duotone.node, icon.name).toEqual(icon.node)
      expect(icon.motion, icon.name).toBeTruthy()
    }
  })

  it("keeps visible artwork inside the 24-unit canvas", () => {
    const outside: string[] = []
    for (const icon of icons) {
      for (const [weight, node, inherited] of [
        ["outline", icon.node, 1.5],
        ["fill", icon.fill.node, 0],
        ["duotone", icon.duotone.secondary, 0],
      ] as const) {
        for (const element of node) {
          const { minX, minY, maxX, maxY } = getBounds([element])
          const margin = Number(element[1]["stroke-width"] ?? inherited) / 2
          if (
            ![minX, minY, maxX, maxY, margin].every(Number.isFinite) ||
            Math.min(minX, minY) - margin < -0.06 ||
            Math.max(maxX, maxY) + margin > 24.06
          )
            outside.push(`${icon.name}/${weight}`)
        }
      }
    }
    expect(outside).toEqual([])
  })

  it("rasterizes three distinct drawings at compact and full size", () => {
    const errors: string[] = []
    for (const icon of icons) {
      const weights: Record<string, IconData> = {
        outline: { name: icon.name, node: icon.node },
        fill: { name: icon.name, paint: "fill", ...icon.fill },
        duotone: {
          name: icon.name,
          node: icon.node,
          secondary: icon.duotone.secondary,
        },
      }
      for (const size of [14, 24]) {
        const drawings = new Set<string>()
        for (const [weight, data] of Object.entries(weights)) {
          const { pixels } = new Resvg(renderUiSvg(data, { size }), {
            font: { loadSystemFonts: false },
          }).render()
          if (!pixels.some((value, index) => index % 4 === 3 && value > 16))
            errors.push(`${icon.name}/${weight} at ${size}px is empty`)
          drawings.add(Buffer.from(pixels).toString("base64"))
        }
        if (drawings.size !== 3)
          errors.push(`${icon.name} has duplicate weights at ${size}px`)
      }
    }
    expect(errors).toEqual([])
  }, 30_000)

  it("uses closed shapes for solid artwork and line work for open glyphs", () => {
    const square = icons.find(({ name }) => name === "square")
    const arrow = icons.find(({ name }) => name === "arrow-right")
    expect(square?.fill.node[0]?.[1]["fill-rule"]).toBe("evenodd")
    expect(arrow?.fill.node[0]?.[1].stroke).toBe("currentColor")
    expect(arrow?.duotone.secondary[0]?.[1].stroke).toBe("currentColor")
    expect(arrow?.motion).toBe("right")
  })

  it("carries the authored outline and tone through compatible family modifiers", () => {
    for (const [baseName, memberName] of [
      ["folder", "folder-plus"],
      ["calendar", "calendar-days"],
      ["message-circle", "message-circle-more"],
    ]) {
      const base = icons.find(({ name }) => name === baseName)
      const member = icons.find(({ name }) => name === memberName)
      if (!base || !member) throw new Error(`Missing ${baseName} family`)
      expect(member.node.slice(0, base.node.length)).toEqual(base.node)
      expect(member.node.length).toBeGreaterThan(base.node.length)
      expect(member.duotone.secondary).toEqual(base.duotone.secondary)
    }
  })

  it("reshapes tangent corners while keeping non-corner arcs", () => {
    const [corner, lens] = roundOutline([
      ["path", { d: "M2 18V8a2 2 0 0 1 2-2h13" }],
      ["path", { d: "M6 12a6 6 0 1 0 12 0" }],
    ])
    expect(corner?.[1].d).toMatch(/c/i)
    expect(corner?.[1].d).not.toMatch(/a/i)
    expect(lens?.[1].d).toMatch(/a/i)
  })

  it("retains interior detail as a knockout on an enclosed icon", () => {
    const icon = icons.find(({ name }) => name === "circle-question-mark")
    if (!icon) throw new Error("Missing circle-question-mark")
    expect(icon.fill.cutout.length).toBeGreaterThan(0)
  })
})
