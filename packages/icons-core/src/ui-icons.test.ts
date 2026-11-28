import { Resvg } from "@resvg/resvg-js"
import { describe, expect, it } from "vitest"

import { getBounds } from "./geometry"
import { measureIconFootprint } from "./icon-footprint"
import { loadOutlineIcons } from "./outline"
import { renderUiSvg } from "./runtime/ui-svg"
import { roundOutline } from "./ui-geometry"
import { getUiIconData, loadUiIcons, UI_STROKE_WIDTH } from "./ui-icons"

const weights = ["outline", "fill", "duotone"] as const

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

  it("inherits the SVG stroke width for every drawing and cutout", () => {
    const overrides = icons.flatMap((icon) =>
      weights
        .filter((weight) => {
          const {
            node,
            secondary = [],
            cutout = [],
          } = getUiIconData(icon, weight)
          return [...node, ...secondary, ...cutout].some(
            ([, attrs]) => "stroke-width" in attrs
          )
        })
        .map((weight) => `${icon.name}/${weight}`)
    )
    expect(overrides.slice(0, 5)).toEqual([])
  })

  it.each([UI_STROKE_WIDTH, 1, 3])(
    "renders open Fill artwork with the Outline stroke at width %s",
    (strokeWidth) => {
      const arrow = icons.find(({ name }) => name === "arrow-right")
      if (!arrow) throw new Error("Missing arrow-right")
      const render = (weight: "outline" | "fill") =>
        new Resvg(renderUiSvg(getUiIconData(arrow, weight), { strokeWidth }), {
          font: { loadSystemFonts: false },
        }).render().pixels
      expect(Buffer.compare(render("fill"), render("outline"))).toBe(0)
    }
  )

  it("uses the requested width for transparent details in a solid Fill", () => {
    const calendar = icons.find(({ name }) => name === "calendar-days")
    if (!calendar) throw new Error("Missing calendar-days")
    const data = getUiIconData(calendar, "fill")
    const measure = (strokeWidth: number) =>
      measureIconFootprint(renderUiSvg(data, { strokeWidth }))
    const thin = measure(1)
    const thick = measure(3)
    expect(thick.area).toBeLessThan(thin.area)
    expect(thick.span).toBe(thin.span)
  })

  it("keeps visible artwork inside the 24-unit canvas", () => {
    const outside: string[] = []
    for (const icon of icons) {
      for (const [weight, node, inherited] of [
        ["outline", icon.node, UI_STROKE_WIDTH],
        ["fill", icon.fill.node, 0],
        ["duotone", icon.duotone.secondary, 0],
      ] as const) {
        for (const element of node) {
          const { minX, minY, maxX, maxY } = getBounds([element])
          const { stroke } = element[1]
          const width =
            stroke === "none" ? 0 : stroke ? UI_STROKE_WIDTH : inherited
          const margin = width / 2
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

  it("keeps outlines inside the canvas at a three-unit preview stroke", () => {
    const clipped = icons.filter(({ node }) => {
      const { minX, minY, maxX, maxY } = getBounds(node)
      return Math.min(minX, minY) < 1.49 || Math.max(maxX, maxY) > 22.51
    })
    expect(clipped.map(({ name }) => name)).toEqual([])
  })

  it("rasterizes all three weights at compact and full size", () => {
    const errors: string[] = []
    for (const icon of icons) {
      for (const size of [14, 16, 18, 24, 32, 48]) {
        for (const weight of weights) {
          const data = getUiIconData(icon, weight)
          const { pixels } = new Resvg(renderUiSvg(data, { size }), {
            font: { loadSystemFonts: false },
          }).render()
          if (!pixels.some((value, index) => index % 4 === 3 && value > 16))
            errors.push(`${icon.name}/${weight} at ${size}px is empty`)
        }
      }
    }
    expect(errors).toEqual([])
  }, 60_000)

  it.each(weights)(
    "keeps the %s artwork near a common optical size and inside the preview",
    (weight) => {
      const footprints: number[] = []
      const clipped: string[] = []
      for (const icon of icons) {
        const data = getUiIconData(icon, weight)
        const { footprint } = measureIconFootprint(renderUiSvg(data))
        // When Fill shares a stroked viewport, size is determined by the
        // outline. The filled silhouette covers a different amount of ink.
        if (
          weight !== "fill" ||
          data.opticalScale !== icon.opticalScales.outline
        )
          footprints.push(footprint)
        const { edge } = measureIconFootprint(
          renderUiSvg(data, { strokeWidth: 3 })
        )
        if (edge >= 12) clipped.push(icon.name)
      }
      const ordered = footprints.sort((first, second) => first - second)
      const lower = ordered[Math.floor(ordered.length * 0.05)] ?? 0
      const upper = ordered[Math.floor(ordered.length * 0.95)] ?? Infinity
      expect(lower).toBeGreaterThan(20.5)
      expect(upper - lower).toBeLessThan(1.5)
      expect(clipped).toEqual([])
    },
    30_000
  )

  it("matches the apparent size of the Settings sidebar icons", () => {
    const names = ["settings-2", "users", "credit-card"]
    const footprints = names.map((name) => {
      const icon = icons.find((candidate) => candidate.name === name)
      if (!icon) throw new Error(`Missing ${name}`)
      return measureIconFootprint(renderUiSvg(getUiIconData(icon))).footprint
    })
    expect(Math.max(...footprints) - Math.min(...footprints)).toBeLessThan(0.5)
  })

  it("anchors all calendar drawings to the same viewport in all weights", () => {
    const calendars = icons.filter(({ name }) =>
      /^calendars?$|^calendar-/.test(name)
    )
    expect(calendars).toHaveLength(26)
    const scales = calendars.flatMap((icon) =>
      weights.map((weight) => getUiIconData(icon, weight).opticalScale ?? 1)
    )
    expect(new Set(scales).size).toBe(1)
    const bounds = calendars.flatMap((icon) =>
      weights.map((weight) =>
        measureIconFootprint(renderUiSvg(getUiIconData(icon, weight)))
      )
    )
    const heights = bounds.map(({ height }) => height)
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(
      0.25
    )
    expect(bounds.every(({ width, height }) => width <= height + 0.25)).toBe(
      true
    )

    const named = new Map(calendars.map((icon) => [icon.name, icon]))
    const frame = named.get("calendar")?.node[0]
    expect(frame).toBeDefined()
    for (const name of [
      "calendar-check",
      "calendar-check-2",
      "calendar-clock",
      "calendar-fold",
      "calendar-search",
      "calendar-x",
      "calendar-x-2",
    ]) {
      expect(named.get(name)?.node[0], name).toEqual(frame)
    }
  })

  it("locks the Outline and Duotone scale across the catalog", () => {
    for (const icon of icons) {
      expect(icon.opticalScales.duotone, icon.name).toBe(
        icon.opticalScales.outline
      )
    }
  })

  it("keeps Fill linework and cutouts at the Outline scale", () => {
    for (const icon of icons) {
      if (
        [...icon.fill.node, ...icon.fill.cutout].some(
          ([, { stroke }]) => stroke === "currentColor"
        )
      )
        expect(icon.opticalScales.fill, icon.name).toBe(
          icon.opticalScales.outline
        )
    }
  })

  it("optically centres the circle and square letters and uses the same glyph in Fill", () => {
    const letters = icons.filter(({ name }) =>
      /^(circle|square)-letter-[a-z]$/.test(name)
    )
    expect(letters).toHaveLength(52)
    for (const icon of letters) {
      const mark = icon.node.slice(1)
      const { inkCentre } = measureIconFootprint(
        renderUiSvg({ name: icon.name, node: mark })
      )
      expect(Math.abs(inkCentre.x - 12), icon.name).toBeLessThan(1.07)
      expect(Math.abs(inkCentre.y - 12), icon.name).toBeLessThan(1.65)
      if (icon.name.endsWith("-letter-d"))
        expect(inkCentre.x, icon.name).toBeCloseTo(12, 1)
      expect(
        icon.fill.cutout.map(([, attributes]) => attributes.d),
        icon.name
      ).toEqual(mark.map(([, attributes]) => attributes.d))

      const paint = (node: typeof mark) =>
        new Resvg(
          renderUiSvg({ name: icon.name, node }, { size: 96, strokeWidth: 3 }),
          {
            font: { loadSystemFonts: false },
          }
        ).render().pixels
      const frame = paint(icon.node.slice(0, 1))
      const overlaps = paint(mark).some(
        (alpha, index) =>
          index % 4 === 3 && alpha >= 64 && (frame[index] ?? 0) >= 64
      )
      expect(overlaps, icon.name).toBe(false)
    }
  })

  it("keeps generated state modifiers aligned with the shared base frame", () => {
    const named = new Map(icons.map((icon) => [icon.name, icon]))
    for (const names of [
      ["folder", "folder-plus", "folder-search"],
      ["file", "file-plus", "file-search"],
      ["bookmark", "bookmark-check", "bookmark-x"],
      ["message-circle", "message-circle-plus", "message-circle-more"],
    ]) {
      const scales = names.flatMap((name) => {
        const icon = named.get(name)
        if (!icon) throw new Error(`Missing ${name}`)
        return weights.map(
          (weight) => getUiIconData(icon, weight).opticalScale ?? 1
        )
      })
      expect(new Set(scales).size, names.join(", ")).toBe(1)
    }
  })

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
