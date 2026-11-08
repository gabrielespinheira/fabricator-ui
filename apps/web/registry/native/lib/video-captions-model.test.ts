import { describe, expect, it } from "vitest"

import {
  getVideoCaptionText,
  parseVideoCaptions,
  parseVideoCaptionTime,
} from "@/registry/native/lib/video-captions-model"

const VTT = `WEBVTT
Kind: captions

NOTE A comment the player skips

intro
00:11.720 --> 00:14.600 align:center line:90%
What brings you to the land
of the <i>gatekeepers</i>?

00:00:18.160 --> 00:00:20.300
<v Sintel>I'm searching for someone.

01:00:00.000 --> 01:00:01.500
An hour in.
`

describe("parseVideoCaptionTime", () => {
  it("reads minutes and seconds, with or without hours", () => {
    expect(parseVideoCaptionTime("00:11.720")).toBe(11.72)
    expect(parseVideoCaptionTime("01:02:03.500")).toBe(3723.5)
  })

  it("is null for anything else", () => {
    expect(parseVideoCaptionTime("11.720")).toBeNull()
    expect(parseVideoCaptionTime("soon")).toBeNull()
  })
})

describe("parseVideoCaptions", () => {
  it("reads each cue's times and text, without its tags or settings", () => {
    expect(parseVideoCaptions(VTT)).toEqual([
      {
        start: 11.72,
        end: 14.6,
        text: "What brings you to the land\nof the gatekeepers?",
      },
      { start: 18.16, end: 20.3, text: "I'm searching for someone." },
      { start: 3600, end: 3601.5, text: "An hour in." },
    ])
  })

  it("reads Windows line endings", () => {
    expect(
      parseVideoCaptions("WEBVTT\r\n\r\n00:01.000 --> 00:02.000\r\nHi\r\n")
    ).toEqual([{ start: 1, end: 2, text: "Hi" }])
  })

  it("reads nothing from a file that isn't WebVTT", () => {
    expect(parseVideoCaptions("<html>Not found</html>")).toEqual([])
  })
})

describe("getVideoCaptionText", () => {
  const cues = parseVideoCaptions(VTT)

  it("is the text of every cue showing at the time", () => {
    expect(getVideoCaptionText(cues, 12)).toBe(
      "What brings you to the land\nof the gatekeepers?"
    )
    expect(getVideoCaptionText(cues, 18.16)).toBe("I'm searching for someone.")
  })

  it("is empty between cues and once one ends", () => {
    expect(getVideoCaptionText(cues, 16)).toBe("")
    expect(getVideoCaptionText(cues, 20.3)).toBe("")
  })

  it("joins cues that overlap", () => {
    expect(
      getVideoCaptionText(
        [
          { start: 0, end: 5, text: "One" },
          { start: 2, end: 6, text: "Two" },
        ],
        3
      )
    ).toBe("One\nTwo")
  })
})
