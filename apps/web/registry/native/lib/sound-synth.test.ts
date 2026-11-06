import { describe, expect, it } from "vitest"

import {
  encodeWav,
  getSoundFileName,
  renderSound,
} from "@/registry/native/lib/sound-synth"

const RATE = 44100

const sine = { wave: "sine" as const, freq: 440, length: 100, gain: 0.5 }

/** How many times a signal crosses zero per second: twice its frequency. */
function crossingsPerSecond(samples: Float32Array) {
  let crossings = 0
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1] < 0 !== samples[i] < 0) crossings++
  }
  return crossings / (samples.length / RATE)
}

const rms = (samples: Float32Array) =>
  Math.sqrt(
    samples.reduce((sum, value) => sum + value * value, 0) / samples.length
  )

const peak = (samples: Float32Array) =>
  samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0)

describe("renderSound", () => {
  it("runs as long as its last partial", () => {
    const samples = renderSound([sine, { ...sine, at: 50, length: 150 }], {
      sampleRate: RATE,
    })
    expect(samples.length).toBeCloseTo(RATE * 0.2, -2)
  })

  it("stays silent until a partial starts", () => {
    const samples = renderSound([{ ...sine, at: 50 }], { sampleRate: RATE })
    expect(peak(samples.subarray(0, Math.floor(RATE * 0.05)))).toBe(0)
    expect(peak(samples.subarray(Math.floor(RATE * 0.05)))).toBeGreaterThan(
      0.05
    )
  })

  it("plays at the recipe's frequency", () => {
    const samples = renderSound([sine], { sampleRate: RATE })
    expect(Math.abs(crossingsPerSecond(samples) / 2 - 440)).toBeLessThan(10)
  })

  it("multiplies every frequency by the pitch", () => {
    const samples = renderSound([sine], { sampleRate: RATE, pitch: 2 })
    expect(Math.abs(crossingsPerSecond(samples) / 2 - 880)).toBeLessThan(10)
  })

  it("glides toward `to`", () => {
    const samples = renderSound([{ ...sine, to: 110, length: 400 }], {
      sampleRate: RATE,
    })
    const half = Math.floor(samples.length / 2)
    expect(crossingsPerSecond(samples.subarray(0, half))).toBeGreaterThan(
      crossingsPerSecond(samples.subarray(half))
    )
  })

  it("rises through the attack and dies away by the end", () => {
    const samples = renderSound([{ ...sine, attack: 10 }], { sampleRate: RATE })
    const end = samples.subarray(samples.length - 40)
    expect(peak(samples.subarray(0, 40))).toBeLessThan(0.2)
    expect(peak(samples)).toBeGreaterThan(0.1)
    expect(peak(end)).toBeLessThan(0.01)
  })

  it("rounds a square's edges with its low-pass", () => {
    const square = {
      wave: "square" as const,
      freq: 2000,
      length: 100,
      gain: 0.5,
    }
    const open = renderSound([square], { sampleRate: RATE })
    const closed = renderSound([{ ...square, lowpass: 400 }], {
      sampleRate: RATE,
    })
    expect(rms(closed)).toBeLessThan(rms(open) / 2)
  })

  it("shapes noise with a band-pass around its frequency", () => {
    const noise = { wave: "noise" as const, freq: 3000, length: 100, gain: 0.5 }
    const narrow = renderSound([{ ...noise, q: 12 }], { sampleRate: RATE })
    const wide = renderSound([{ ...noise, q: 0.5 }], { sampleRate: RATE })
    expect(rms(narrow)).toBeGreaterThan(0)
    expect(rms(narrow)).toBeLessThan(rms(wide))
  })

  it("is the same every time, so a file can stand in for it", () => {
    const noise = { wave: "noise" as const, freq: 3000, length: 20, gain: 0.5 }
    expect(renderSound([noise], { sampleRate: RATE })).toEqual(
      renderSound([noise], { sampleRate: RATE })
    )
  })

  it("never clips, however many partials pile up", () => {
    const loud = { ...sine, gain: 1 }
    const samples = renderSound([loud, loud, loud, loud, loud, loud], {
      sampleRate: RATE,
    })
    expect(peak(samples)).toBeLessThanOrEqual(1)
  })
})

describe("encodeWav", () => {
  const text = (bytes: Uint8Array, start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end))

  it("writes a mono 16-bit RIFF file", () => {
    const bytes = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), RATE)
    const view = new DataView(bytes.buffer)
    expect(bytes.length).toBe(44 + 8)
    expect(text(bytes, 0, 4)).toBe("RIFF")
    expect(view.getUint32(4, true)).toBe(36 + 8)
    expect(text(bytes, 8, 16)).toBe("WAVEfmt ")
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(RATE)
    expect(view.getUint32(28, true)).toBe(RATE * 2)
    expect(view.getUint16(34, true)).toBe(16)
    expect(text(bytes, 36, 40)).toBe("data")
    expect(view.getUint32(40, true)).toBe(8)
  })

  it("scales samples to the full 16-bit range", () => {
    const bytes = encodeWav(new Float32Array([0, 1, -1]), RATE)
    const view = new DataView(bytes.buffer)
    expect(view.getInt16(44, true)).toBe(0)
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(-32768)
  })
})

describe("getSoundFileName", () => {
  it("changes with the recipe, so an edited sound replaces its file", () => {
    const a = getSoundFileName("tap", [sine], 1)
    expect(a).toMatch(/^fabricator-tap-1000-[a-z0-9]+\.wav$/)
    expect(getSoundFileName("tap", [{ ...sine, freq: 441 }], 1)).not.toBe(a)
  })

  it("names each pitch", () => {
    expect(getSoundFileName("note", [sine], 1.5)).toContain("-1500-")
  })
})
