import { describe, expect, it } from "vitest"

import {
  clampVideoTime,
  formatVideoRate,
  formatVideoTime,
  formatVideoTimeSpoken,
  formatVideoVolume,
  getVideoBufferedEnd,
  getVideoChapterIndex,
  getVideoChapterMask,
  getVideoChapterSegments,
  getVideoFractionAtPoint,
  getVideoPlayerKeyAction,
  getVideoPlayerStatus,
  getVideoRateStep,
  getVideoSeekKeyTime,
  getVideoSeekText,
  getVideoVolumeKeyValue,
  getVideoVolumeLevel,
  getVideoVolumeStep,
  isVideoControlsVisible,
  toggleVideoCaptions,
  VIDEO_PLAYER_RATES,
} from "@/registry/fabricator/shared/lib/video-player-model"

const key = (
  value: string,
  modifiers: Partial<Record<string, boolean>> = {}
) => ({
  key: value,
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...modifiers,
})

describe("formatVideoTime", () => {
  it("writes minutes and two-digit seconds", () => {
    expect(formatVideoTime(0)).toBe("0:00")
    expect(formatVideoTime(5.9)).toBe("0:05")
    expect(formatVideoTime(65)).toBe("1:05")
    expect(formatVideoTime(600)).toBe("10:00")
  })

  it("adds hours from an hour on", () => {
    expect(formatVideoTime(3723)).toBe("1:02:03")
  })

  it("pads to the duration's hours so the width holds", () => {
    expect(formatVideoTime(65, 3723)).toBe("0:01:05")
  })

  it("reads a time it can't know as zero", () => {
    expect(formatVideoTime(Number.NaN)).toBe("0:00")
    expect(formatVideoTime(Number.POSITIVE_INFINITY)).toBe("0:00")
    expect(formatVideoTime(-4)).toBe("0:00")
  })
})

describe("formatVideoTimeSpoken", () => {
  it("spells each unit it needs, singular or plural", () => {
    expect(formatVideoTimeSpoken(0)).toBe("0 seconds")
    expect(formatVideoTimeSpoken(1)).toBe("1 second")
    expect(formatVideoTimeSpoken(65)).toBe("1 minute 5 seconds")
    expect(formatVideoTimeSpoken(7200)).toBe("2 hours")
    expect(formatVideoTimeSpoken(3661)).toBe("1 hour 1 minute 1 second")
  })
})

describe("getVideoSeekText", () => {
  it("says where the playhead is out of the whole", () => {
    expect(getVideoSeekText(65, 120)).toBe("1 minute 5 seconds of 2 minutes")
  })

  it("leaves the whole out while it's unknown", () => {
    expect(getVideoSeekText(5, Number.NaN)).toBe("5 seconds")
  })
})

describe("clampVideoTime", () => {
  it("keeps a time inside the video", () => {
    expect(clampVideoTime(-3, 60)).toBe(0)
    expect(clampVideoTime(70, 60)).toBe(60)
    expect(clampVideoTime(30, 60)).toBe(30)
  })

  it("only floors at zero while the duration is unknown", () => {
    expect(clampVideoTime(30, Number.NaN)).toBe(30)
    expect(clampVideoTime(-1, Number.NaN)).toBe(0)
  })
})

describe("getVideoPlayerKeyAction", () => {
  it("plays and pauses on Space and K", () => {
    expect(getVideoPlayerKeyAction(key(" "))).toEqual({ type: "toggle-play" })
    expect(getVideoPlayerKeyAction(key("k"))).toEqual({ type: "toggle-play" })
    expect(getVideoPlayerKeyAction(key("K", { shiftKey: true }))).toEqual({
      type: "toggle-play",
    })
  })

  it("steps 5 seconds with the arrows and 10 with J and L", () => {
    expect(getVideoPlayerKeyAction(key("ArrowLeft"))).toEqual({
      type: "seek-by",
      seconds: -5,
    })
    expect(getVideoPlayerKeyAction(key("ArrowRight"))).toEqual({
      type: "seek-by",
      seconds: 5,
    })
    expect(getVideoPlayerKeyAction(key("j"))).toEqual({
      type: "seek-by",
      seconds: -10,
    })
    expect(getVideoPlayerKeyAction(key("l"))).toEqual({
      type: "seek-by",
      seconds: 10,
    })
  })

  it("jumps to a tenth of the video with the digits, and to the ends", () => {
    expect(getVideoPlayerKeyAction(key("0"))).toEqual({
      type: "seek-to",
      fraction: 0,
    })
    expect(getVideoPlayerKeyAction(key("7"))).toEqual({
      type: "seek-to",
      fraction: 0.7,
    })
    expect(getVideoPlayerKeyAction(key("Home"))).toEqual({
      type: "seek-to",
      fraction: 0,
    })
    expect(getVideoPlayerKeyAction(key("End"))).toEqual({
      type: "seek-to",
      fraction: 1,
    })
  })

  it("sets the volume with Up and Down and mutes with M", () => {
    expect(getVideoPlayerKeyAction(key("ArrowUp"))).toEqual({
      type: "volume-by",
      delta: 0.05,
    })
    expect(getVideoPlayerKeyAction(key("ArrowDown"))).toEqual({
      type: "volume-by",
      delta: -0.05,
    })
    expect(getVideoPlayerKeyAction(key("m"))).toEqual({ type: "toggle-mute" })
  })

  it("toggles full screen with F and captions with C", () => {
    expect(getVideoPlayerKeyAction(key("f"))).toEqual({
      type: "toggle-fullscreen",
    })
    expect(getVideoPlayerKeyAction(key("c"))).toEqual({
      type: "toggle-captions",
    })
  })

  it("steps the speed with < and >", () => {
    expect(getVideoPlayerKeyAction(key(">", { shiftKey: true }))).toEqual({
      type: "rate-by",
      step: 1,
    })
    expect(getVideoPlayerKeyAction(key("<", { shiftKey: true }))).toEqual({
      type: "rate-by",
      step: -1,
    })
  })

  it("leaves shortcuts with Cmd, Ctrl or Alt to the browser", () => {
    expect(getVideoPlayerKeyAction(key("f", { metaKey: true }))).toBeNull()
    expect(
      getVideoPlayerKeyAction(key("ArrowLeft", { altKey: true }))
    ).toBeNull()
    expect(getVideoPlayerKeyAction(key("k", { ctrlKey: true }))).toBeNull()
  })

  it("ignores every other key", () => {
    expect(getVideoPlayerKeyAction(key("Tab"))).toBeNull()
    expect(getVideoPlayerKeyAction(key("x"))).toBeNull()
  })
})

describe("getVideoSeekKeyTime", () => {
  const at = { time: 30, duration: 200 }

  it("steps 5 seconds with Left and Right", () => {
    expect(getVideoSeekKeyTime("ArrowRight", at)).toBe(35)
    expect(getVideoSeekKeyTime("ArrowLeft", at)).toBe(25)
  })

  it("leaves Up and Down to the volume", () => {
    expect(getVideoSeekKeyTime("ArrowUp", at)).toBeNull()
    expect(getVideoSeekKeyTime("ArrowDown", at)).toBeNull()
  })

  it("steps a tenth of the video with Page Up and Page Down", () => {
    expect(getVideoSeekKeyTime("PageUp", at)).toBe(50)
    expect(getVideoSeekKeyTime("PageDown", at)).toBe(10)
  })

  it("goes to the ends with Home and End, and stays inside them", () => {
    expect(getVideoSeekKeyTime("Home", at)).toBe(0)
    expect(getVideoSeekKeyTime("End", at)).toBe(200)
    expect(getVideoSeekKeyTime("ArrowLeft", { time: 2, duration: 200 })).toBe(0)
  })

  it("returns null for any other key", () => {
    expect(getVideoSeekKeyTime("Enter", at)).toBeNull()
  })
})

describe("getVideoVolumeKeyValue", () => {
  it("steps 5% with the arrows and 20% with the page keys", () => {
    expect(getVideoVolumeKeyValue("ArrowUp", 0.5)).toBe(0.55)
    expect(getVideoVolumeKeyValue("ArrowLeft", 0.5)).toBe(0.45)
    expect(getVideoVolumeKeyValue("PageUp", 0.5)).toBe(0.7)
    expect(getVideoVolumeKeyValue("PageDown", 0.5)).toBe(0.3)
  })

  it("stays between silent and full", () => {
    expect(getVideoVolumeKeyValue("ArrowUp", 0.98)).toBe(1)
    expect(getVideoVolumeKeyValue("ArrowDown", 0.02)).toBe(0)
    expect(getVideoVolumeKeyValue("Home", 0.5)).toBe(0)
    expect(getVideoVolumeKeyValue("End", 0.5)).toBe(1)
  })

  it("returns null for any other key", () => {
    expect(getVideoVolumeKeyValue("Space", 0.5)).toBeNull()
  })
})

describe("getVideoVolumeStep", () => {
  it("steps from the volume you hear", () => {
    expect(
      getVideoVolumeStep({ volume: 0.5, isMuted: false, delta: 0.05 })
    ).toBe(0.55)
    expect(
      getVideoVolumeStep({ volume: 0.5, isMuted: false, delta: -0.05 })
    ).toBe(0.45)
  })

  it("counts a muted video as silent, so Up unmutes quietly and Down stays muted", () => {
    expect(
      getVideoVolumeStep({ volume: 0.8, isMuted: true, delta: 0.05 })
    ).toBe(0.05)
    expect(
      getVideoVolumeStep({ volume: 0.8, isMuted: true, delta: -0.05 })
    ).toBe(0)
  })

  it("stays between silent and full", () => {
    expect(
      getVideoVolumeStep({ volume: 0.98, isMuted: false, delta: 0.05 })
    ).toBe(1)
  })
})

describe("formatVideoVolume", () => {
  it("writes the volume you hear as a percentage, or Muted", () => {
    expect(formatVideoVolume(0.6, false)).toBe("60%")
    expect(formatVideoVolume(1, false)).toBe("100%")
    expect(formatVideoVolume(0.6, true)).toBe("Muted")
    expect(formatVideoVolume(0, false)).toBe("Muted")
  })
})

describe("getVideoFractionAtPoint", () => {
  it("reads a pointer across the track as 0 to 1", () => {
    expect(getVideoFractionAtPoint({ x: 150, left: 100, width: 200 })).toBe(
      0.25
    )
    expect(getVideoFractionAtPoint({ x: 50, left: 100, width: 200 })).toBe(0)
    expect(getVideoFractionAtPoint({ x: 400, left: 100, width: 200 })).toBe(1)
  })

  it("reads a track with no width as its start", () => {
    expect(getVideoFractionAtPoint({ x: 10, left: 0, width: 0 })).toBe(0)
  })
})

describe("getVideoBufferedEnd", () => {
  const ranges = [
    [0, 12],
    [40, 55],
  ] as const

  it("is the end of the loaded range the playhead is in", () => {
    expect(getVideoBufferedEnd(ranges, 5)).toBe(12)
    expect(getVideoBufferedEnd(ranges, 41)).toBe(55)
  })

  it("is the playhead itself outside every loaded range", () => {
    expect(getVideoBufferedEnd(ranges, 20)).toBe(20)
    expect(getVideoBufferedEnd([], 3)).toBe(3)
  })
})

describe("getVideoRateStep", () => {
  it("moves to the next speed in the list and stops at its ends", () => {
    expect(getVideoRateStep(VIDEO_PLAYER_RATES, 1, 1)).toBe(1.25)
    expect(getVideoRateStep(VIDEO_PLAYER_RATES, 1, -1)).toBe(0.75)
    expect(getVideoRateStep(VIDEO_PLAYER_RATES, 2, 1)).toBe(2)
    expect(getVideoRateStep(VIDEO_PLAYER_RATES, 0.25, -1)).toBe(0.25)
  })

  it("moves from a speed off the list to its neighbour", () => {
    expect(getVideoRateStep(VIDEO_PLAYER_RATES, 1.1, 1)).toBe(1.25)
    expect(getVideoRateStep(VIDEO_PLAYER_RATES, 1.1, -1)).toBe(1)
  })
})

describe("formatVideoRate", () => {
  it("names 1× Normal and writes the others with a times sign", () => {
    expect(formatVideoRate(1)).toBe("Normal")
    expect(formatVideoRate(1.5)).toBe("1.5×")
    expect(formatVideoRate(0.25)).toBe("0.25×")
  })
})

describe("chapters", () => {
  const chapters = [
    { start: 30, title: "Middle" },
    { start: 0, title: "Start" },
    { start: 80, title: "End" },
  ]

  it("finds the chapter the playhead is in, in any order", () => {
    expect(getVideoChapterIndex(chapters, 10)).toBe(1)
    expect(getVideoChapterIndex(chapters, 30)).toBe(0)
    expect(getVideoChapterIndex(chapters, 95)).toBe(2)
    expect(getVideoChapterIndex([], 10)).toBe(-1)
    expect(getVideoChapterIndex([{ start: 20, title: "Late" }], 10)).toBe(-1)
  })

  it("lays each chapter out as a share of the track", () => {
    expect(getVideoChapterSegments(chapters, 100)).toEqual([
      { start: 0, end: 30, title: "Start", offset: 0, width: 0.3 },
      { start: 30, end: 80, title: "Middle", offset: 0.3, width: 0.5 },
      { start: 80, end: 100, title: "End", offset: 0.8, width: 0.2 },
    ])
  })

  it("covers the start of the track before the first chapter", () => {
    expect(
      getVideoChapterSegments([{ start: 50, title: "Late" }], 100)
    ).toEqual([
      { start: 0, end: 50, title: "", offset: 0, width: 0.5 },
      { start: 50, end: 100, title: "Late", offset: 0.5, width: 0.5 },
    ])
  })

  it("drops chapters past the end, and lays nothing out before the duration is known", () => {
    expect(
      getVideoChapterSegments(
        [
          { start: 0, title: "Start" },
          { start: 120, title: "Gone" },
        ],
        100
      )
    ).toEqual([{ start: 0, end: 100, title: "Start", offset: 0, width: 1 }])
    expect(getVideoChapterSegments(chapters, Number.NaN)).toEqual([])
  })
})

describe("getVideoChapterMask", () => {
  it("cuts a gap into the track where each chapter starts", () => {
    expect(
      getVideoChapterMask([
        { start: 0, end: 30, title: "A", offset: 0, width: 0.3 },
        { start: 30, end: 100, title: "B", offset: 0.3, width: 0.7 },
      ])
    ).toBe(
      "linear-gradient(to right, #000 0, #000 calc(30% - 1px), transparent calc(30% - 1px), transparent calc(30% + 1px), #000 calc(30% + 1px), #000 100%)"
    )
  })

  it("is none for one chapter or none", () => {
    expect(
      getVideoChapterMask([
        { start: 0, end: 10, title: "A", offset: 0, width: 1 },
      ])
    ).toBe("none")
    expect(getVideoChapterMask([])).toBe("none")
  })
})

describe("getVideoVolumeLevel", () => {
  it("is muted when muted or silent, low under half, high from half", () => {
    expect(getVideoVolumeLevel(0.8, true)).toBe("muted")
    expect(getVideoVolumeLevel(0, false)).toBe("muted")
    expect(getVideoVolumeLevel(0.3, false)).toBe("low")
    expect(getVideoVolumeLevel(0.5, false)).toBe("high")
  })
})

describe("getVideoPlayerStatus", () => {
  const state = {
    isPaused: true,
    isWaiting: false,
    isEnded: false,
    hasError: false,
    hasStarted: false,
  }

  it("is idle until the first play", () => {
    expect(getVideoPlayerStatus(state)).toBe("idle")
  })

  it("follows play, pause, buffering and the end", () => {
    expect(
      getVideoPlayerStatus({ ...state, hasStarted: true, isPaused: false })
    ).toBe("playing")
    expect(getVideoPlayerStatus({ ...state, hasStarted: true })).toBe("paused")
    expect(
      getVideoPlayerStatus({
        ...state,
        hasStarted: true,
        isPaused: false,
        isWaiting: true,
      })
    ).toBe("buffering")
    expect(
      getVideoPlayerStatus({ ...state, hasStarted: true, isEnded: true })
    ).toBe("ended")
  })

  it("puts an error above everything else", () => {
    expect(
      getVideoPlayerStatus({ ...state, isWaiting: true, hasError: true })
    ).toBe("error")
  })
})

describe("isVideoControlsVisible", () => {
  const playing = {
    isPlaying: true,
    isIdle: true,
    isMenuOpen: false,
    isSeeking: false,
  }

  it("hides the controls while a video plays untouched", () => {
    expect(isVideoControlsVisible(playing)).toBe(false)
  })

  it("shows them while paused, moved over, in a menu or seeking", () => {
    expect(isVideoControlsVisible({ ...playing, isPlaying: false })).toBe(true)
    expect(isVideoControlsVisible({ ...playing, isIdle: false })).toBe(true)
    expect(isVideoControlsVisible({ ...playing, isMenuOpen: true })).toBe(true)
    expect(isVideoControlsVisible({ ...playing, isSeeking: true })).toBe(true)
  })
})

describe("toggleVideoCaptions", () => {
  it("turns captions off when they're on", () => {
    expect(toggleVideoCaptions({ current: 1, previous: 0, count: 2 })).toBe(-1)
  })

  it("turns the last track used back on, or the first", () => {
    expect(toggleVideoCaptions({ current: -1, previous: 1, count: 2 })).toBe(1)
    expect(toggleVideoCaptions({ current: -1, previous: -1, count: 2 })).toBe(0)
  })

  it("stays off without tracks", () => {
    expect(toggleVideoCaptions({ current: -1, previous: -1, count: 0 })).toBe(
      -1
    )
  })
})
