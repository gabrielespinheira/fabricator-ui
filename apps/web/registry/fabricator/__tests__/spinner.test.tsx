import * as React from "react"
import { SPINNER_VALUES as SETUP_SPINNERS } from "@fabricator-ui/setup"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  getSpinnerDots,
  getSpinnerDuration,
  getSpinnerFrame,
  getSpinnerMotion,
  getSpinnerVariables,
  SPINNER_VALUES,
  SPINNERS,
} from "@/registry/fabricator/shared/lib/spinner-model"
import { Spinner } from "@/registry/fabricator/shared/ui/spinner"

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

describe("matrix spinners", () => {
  it("offers the same variants to consumers and setup", () => {
    expect(SPINNER_VALUES).toEqual(SETUP_SPINNERS)
  })

  it.each(SPINNER_VALUES.filter((variant) => variant !== "ring"))(
    "%s has unique dots inside its viewBox and a seamless cycle",
    (variant) => {
      const dots = getSpinnerDots(variant)
      expect(dots.length).toBeGreaterThan(2)
      expect(new Set(dots.map(({ x, y }) => `${x},${y}`)).size).toBe(
        dots.length
      )
      for (const dot of dots) {
        expect(dot.x).toBeGreaterThan(1)
        expect(dot.x).toBeLessThan(23)
        expect(dot.y).toBeGreaterThan(1)
        expect(dot.y).toBeLessThan(23)
        expect(dot.phase).toBeGreaterThanOrEqual(0)
        expect(dot.phase).toBeLessThan(1)
      }
    }
  )

  it("each animation has a different spatial rhythm", () => {
    const rhythms = SPINNER_VALUES.filter((variant) => variant !== "ring").map(
      (variant) => JSON.stringify(getSpinnerDots(variant))
    )
    expect(new Set(rhythms).size).toBe(SPINNER_VALUES.length - 1)
  })

  it("keeps the cycle finite for invalid speeds", () => {
    for (const speed of [0, -1, Infinity, NaN]) {
      expect(getSpinnerDuration(speed)).toBe(getSpinnerDuration(1))
    }
    expect(getSpinnerDuration(2)).toBe(getSpinnerDuration(1) / 2)
  })

  it("the selected default shows exactly one group", () => {
    for (const variant of SPINNER_VALUES) {
      const variables = getSpinnerVariables(variant)
      expect(
        Object.values(variables).filter((value) => value === "inline")
      ).toHaveLength(1)
      expect(variables[`--spinner-${variant}`]).toBe("inline")
      expect(variables["--spinner-variant"]).toBe(
        String(SPINNER_VALUES.indexOf(variant))
      )
    }
  })

  it("keeps the SVG API, slot, accessible label and ref target", () => {
    const markup = render(
      <Spinner
        variant="wave"
        aria-label="Saving"
        data-icon="inline-start"
        className="size-8"
      />
    )
    expect(markup).toContain('data-slot="spinner"')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Saving"')
    expect(markup).toContain('data-icon="inline-start"')
    expect(markup).toContain("size-8")
    expect(markup.match(/data-slot="spinner-pattern"/g)).toHaveLength(1)
    expect(markup).toContain('data-variant="wave"')
  })

  it("allows the project default and stops motion without losing the indicator", () => {
    const markup = render(<Spinner animated={false} />)
    expect(markup).toContain('data-animated="false"')
    expect(markup.match(/data-slot="spinner-pattern"/g)).toHaveLength(
      SPINNER_VALUES.length
    )
    expect(markup).toContain("prefers-reduced-motion")
    expect(markup).toContain("--spinner-orbit")
    expect(markup).toContain('aria-label="Loading"')
  })
})

it("has a quicker default cycle", () => {
  expect(getSpinnerDuration()).toBe(1100)
})

it("offers distinct silhouettes and kinds of movement", () => {
  expect(SPINNERS.map(({ value }) => value)).toEqual(
    expect.arrayContaining(["comet", "bounce", "equalizer", "flip", "scan"])
  )
  expect(getSpinnerDots("wave")).toHaveLength(5)
  expect(getSpinnerDots("bounce")).toHaveLength(3)
  expect(getSpinnerDots("flip")).toHaveLength(4)
  expect(
    getSpinnerDots("equalizer").every((dot) => dot.height > dot.width * 3)
  ).toBe(true)
  const motions = SPINNER_VALUES.filter((value) => value !== "ring").map(
    (value) => JSON.stringify(getSpinnerMotion(value))
  )
  expect(new Set(motions).size).toBe(motions.length)
})

it.each(SPINNER_VALUES.filter((value) => value !== "ring"))(
  "%s loops continuously on both renderers",
  (variant) => {
    const motion = getSpinnerMotion(variant)
    const start = getSpinnerFrame(motion, 0)
    const end = getSpinnerFrame(motion, 1)
    for (const key of [
      "opacity",
      "scaleX",
      "scaleY",
      "translateX",
      "translateY",
    ] as const) {
      expect(end[key]).toBeCloseTo(start[key])
    }
    expect(end.rotation % 360).toBeCloseTo(start.rotation % 360)
    for (const phase of [0, 0.1, 0.25, 0.5, 0.75, 0.99, 1]) {
      const state = getSpinnerFrame(motion, phase)
      expect(Object.values(state).every(Number.isFinite)).toBe(true)
      expect(state.opacity).toBeGreaterThanOrEqual(0)
      expect(state.opacity).toBeLessThanOrEqual(1)
    }
  }
)

it("shares its stylesheet when several spinners render together", () => {
  const markup = render(
    <div>
      <Spinner variant="wave" />
      <Spinner variant="flip" />
    </div>
  )
  expect(markup.match(/@keyframes fabricator-spinner-ring\s*\{/g)).toHaveLength(
    1
  )
})

it("adds ten layouts while preserving every stored native default", () => {
  expect(SPINNER_VALUES.slice(0, 12)).toEqual([
    "orbit",
    "ripple",
    "cascade",
    "wave",
    "pulse",
    "braid",
    "ring",
    "comet",
    "bounce",
    "equalizer",
    "flip",
    "scan",
  ])
  expect(SPINNER_VALUES).toHaveLength(22)
  expect(SPINNER_VALUES.slice(12)).toEqual([
    "quad-swap",
    "quad-fold",
    "tic-tac",
    "bloom",
    "checker",
    "diagonal",
    "triangle",
    "square",
    "rings",
    "hex",
  ])
})

it.each([
  ["quad-swap", 2],
  ["quad-fold", 2],
  ["tic-tac", 3],
  ["bloom", 3],
  ["checker", 4],
  ["diagonal", 4],
] as const)("%s has a square grid of size %s", (variant, size) => {
  const dots = getSpinnerDots(variant)
  expect(dots).toHaveLength(size * size)
  expect(new Set(dots.map(({ x }) => x)).size).toBe(size)
  expect(new Set(dots.map(({ y }) => y)).size).toBe(size)
})

it("uses triangular and hexagonal silhouettes with matching polygon particles", () => {
  const triangle = getSpinnerDots("triangle")
  expect(triangle).toHaveLength(10)
  const rows = [...new Set(triangle.map(({ y }) => y))].sort((a, b) => a - b)
  expect(
    rows.map((row) => triangle.filter(({ y }) => y === row).length)
  ).toEqual([1, 2, 3, 4])
  expect(triangle.every(({ shape }) => shape === "triangle")).toBe(true)
  const hex = getSpinnerDots("hex")
  expect(hex).toHaveLength(19)
  const hexRows = [...new Set(hex.map(({ y }) => y))].sort((a, b) => a - b)
  expect(hexRows.map((row) => hex.filter(({ y }) => y === row).length)).toEqual(
    [3, 4, 5, 4, 3]
  )
  expect(hex.every(({ shape }) => shape === "hexagon")).toBe(true)
  expect(
    render(<Spinner variant="triangle" />).match(/<polygon /g)
  ).toHaveLength(10)
  expect(render(<Spinner variant="hex" />).match(/<polygon /g)).toHaveLength(19)
})

it("draws a hollow square and two true concentric circles", () => {
  const square = getSpinnerDots("square")
  expect(square).toHaveLength(12)
  expect(
    square.every(
      ({ x, y }) => x === 4.5 || x === 19.5 || y === 4.5 || y === 19.5
    )
  ).toBe(true)
  const circles = getSpinnerDots("rings")
  expect(circles).toHaveLength(18)
  expect(
    new Set(circles.map(({ x, y }) => Math.hypot(x - 12, y - 12).toFixed(2)))
  ).toEqual(new Set(["4.00", "8.00"]))
})

it("alternates the two checkerboard groups instead of pulsing them together", () => {
  const motion = getSpinnerMotion("checker")
  expect(getSpinnerFrame(motion, 0).scaleX).toBeGreaterThan(
    getSpinnerFrame(motion, 0.5).scaleX * 3
  )
  expect(new Set(getSpinnerDots("checker").map(({ phase }) => phase))).toEqual(
    new Set([0, 0.5])
  )
})
