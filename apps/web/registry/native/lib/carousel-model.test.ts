import { describe, expect, it } from "vitest"

import {
  canGoNext,
  canGoPrevious,
  getMaxScroll,
  getNearestSnap,
  getNextIndex,
  getPreviousIndex,
  getReleaseIndex,
  getScrollSnaps,
  getSlidesInView,
} from "@/registry/native/lib/carousel-model"

// Five slides, each as wide as a 300pt viewport.
const pages = {
  offsets: [0, 300, 600, 900, 1200],
  sizes: [300, 300, 300, 300, 300],
  viewport: 300,
}

// Five slides, half the viewport each.
const halves = {
  offsets: [0, 150, 300, 450, 600],
  sizes: [150, 150, 150, 150, 150],
  viewport: 300,
}

describe("getMaxScroll", () => {
  it("is how far the content runs past the viewport", () => {
    expect(getMaxScroll(pages)).toBe(1200)
    expect(getMaxScroll(halves)).toBe(450)
  })

  it("is zero when everything fits", () => {
    expect(
      getMaxScroll({ offsets: [0, 50], sizes: [50, 50], viewport: 300 })
    ).toBe(0)
  })
})

describe("getScrollSnaps", () => {
  it("gives a page per slide", () => {
    expect(getScrollSnaps(pages)).toEqual([0, 300, 600, 900, 1200])
  })

  it("aligns to the start", () => {
    expect(getScrollSnaps(halves, { align: "start" })).toEqual([
      0, 150, 300, 450,
    ])
  })

  it("centres by default, trimming snaps past the edges", () => {
    expect(getScrollSnaps(halves)).toEqual([0, 75, 225, 375, 450])
  })

  it("aligns to the end", () => {
    expect(getScrollSnaps(halves, { align: "end" })).toEqual([0, 150, 300, 450])
  })

  it("keeps snaps past the edges with containScroll off", () => {
    expect(
      getScrollSnaps(halves, { align: "center", containScroll: false })
    ).toEqual([-75, 75, 225, 375, 525])
  })

  it("moves several slides at a time", () => {
    expect(getScrollSnaps(pages, { slidesToScroll: 2 })).toEqual([0, 600, 1200])
  })

  it("has one snap when everything fits", () => {
    expect(
      getScrollSnaps({ offsets: [0, 50], sizes: [50, 50], viewport: 300 })
    ).toEqual([0])
  })
})

describe("getNearestSnap", () => {
  it("finds the closest", () => {
    expect(getNearestSnap([0, 300, 600], 140)).toBe(0)
    expect(getNearestSnap([0, 300, 600], 160)).toBe(1)
    expect(getNearestSnap([0, 300, 600], 900)).toBe(2)
  })
})

describe("getReleaseIndex", () => {
  const snaps = [0, 300, 600]

  it("stays on a small drag", () => {
    expect(
      getReleaseIndex({ snaps, index: 1, position: 320, velocity: 0 })
    ).toBe(1)
  })

  it("moves one on a long drag or a flick", () => {
    expect(
      getReleaseIndex({ snaps, index: 1, position: 480, velocity: 0 })
    ).toBe(2)
    expect(
      getReleaseIndex({ snaps, index: 1, position: 310, velocity: 800 })
    ).toBe(2)
    expect(
      getReleaseIndex({ snaps, index: 1, position: 290, velocity: -800 })
    ).toBe(0)
  })

  it("stops at the ends without a loop", () => {
    expect(
      getReleaseIndex({ snaps, index: 2, position: 700, velocity: 800 })
    ).toBe(2)
    expect(
      getReleaseIndex({ snaps, index: 0, position: -60, velocity: -800 })
    ).toBe(0)
  })

  it("wraps at the ends with a loop", () => {
    expect(
      getReleaseIndex({
        snaps,
        index: 2,
        position: 700,
        velocity: 800,
        loop: true,
      })
    ).toBe(0)
    expect(
      getReleaseIndex({
        snaps,
        index: 0,
        position: -60,
        velocity: -800,
        loop: true,
      })
    ).toBe(2)
  })

  it("lands on the nearest with skipSnaps", () => {
    expect(
      getReleaseIndex({
        snaps,
        index: 0,
        position: 590,
        velocity: 0,
        skipSnaps: true,
      })
    ).toBe(2)
  })
})

describe("navigation", () => {
  it("knows the ends", () => {
    expect(canGoNext(0, 3)).toBe(true)
    expect(canGoNext(2, 3)).toBe(false)
    expect(canGoPrevious(0, 3)).toBe(false)
    expect(canGoPrevious(2, 3)).toBe(true)
  })

  it("always can with a loop, given somewhere to go", () => {
    expect(canGoNext(2, 3, true)).toBe(true)
    expect(canGoPrevious(0, 3, true)).toBe(true)
    expect(canGoNext(0, 1, true)).toBe(false)
  })

  it("steps and wraps", () => {
    expect(getNextIndex(0, 3)).toBe(1)
    expect(getNextIndex(2, 3)).toBe(2)
    expect(getNextIndex(2, 3, true)).toBe(0)
    expect(getPreviousIndex(1, 3)).toBe(0)
    expect(getPreviousIndex(0, 3)).toBe(0)
    expect(getPreviousIndex(0, 3, true)).toBe(2)
  })
})

describe("getSlidesInView", () => {
  it("lists the slides the viewport shows", () => {
    expect(getSlidesInView(halves, 0)).toEqual([0, 1])
    expect(getSlidesInView(halves, 75)).toEqual([0, 1, 2])
  })
})
