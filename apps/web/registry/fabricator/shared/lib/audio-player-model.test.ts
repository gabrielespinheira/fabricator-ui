import { describe, expect, it } from "vitest"

import {
  AUDIO_PLAYER_MIN_BAR_LEVEL,
  formatAudioRate,
  getAudioPeaks,
  getAudioPlayerKeyAction,
  getAudioTimeLabels,
  getAudioWaveformBarCount,
  getAudioWaveformBars,
  getNextAudioRate,
} from "./audio-player-model"

const key = (value: string) => ({
  key: value,
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
})

describe("getAudioPlayerKeyAction", () => {
  it("keeps the media keys the video player uses", () => {
    expect(getAudioPlayerKeyAction(key(" "))).toEqual({ type: "toggle-play" })
    expect(getAudioPlayerKeyAction(key("l"))).toEqual({
      type: "seek-by",
      seconds: 10,
    })
    expect(getAudioPlayerKeyAction(key("m"))).toEqual({ type: "toggle-mute" })
    expect(getAudioPlayerKeyAction(key(">"))).toEqual({
      type: "rate-by",
      step: 1,
    })
  })

  it("leaves F and C to the page, since audio has no full screen or captions", () => {
    expect(getAudioPlayerKeyAction(key("f"))).toBeNull()
    expect(getAudioPlayerKeyAction(key("c"))).toBeNull()
  })

  it("ignores keys held with a modifier", () => {
    expect(getAudioPlayerKeyAction({ ...key("k"), metaKey: true })).toBeNull()
  })
})

describe("getAudioWaveformBars", () => {
  it("scales the loudest bar to full height", () => {
    expect(getAudioWaveformBars([0.25, 0.5], 2)).toEqual([0.5, 1])
  })

  it("keeps the loudest peak of each group when there are fewer bars", () => {
    expect(getAudioWaveformBars([0.2, 0.8, 0.4, 0.4, 1, 0.1], 3)).toEqual([
      0.8, 0.4, 1,
    ])
  })

  it("repeats peaks when there are more bars than peaks", () => {
    expect(getAudioWaveformBars([0.5, 1], 4)).toEqual([0.5, 0.5, 1, 1])
  })

  it("keeps silent stretches visible as a stub", () => {
    expect(getAudioWaveformBars([0, 1], 2)).toEqual([
      AUDIO_PLAYER_MIN_BAR_LEVEL,
      1,
    ])
  })

  it("draws a flat stub line when every peak is silent", () => {
    expect(getAudioWaveformBars([0, 0], 2)).toEqual([
      AUDIO_PLAYER_MIN_BAR_LEVEL,
      AUDIO_PLAYER_MIN_BAR_LEVEL,
    ])
  })

  it("clamps peaks outside 0 to 1", () => {
    expect(getAudioWaveformBars([-1, 3], 2)).toEqual([
      AUDIO_PLAYER_MIN_BAR_LEVEL,
      1,
    ])
  })

  it("draws nothing without peaks or room", () => {
    expect(getAudioWaveformBars([], 10)).toEqual([])
    expect(getAudioWaveformBars([1], 0)).toEqual([])
  })
})

describe("getAudioWaveformBarCount", () => {
  it("fits whole bars and the gaps between them", () => {
    expect(getAudioWaveformBarCount({ width: 50, barWidth: 3, gap: 2 })).toBe(
      10
    )
    expect(getAudioWaveformBarCount({ width: 52, barWidth: 3, gap: 2 })).toBe(
      10
    )
  })

  it("fits none in a track that has no width yet", () => {
    expect(getAudioWaveformBarCount({ width: 0, barWidth: 3, gap: 2 })).toBe(0)
  })
})

describe("getAudioPeaks", () => {
  it("takes the loudest sample of each slice, whatever its sign", () => {
    const samples = Float32Array.from([0.1, -0.6, 0.3, 0.2, -0.1, 0.9])
    expect(getAudioPeaks(samples, 3)).toEqual([0.6, 0.3, 0.9])
  })

  it("rounds to two decimals so the peaks stay small to store", () => {
    expect(getAudioPeaks(Float32Array.from([0.123456]), 1)).toEqual([0.12])
  })

  it("caps clipped samples at full scale", () => {
    expect(getAudioPeaks(Float32Array.from([1.4, -0.2]), 1)).toEqual([1])
  })

  it("returns no more peaks than there are samples", () => {
    expect(getAudioPeaks(Float32Array.from([0.5, 0.25]), 8)).toEqual([
      0.5, 0.25,
    ])
  })
})

describe("getNextAudioRate", () => {
  const rates = [0.75, 1, 1.5, 2]

  it("steps up to the next speed", () => {
    expect(getNextAudioRate(rates, 1)).toBe(1.5)
  })

  it("wraps from the fastest to the slowest", () => {
    expect(getNextAudioRate(rates, 2)).toBe(0.75)
  })

  it("steps from a speed that isn't offered to the next one that is", () => {
    expect(getNextAudioRate(rates, 1.25)).toBe(1.5)
  })
})

describe("formatAudioRate", () => {
  it("writes the speed with a times sign, normal speed included", () => {
    expect(formatAudioRate(1)).toBe("1×")
    expect(formatAudioRate(1.5)).toBe("1.5×")
    expect(formatAudioRate(0.75)).toBe("0.75×")
  })
})

describe("getAudioTimeLabels", () => {
  it("shows the time played and the time left", () => {
    expect(
      getAudioTimeLabels({ status: "playing", time: 65, duration: 200 })
    ).toEqual({ current: "1:05", remaining: "−2:15", compact: "1:05" })
  })

  it("shows the length in compact before the first play and at the end", () => {
    expect(
      getAudioTimeLabels({ status: "idle", time: 0, duration: 52 }).compact
    ).toBe("0:52")
    expect(
      getAudioTimeLabels({ status: "ended", time: 52, duration: 52 }).compact
    ).toBe("0:52")
  })

  it("keeps hours in both labels when the audio is an hour or longer", () => {
    expect(
      getAudioTimeLabels({ status: "paused", time: 30, duration: 3700 })
    ).toEqual({ current: "0:00:30", remaining: "−1:01:10", compact: "0:00:30" })
  })

  it("shows zero while the length is unknown", () => {
    expect(
      getAudioTimeLabels({ status: "idle", time: 0, duration: Number.NaN })
    ).toEqual({ current: "0:00", remaining: "−0:00", compact: "0:00" })
  })
})
