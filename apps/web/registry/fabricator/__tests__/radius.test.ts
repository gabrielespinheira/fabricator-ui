import { describe, expect, it } from "vitest"

import { DENSITIES, DENSITY_NAMES } from "@/registry/fabricator/density"
import {
  getNativeRadii,
  getNestedRadius,
  getRoleRadius,
  getWrappingRadius,
  POPUP_INSET,
  RADIUS_ROLE_VARS,
  RADIUS_ROLES,
  RADIUS_SHAPES,
  SHAPE_RADII,
  toShapeVars,
} from "@/registry/fabricator/radius"

const controlHeight = (density: (typeof DENSITY_NAMES)[number]) =>
  DENSITIES[density].space[36]

describe("radius shapes", () => {
  it("define every role in every shape", () => {
    for (const shape of RADIUS_SHAPES) {
      expect(Object.keys(SHAPE_RADII[shape]).sort()).toEqual(
        [...RADIUS_ROLES].sort()
      )
    }
  })

  it("keep Rounded's controls at 8px and its containers at 12px", () => {
    expect(getRoleRadius("rounded", "control", 36)).toBe(8)
    expect(getRoleRadius("rounded", "surface", 36)).toBe(12)
    expect(getRoleRadius("rounded", "panel", 36)).toBe(16)
    expect(getRoleRadius("rounded", "mark", 36)).toBe(4)
  })

  it("scale control corners with the control height", () => {
    for (const shape of RADIUS_SHAPES) {
      const [compact, normal, spacious] = DENSITY_NAMES.map((density) =>
        getRoleRadius(shape, "control", controlHeight(density))
      )
      expect(compact).toBeLessThan(normal)
      expect(normal).toBeLessThan(spacious)
    }
  })

  it("make Pill controls capsules at every density", () => {
    for (const density of DENSITY_NAMES) {
      const height = controlHeight(density)
      expect(getRoleRadius("pill", "control", height)).toBe(height / 2)
    }
  })

  it("keep containers moderate in Pill", () => {
    expect(getRoleRadius("pill", "surface", 36)).toBe(22)
    expect(getRoleRadius("pill", "panel", 36)).toBe(26)
  })

  it("round cards more than popups, following the density", () => {
    const cards = (shape: (typeof RADIUS_SHAPES)[number]) =>
      DENSITY_NAMES.map((density) =>
        getRoleRadius(shape, "card", controlHeight(density))
      )
    expect(cards("rounded")).toEqual([12, 16, 20])
    expect(cards("squircle")).toEqual([16, 20, 24])
    expect(cards("pill")).toEqual([22, 26, 30])
  })

  it("keep a card as round as its popups and the panel around it", () => {
    for (const shape of RADIUS_SHAPES) {
      for (const density of DENSITY_NAMES) {
        const height = controlHeight(density)
        expect(getRoleRadius(shape, "card", height)).toBeGreaterThanOrEqual(
          getRoleRadius(shape, "surface", height)
        )
      }
      expect(getRoleRadius(shape, "card", 36)).toBe(
        getRoleRadius(shape, "panel", 36)
      )
    }
  })

  it("rank the roles mark < control <= surface < panel", () => {
    for (const shape of RADIUS_SHAPES) {
      for (const density of DENSITY_NAMES) {
        const height = controlHeight(density)
        const radius = (role: (typeof RADIUS_ROLES)[number]) =>
          getRoleRadius(shape, role, height)
        expect(radius("mark")).toBeLessThan(radius("control"))
        expect(radius("control")).toBeLessThanOrEqual(radius("surface"))
        expect(radius("surface")).toBeLessThan(radius("panel"))
      }
    }
  })
})

describe("layered corners", () => {
  it("subtract the inset for a nested corner, never below the mark", () => {
    expect(getNestedRadius({ outer: 12, inset: 4, mark: 4 })).toBe(8)
    expect(getNestedRadius({ outer: 12, inset: 16, mark: 4 })).toBe(4)
  })

  it("add the inset for a wrapping corner", () => {
    expect(getWrappingRadius({ inner: 8, inset: 8 })).toBe(16)
  })

  it("make popup rows concentric, and capsules in Pill", () => {
    for (const shape of RADIUS_SHAPES) {
      for (const density of DENSITY_NAMES) {
        const height = controlHeight(density)
        const row = getNestedRadius({
          outer: getRoleRadius(shape, "surface", height),
          inset: POPUP_INSET,
          mark: getRoleRadius(shape, "mark", height),
        })
        if (shape === "pill") expect(row).toBe(height / 2)
        else expect(row).toBe(getRoleRadius(shape, "surface", height) - 4)
      }
    }
  })
})

describe("radius CSS", () => {
  it("write each shape's ratios, bases and corner shape", () => {
    expect(toShapeVars("rounded")).toMatchObject({
      "radius-control-ratio": String(2 / 9),
      "radius-surface-base": "12px",
      "corner-shape": "round",
    })
    expect(toShapeVars("squircle")).toMatchObject({
      "corner-shape": "superellipse(1.5)",
    })
    expect(toShapeVars("squircle")["radius-squircle-scale"]).toBeDefined()
    expect(toShapeVars("pill")).toMatchObject({
      "radius-control-ratio": "0.5",
      "radius-surface-ratio": "0.5",
      "radius-surface-base": "4px",
    })
  })

  it("compute the roles from the control height in every scope", () => {
    for (const role of RADIUS_ROLES) {
      expect(RADIUS_ROLE_VARS[`radius-${role}`]).toContain("--density-36")
      expect(RADIUS_ROLE_VARS[`radius-${role}`]).toContain(
        "--radius-corner-scale"
      )
    }
  })

  it("step a small card's corner down with its inset, never below a popup's", () => {
    expect(RADIUS_ROLE_VARS["radius-card-sm"]).toBe(
      "max(var(--radius-surface), calc(var(--radius-card) - var(--density-4)))"
    )
    expect(RADIUS_ROLE_VARS["radius-card-inner"]).toBe(
      "max(var(--radius-mark), calc(var(--radius-card) - var(--density-4)))"
    )
  })

  it("subtract an unscaled inset for nested rows and inner parts", () => {
    expect(RADIUS_ROLE_VARS["radius-nested"]).toBe(
      "max(var(--radius-mark), calc(var(--radius-surface) - 4px))"
    )
    expect(RADIUS_ROLE_VARS["radius-inner"]).toBe(
      "max(var(--radius-mark), calc(var(--radius-control) - var(--density-4)))"
    )
  })

  it("add the inset for tracks around controls", () => {
    expect(RADIUS_ROLE_VARS["radius-wrap"]).toBe(
      "calc(var(--radius-control) + var(--density-4))"
    )
  })
})

describe("native radii", () => {
  it("resolve every role and layer in px for a density", () => {
    expect(getNativeRadii("rounded", DENSITIES.default)).toEqual({
      control: 8,
      surface: 12,
      panel: 16,
      mark: 4,
      card: 16,
      cardSmall: 12,
      cardInner: 12,
      nested: 8,
      inner: 4,
      wrap: 12,
    })
  })

  it("make Pill rows and controls capsules at the device's density", () => {
    const radii = getNativeRadii("pill", DENSITIES.spacious)
    expect(radii.control).toBe(22)
    expect(radii.nested).toBe(22)
  })

  it("draw Squircle at its base radii (iOS's continuous curve)", () => {
    expect(getNativeRadii("squircle", DENSITIES.default).surface).toBe(14)
  })

  it("resolve the card corners for native cards", () => {
    expect(getNativeRadii("squircle", DENSITIES.default)).toMatchObject({
      card: 20,
      cardSmall: 16,
      cardInner: 16,
    })
    expect(getNativeRadii("rounded", DENSITIES.compact)).toMatchObject({
      card: 12,
      cardSmall: 12,
      cardInner: 10,
    })
  })
})
