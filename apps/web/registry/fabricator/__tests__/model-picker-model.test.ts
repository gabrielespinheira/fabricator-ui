import { describe, expect, it } from "vitest"

import {
  getEffortIndexAtPoint,
  getEffortOffset,
  getEffortState,
} from "@/registry/fabricator/shared/lib/model-picker-model"

describe("getEffortState", () => {
  it("rests in the middle, unchosen, without a value", () => {
    expect(
      getEffortState({ count: 4, chosenIndex: -1, preview: null })
    ).toEqual({ index: 1, isChosen: false, isPeak: false })
    expect(
      getEffortState({ count: 5, chosenIndex: -1, preview: null })
    ).toEqual({ index: 2, isChosen: false, isPeak: false })
  })

  it("shows the chosen level, peaking at the top one", () => {
    expect(getEffortState({ count: 4, chosenIndex: 2, preview: null })).toEqual(
      {
        index: 2,
        isChosen: true,
        isPeak: false,
      }
    )
    expect(getEffortState({ count: 4, chosenIndex: 3, preview: null })).toEqual(
      {
        index: 3,
        isChosen: true,
        isPeak: true,
      }
    )
  })

  it("follows a drag's preview over the chosen level", () => {
    expect(getEffortState({ count: 4, chosenIndex: -1, preview: 3 })).toEqual({
      index: 3,
      isChosen: true,
      isPeak: true,
    })
    expect(getEffortState({ count: 4, chosenIndex: 3, preview: 0 })).toEqual({
      index: 0,
      isChosen: true,
      isPeak: false,
    })
  })

  it("never peaks with a single level", () => {
    expect(getEffortState({ count: 1, chosenIndex: 0, preview: null })).toEqual(
      {
        index: 0,
        isChosen: true,
        isPeak: false,
      }
    )
  })
})

describe("getEffortOffset", () => {
  // The same 124pt track with a 24pt thumb as getEffortIndexAtPoint's tests.
  const track = { width: 124, thumb: 24, count: 3 }

  it("keeps the thumb inside the track's ends", () => {
    expect(getEffortOffset({ ...track, index: 0 })).toBe(0)
    expect(getEffortOffset({ ...track, index: 1 })).toBe(50)
    expect(getEffortOffset({ ...track, index: 2 })).toBe(100)
  })

  it("places a level's centre where a press picks it", () => {
    for (const index of [0, 1, 2]) {
      const centre = getEffortOffset({ ...track, index }) + track.thumb / 2
      expect(getEffortIndexAtPoint({ ...track, left: 0, x: centre })).toBe(
        index
      )
    }
  })

  it("takes a fractional index, for a thumb between levels", () => {
    expect(getEffortOffset({ ...track, index: 0.5 })).toBe(25)
  })

  it("stays at the start before the track is measured", () => {
    expect(getEffortOffset({ ...track, width: 0, index: 2 })).toBe(0)
    expect(getEffortOffset({ width: 124, thumb: 24, count: 1, index: 0 })).toBe(
      0
    )
  })
})
