import { describe, expect, it } from "vitest"

import {
  getTextMotionDuration,
  getTextMotionEffects,
  getTextMotionOrder,
  getTextMotionProgress,
  getTextMotionScramble,
  getTextMotionSpan,
  getTextMotionStagger,
  getTextMotionStarts,
  splitTextMotion,
} from "./text-motion-model"

describe("splitTextMotion", () => {
  it("splits words at whitespace and keeps punctuation with them", () => {
    const split = splitTextMotion("Ship it,  today!", "word")
    expect(split.count).toBe(3)
    expect(split.lines[0].words.map((word) => word.text)).toEqual([
      "Ship",
      "it,",
      "today!",
    ])
    expect(split.lines[0].words.map((word) => word.index)).toEqual([0, 1, 2])
  })

  it("counts characters across words and keeps graphemes whole", () => {
    const split = splitTextMotion("Hé 👩🏽‍💻!", "character")
    const characters = split.lines[0].words.flatMap((word) => word.characters)
    expect(characters.map((character) => character.text)).toEqual([
      "H",
      "é",
      "👩🏽‍💻",
      "!",
    ])
    expect(characters.map((character) => character.index)).toEqual([0, 1, 2, 3])
    expect(split.count).toBe(4)
  })

  it("splits lines at line breaks and numbers each level across lines", () => {
    const split = splitTextMotion("One two\nthree", "line")
    expect(split.count).toBe(2)
    expect(split.lines.map((line) => line.text)).toEqual(["One two", "three"])
    expect(split.lines[1].words[0].index).toBe(2)
    expect(split.lines[1].words[0].characters[0].index).toBe(6)
  })

  it("keeps an empty line without pieces", () => {
    const split = splitTextMotion("Top\n\nBottom", "word")
    expect(split.lines.map((line) => line.words.length)).toEqual([1, 0, 1])
    expect(split.count).toBe(2)
  })

  it("treats the whole text as one piece", () => {
    expect(splitTextMotion("All at once", "text").count).toBe(1)
  })

  it("has no pieces for an empty text", () => {
    expect(splitTextMotion("", "character").count).toBe(0)
    expect(splitTextMotion("", "text").count).toBe(0)
  })
})

describe("getTextMotionOrder", () => {
  it("plays from the start or the end", () => {
    expect(getTextMotionOrder(4, "start", "")).toEqual([0, 1, 2, 3])
    expect(getTextMotionOrder(4, "end", "")).toEqual([3, 2, 1, 0])
  })

  it("plays outward from the centre, pairs together", () => {
    expect(getTextMotionOrder(5, "center", "")).toEqual([2, 1, 0, 1, 2])
    expect(getTextMotionOrder(4, "center", "")).toEqual([1, 0, 0, 1])
  })

  it("plays inward from the edges", () => {
    expect(getTextMotionOrder(5, "edges", "")).toEqual([0, 1, 2, 1, 0])
  })

  it("shuffles the same way for the same text", () => {
    const order = getTextMotionOrder(8, "random", "Fabricator")
    expect(getTextMotionOrder(8, "random", "Fabricator")).toEqual(order)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(order).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})

describe("getTextMotionStagger", () => {
  it("staggers smaller pieces closer together", () => {
    const character = getTextMotionStagger("character", false)
    const word = getTextMotionStagger("word", false)
    const line = getTextMotionStagger("line", false)
    expect(character).toBeLessThan(word)
    expect(word).toBeLessThan(line)
    expect(getTextMotionStagger("text", false)).toBe(0)
  })

  it("types at a reading cadence", () => {
    expect(getTextMotionStagger("character", true)).toBeGreaterThan(
      getTextMotionStagger("character", false)
    )
  })
})

describe("getTextMotionSpan", () => {
  it("lasts one piece plus a stagger per later step", () => {
    expect(getTextMotionSpan(5, 0.1, false)).toBeCloseTo(1.4)
    expect(getTextMotionSpan(1, 0.1, false)).toBe(1)
  })

  it("types for one stagger per step, with no piece duration", () => {
    expect(getTextMotionSpan(10, 0.08, true)).toBeCloseTo(0.8)
  })

  it("takes no time without pieces", () => {
    expect(getTextMotionSpan(0, 0.1, false)).toBe(0)
  })
})

describe("getTextMotionStarts", () => {
  it("starts each one as the one before it is nearly in", () => {
    const starts = getTextMotionStarts([1.4, 1, 2])
    expect(starts[0]).toBe(0)
    expect(starts[1]).toBeCloseTo(1)
    expect(starts[2]).toBeCloseTo(1.6)
  })

  it("never starts one before the one before it", () => {
    expect(getTextMotionStarts([0.2, 1])).toEqual([0, 0])
  })
})

describe("getTextMotionEffects", () => {
  it("fades, blurs and rises by default", () => {
    expect(getTextMotionEffects(undefined)).toEqual(["fade", "blur", "rise"])
  })

  it("takes one effect or a list without repeats", () => {
    expect(getTextMotionEffects("mask")).toEqual(["mask"])
    expect(getTextMotionEffects(["fade", "scale", "fade"])).toEqual([
      "fade",
      "scale",
    ])
  })
})

describe("getTextMotionScramble", () => {
  it("keeps the text's shape while it scrambles", () => {
    const frame = getTextMotionScramble("Run 42, go", 0, 3)
    expect(frame).toHaveLength(10)
    expect(frame[3]).toBe(" ")
    expect(frame[6]).toBe(",")
    expect(frame[0]).toMatch(/[A-Z]/)
    expect(frame[1]).toMatch(/[a-z]/)
    expect(frame[4]).toMatch(/[0-9]/)
  })

  it("settles from the start as it progresses", () => {
    const frame = getTextMotionScramble("abcd", 0.5, 7)
    expect(frame.slice(0, 2)).toBe("ab")
    expect(getTextMotionScramble("abcd", 1, 7)).toBe("abcd")
  })

  it("draws the same glyphs for the same frame", () => {
    expect(getTextMotionScramble("Fabricator", 0.2, 4)).toBe(
      getTextMotionScramble("Fabricator", 0.2, 4)
    )
    expect(getTextMotionScramble("Fabricator", 0.2, 4)).not.toBe(
      getTextMotionScramble("Fabricator", 0.2, 5)
    )
  })
})

describe("getTextMotionDuration", () => {
  it("reads milliseconds and seconds and applies the motion scale", () => {
    expect(getTextMotionDuration("700ms", "1")).toBe(700)
    expect(getTextMotionDuration(".7s", "")).toBe(700)
    expect(getTextMotionDuration("700ms", "0.5")).toBe(350)
    expect(getTextMotionDuration("700ms", "0")).toBe(0)
  })

  it("is zero without a token", () => {
    expect(getTextMotionDuration("", "1")).toBe(0)
  })
})

describe("getTextMotionProgress", () => {
  it("runs from 0 to 1 across a piece's own window", () => {
    expect(getTextMotionProgress(50, 100, 200)).toBe(0)
    expect(getTextMotionProgress(200, 100, 200)).toBe(0.5)
    expect(getTextMotionProgress(400, 100, 200)).toBe(1)
  })

  it("is done at once with no duration", () => {
    expect(getTextMotionProgress(100, 100, 0)).toBe(1)
  })
})
