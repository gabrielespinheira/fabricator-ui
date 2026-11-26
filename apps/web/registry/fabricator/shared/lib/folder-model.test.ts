import { describe, expect, it } from "vitest"

import {
  FOLDER_FRONT_PATH,
  FOLDER_FRONT_VIEW_BOX,
  FOLDER_MAX_FILES,
  getFolderColorVariables,
  getFolderFileCount,
  getFolderFilePose,
  getFolderTone,
} from "./folder-model"

describe("getFolderFileCount", () => {
  it("shows up to three files", () => {
    expect(getFolderFileCount(0)).toBe(0)
    expect(getFolderFileCount(2)).toBe(2)
    expect(getFolderFileCount(3)).toBe(FOLDER_MAX_FILES)
    expect(getFolderFileCount(12)).toBe(FOLDER_MAX_FILES)
  })

  it("reads a negative or fractional count as whole files", () => {
    expect(getFolderFileCount(-1)).toBe(0)
    expect(getFolderFileCount(1.6)).toBe(1)
  })
})

describe("getFolderFilePose", () => {
  it("centres a single file and lifts it straight up when open", () => {
    const pose = getFolderFilePose(0, 1)
    expect(pose.rest).toEqual({ x: 0, y: 0, rotate: 0 })
    expect(pose.open.x).toBe(0)
    expect(pose.open.rotate).toBe(0)
    expect(pose.open.y).toBeLessThan(0)
  })

  it("spreads files left to right, mirrored around the middle", () => {
    const [left, middle, right] = [0, 1, 2].map((index) =>
      getFolderFilePose(index, 3)
    )
    expect(left.rest.x).toBeLessThan(0)
    expect(middle.rest.x).toBe(0)
    expect(right.rest.x).toBe(-left.rest.x)
    expect(right.open.rotate).toBe(-left.open.rotate)
  })

  it("fans wider and tilts further open than at rest", () => {
    const left = getFolderFilePose(0, 3)
    expect(Math.abs(left.open.x)).toBeGreaterThan(Math.abs(left.rest.x))
    expect(Math.abs(left.open.rotate)).toBeGreaterThan(
      Math.abs(left.rest.rotate)
    )
  })

  it("lifts every file when open", () => {
    for (const count of [1, 2, 3]) {
      for (let index = 0; index < count; index++) {
        const pose = getFolderFilePose(index, count)
        expect(pose.open.y).toBeLessThan(pose.rest.y)
      }
    }
  })

  it("steps the files behind the first one down at rest", () => {
    const [first, second, third] = [0, 1, 2].map(
      (index) => getFolderFilePose(index, 3).rest.y
    )
    expect(first).toBe(0)
    expect(second).toBeGreaterThan(first)
    expect(third).toBeGreaterThan(second)
  })

  it("stacks the first file on top", () => {
    const layers = [0, 1, 2].map((index) => getFolderFilePose(index, 3).layer)
    expect(layers).toEqual([3, 2, 1])
  })

  it("lays files past the limit out as the last shown file", () => {
    expect(getFolderFilePose(5, 8)).toEqual(getFolderFilePose(2, 3))
  })
})

describe("the front panel", () => {
  it("is one closed path inside its view box", () => {
    const [, , width, height] = FOLDER_FRONT_VIEW_BOX.split(" ").map(Number)
    expect(FOLDER_FRONT_PATH.startsWith("M")).toBe(true)
    expect(FOLDER_FRONT_PATH.trim().endsWith("Z")).toBe(true)
    const numbers = FOLDER_FRONT_PATH.match(/-?\d+(?:\.\d+)?/g)?.map(Number)
    expect(numbers?.every((n) => n >= 0 && n <= Math.max(width, height))).toBe(
      true
    )
  })
})

describe("getFolderColorVariables", () => {
  it("leaves a neutral folder to the style map", () => {
    expect(getFolderColorVariables(undefined)).toBeUndefined()
  })

  it("tints a role folder with the role and inks it with the role's text", () => {
    expect(getFolderColorVariables("primary")).toEqual({
      "--folder-mark-light": "var(--primary)",
      "--folder-mark-dark": "var(--primary)",
      "--folder-ink-light": "var(--primary-text)",
      "--folder-ink-dark": "var(--primary-text)",
    })
  })

  it("draws a palette colour with its mark and text for each scheme", () => {
    const variables = getFolderColorVariables("blue")
    expect(variables?.["--folder-mark-light"]).toMatch(/^oklch\(0\.6 /)
    expect(variables?.["--folder-mark-dark"]).toMatch(/^oklch\(0\.74 /)
    expect(variables?.["--folder-ink-light"]).not.toBe(
      variables?.["--folder-ink-dark"]
    )
  })

  it("mixes ink for any other CSS colour from it and the text colour", () => {
    expect(getFolderColorVariables("#ff0000")).toEqual({
      "--folder-mark-light": "#ff0000",
      "--folder-mark-dark": "#ff0000",
      "--folder-ink-light":
        "color-mix(in oklab, #ff0000 55%, var(--foreground))",
      "--folder-ink-dark":
        "color-mix(in oklab, #ff0000 55%, var(--foreground))",
    })
  })
})

describe("getFolderTone", () => {
  it("reads gray as the neutral folder", () => {
    expect(getFolderTone("gray", "dark")).toEqual({
      mark: "var(--muted-foreground)",
      ink: "var(--foreground)",
    })
  })

  it("leaves the ink of an unknown colour to the renderer", () => {
    expect(getFolderTone("#123456", "light")).toEqual({ mark: "#123456" })
  })
})
