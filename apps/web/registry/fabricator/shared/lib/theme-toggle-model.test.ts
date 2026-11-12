import { describe, expect, it } from "vitest"

import {
  getThemeToggleDuration,
  getThemeToggleFrames,
  getThemeToggleMask,
  getThemeToggleOrigin,
  getThemeToggleReveal,
  getThemeToggleShape,
  THEME_TOGGLE_STARTS,
  THEME_TOGGLE_VARIANTS,
} from "./theme-toggle-model"

describe("theme reveals", () => {
  it("keeps all reference variants and origins", () => {
    expect(THEME_TOGGLE_VARIANTS).toEqual([
      "rectangle",
      "circle",
      "circle-blur",
      "blinds",
      "square",
      "diamond",
      "hexagon",
      "triangle",
    ])
    expect(THEME_TOGGLE_STARTS).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "center",
      "bottom-up",
      "trigger",
    ])
  })

  it("positions reveals at each named origin", () => {
    expect(
      THEME_TOGGLE_STARTS.map((start) => getThemeToggleOrigin(start, 400, 800))
    ).toEqual([
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 0, y: 800 },
      { x: 400, y: 800 },
      { x: 200, y: 400 },
      { x: 200, y: 800 },
      { x: 200, y: 400 },
    ])
  })

  it.each(THEME_TOGGLE_STARTS)(
    "circles from %s reach every viewport corner",
    (start) => {
      const origin = getThemeToggleOrigin(start, 400, 800)
      const reveal = getThemeToggleReveal("circle", start, 400, 800)
      const radius = Number.parseFloat(reveal.to.slice(7))
      for (const x of [0, 400])
        for (const y of [0, 800]) {
          expect(radius).toBeGreaterThanOrEqual(
            Math.hypot(x - origin.x, y - origin.y)
          )
        }
      expect(reveal.from).toContain("circle(0px")
    }
  )

  it("expands rectangles in the selected direction and fully closes blinds", () => {
    expect(getThemeToggleReveal("rectangle", "bottom-up", 400, 800)).toEqual({
      from: "inset(100% 0% 0% 0%)",
      to: "inset(0% 0% 0% 0%)",
      hasBlur: false,
    })
    expect(getThemeToggleReveal("rectangle", "center", 400, 800).from).toBe(
      "inset(50% 50% 50% 50%)"
    )
    const blinds = getThemeToggleReveal("blinds", "top-left", 400, 800)
    expect(blinds.from.match(/M/g)).toHaveLength(12)
    expect(blinds.to).toContain("L400 800")
    expect(blinds.to).not.toMatch(/NaN|Infinity/)
  })

  it("adds page blur only to circle-blur", () => {
    expect(
      THEME_TOGGLE_VARIANTS.map(
        (variant) => getThemeToggleReveal(variant, "center", 400, 800).hasBlur
      )
    ).toEqual([false, false, true, false, false, false, false, false])
  })
})

it.each([
  { left: 12, top: 12, width: 36, height: 36 },
  { left: 352, top: 12, width: 36, height: 36 },
  { left: 12, top: 752, width: 36, height: 36 },
  { left: 352, top: 752, width: 36, height: 36 },
  { left: 182, top: 382, width: 36, height: 36 },
])("reveals from the actual trigger at $left,$top", (trigger) => {
  const origin = getThemeToggleOrigin("trigger", 400, 800, trigger)
  expect(origin).toEqual({ x: trigger.left + 18, y: trigger.top + 18 })
  const reveal = getThemeToggleReveal(
    "circle-blur",
    "trigger",
    400,
    800,
    trigger
  )
  expect(reveal.from).toBe(
    `circle(0% at ${(origin.x / 400) * 100}% ${(origin.y / 800) * 100}%)`
  )
  expect(reveal.to).toBe(
    `circle(150% at ${(origin.x / 400) * 100}% ${(origin.y / 800) * 100}%)`
  )
  const radius = (Math.hypot(400, 800) / Math.SQRT2) * 1.5
  for (const x of [0, 400])
    for (const y of [0, 800]) {
      expect(radius).toBeGreaterThanOrEqual(
        Math.hypot(x - origin.x, y - origin.y)
      )
    }
})

it("starts rectangles at the pressed button and keeps viewport starts opt-in", () => {
  const trigger = { left: 82, top: 182, width: 36, height: 36 }
  expect(
    getThemeToggleReveal("rectangle", "trigger", 400, 800, trigger).from
  ).toBe("inset(200px 300px 600px 100px)")
  expect(getThemeToggleOrigin("top-right", 400, 800, trigger)).toEqual({
    x: 400,
    y: 0,
  })
  expect(getThemeToggleOrigin("trigger", 400, 800)).toEqual({ x: 200, y: 400 })
})

it.each([
  ["700ms", 1, 700],
  ["0.7s", 1, 700],
  [" 0.25s ", 2, 500],
  ["250ms", 0, 0],
])(
  "converts the browser's CSS duration %s to milliseconds",
  (value, scale, expected) => {
    expect(getThemeToggleDuration(value, scale)).toBe(expected)
  }
)

const SHAPES = [
  "square",
  "diamond",
  "rectangle",
  "hexagon",
  "triangle",
] as const
const TRIGGERS = [
  { left: 12, top: 12, width: 36, height: 36 },
  { left: 352, top: 12, width: 36, height: 36 },
  { left: 12, top: 752, width: 36, height: 36 },
  { left: 352, top: 752, width: 36, height: 36 },
  { left: 182, top: 382, width: 36, height: 36 },
]

it.each(SHAPES)(
  "%s covers every viewport corner with room for its fade",
  (variant) => {
    for (const trigger of TRIGGERS) {
      const shape = getThemeToggleShape(variant, "trigger", 400, 800, trigger)
      expect(shape?.kind).toBe("polygon")
      if (shape?.kind !== "polygon") throw new Error("Expected a polygon")
      expect(shape.origin).toEqual({
        x: trigger.left + 18,
        y: trigger.top + 18,
      })
      for (const point of [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
        { x: 400, y: 800 },
        { x: 0, y: 800 },
      ]) {
        shape.vertices.forEach((vertex, index) => {
          const next = shape.vertices[(index + 1) % shape.vertices.length]
          const edgeX = next.x - vertex.x
          const edgeY = next.y - vertex.y
          const distance =
            (edgeX * (point.y - vertex.y) - edgeY * (point.x - vertex.x)) /
            Math.hypot(edgeX, edgeY)
          expect(distance).toBeGreaterThanOrEqual(shape.feather - 0.001)
        })
      }
    }
  }
)

it("keeps square, diamond, triangle, hexagon and rectangle silhouettes distinct", () => {
  const shapes = SHAPES.map((variant) =>
    getThemeToggleShape(variant, "center", 800, 400)
  )
  expect(
    shapes.map((shape) =>
      shape?.kind === "polygon" ? shape.vertices.length : 0
    )
  ).toEqual([4, 4, 4, 6, 3])
  expect(new Set(shapes.map((shape) => JSON.stringify(shape))).size).toBe(5)
  for (const [variant, ratio] of [
    ["square", 1],
    ["rectangle", 2],
  ] as const) {
    const shape = getThemeToggleShape(variant, "center", 800, 400)
    if (shape?.kind !== "polygon") throw new Error("Expected a polygon")
    const width =
      Math.max(...shape.vertices.map((point) => point.x)) -
      Math.min(...shape.vertices.map((point) => point.x))
    const height =
      Math.max(...shape.vertices.map((point) => point.y)) -
      Math.min(...shape.vertices.map((point) => point.y))
    expect(width / height).toBeCloseTo(ratio)
  }
})

it.each(SHAPES)(
  "%s fades its edge without blurring page content",
  (variant) => {
    const mask = getThemeToggleMask(variant, "trigger", 800, 600, {
      left: 60,
      top: 80,
      width: 40,
      height: 40,
    })
    expect(mask?.image).toContain("gradient(")
    expect(mask?.image).toContain("--fabricator-theme-progress")
    expect(mask?.shape.feather).toBeGreaterThan(0)
    expect(
      getThemeToggleFrames(variant, "trigger", 800, 600).every(
        (frame) => !("filter" in frame)
      )
    ).toBe(true)
  }
)

it("offers a crisp circle and keeps blinds as a separate reveal", () => {
  expect(getThemeToggleMask("circle", "center", 800, 600)?.shape.feather).toBe(
    0
  )
  expect(getThemeToggleMask("blinds", "center", 800, 600)).toBeNull()
})

it("matches beUI's full-reveal blur without an opacity fade or feather mask", () => {
  expect(getThemeToggleFrames("circle-blur", "bottom-up", 1280, 900)).toEqual([
    { clipPath: "circle(0% at 50% 100%)", filter: "blur(8px)" },
    { clipPath: "circle(150% at 50% 100%)", filter: "blur(0px)" },
  ])
  expect(getThemeToggleMask("circle-blur", "center", 1280, 900)).toBeNull()
})
