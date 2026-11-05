// The website's Web Audio graph, rendered offline: the same oscillators, filters
// and envelopes, sample by sample, so a recipe sounds the same on both platforms.
// React Native has no Web Audio; expo-audio plays the file this makes. No React
// Native imports, so it stays testable anywhere.
import {
  SOUND_MASTER_LEVEL,
  type SoundPartial,
} from "@/registry/fabricator/shared/lib/sound-recipes"

const SILENCE = 0.0001
const DEFAULT_ATTACK = 2
const DEFAULT_LOWPASS = 8000
const DEFAULT_NOISE_Q = 1
// A low-pass's Q in Web Audio's default, in decibels.
const LOWPASS_RESONANCE_DB = 1
const NOISE_SEED = 22222

type RenderOptions = { sampleRate: number; pitch?: number }

type Filter = {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
}

function getLowpass(frequency: number, sampleRate: number): Filter {
  const w0 = (2 * Math.PI * Math.min(frequency, sampleRate * 0.49)) / sampleRate
  const alpha = Math.sin(w0) / (2 * Math.pow(10, LOWPASS_RESONANCE_DB / 20))
  const cos = Math.cos(w0)
  const a0 = 1 + alpha
  return {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  }
}

function getBandpass(frequency: number, q: number, sampleRate: number): Filter {
  const w0 = (2 * Math.PI * Math.min(frequency, sampleRate * 0.49)) / sampleRate
  const alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * Math.cos(w0)) / a0,
    a2: (1 - alpha) / a0,
  }
}

function oscillate(wave: SoundPartial["wave"], phase: number) {
  switch (wave) {
    case "sine":
      return Math.sin(2 * Math.PI * phase)
    case "square":
      return phase < 0.5 ? 1 : -1
    case "sawtooth":
      return 2 * phase - 1
    default:
      // Triangle.
      return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase
  }
}

/** Repeatable noise: a recipe always renders to the same file. */
function createNoise(seed: number) {
  let state = seed
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return (state / 0xffffffff) * 2 - 1
  }
}

/** The envelope: exponential up through the attack, exponential down to the end. */
function getEnvelope(
  time: number,
  attack: number,
  length: number,
  gain: number
) {
  if (time < attack) {
    return SILENCE * Math.pow(gain / SILENCE, time / attack)
  }
  const decay = (time - attack) / Math.max(length - attack, 1e-6)
  return gain * Math.pow(SILENCE / gain, decay)
}

function mixPartial(
  out: Float32Array,
  partial: SoundPartial,
  { sampleRate, pitch = 1 }: RenderOptions,
  noiseSeed: number
) {
  const start = Math.floor(((partial.at ?? 0) / 1000) * sampleRate)
  const length = partial.length / 1000
  const count = Math.min(Math.ceil(length * sampleRate), out.length - start)
  const attack = Math.min(
    (partial.attack ?? DEFAULT_ATTACK) / 1000,
    length * 0.5
  )
  const from = partial.freq * pitch
  const to = (partial.to ?? partial.freq) * pitch
  const isNoise = partial.wave === "noise"
  const nextNoise = createNoise(noiseSeed)
  // A glide moves a noise band's centre, so its filter is worked out per sample.
  const glides = isNoise && to !== from
  const q = partial.q ?? DEFAULT_NOISE_Q
  let filter = isNoise
    ? getBandpass(from, q, sampleRate)
    : getLowpass(partial.lowpass ?? DEFAULT_LOWPASS, sampleRate)
  let phase = 0
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  for (let i = 0; i < count; i++) {
    const time = i / sampleRate
    const frequency = from * Math.pow(to / from, time / length)
    if (glides) filter = getBandpass(frequency, q, sampleRate)
    const input = isNoise ? nextNoise() : oscillate(partial.wave, phase)
    phase = (phase + frequency / sampleRate) % 1
    const output =
      filter.b0 * input +
      filter.b1 * x1 +
      filter.b2 * x2 -
      filter.a1 * y1 -
      filter.a2 * y2
    x2 = x1
    x1 = input
    y2 = y1
    y1 = output
    out[start + i] += output * getEnvelope(time, attack, length, partial.gain)
  }
}

/** A recipe as samples, at the website's mix level, from -1 to 1. */
export function renderSound(partials: SoundPartial[], options: RenderOptions) {
  const end = partials.reduce(
    (latest, partial) => Math.max(latest, (partial.at ?? 0) + partial.length),
    0
  )
  const samples = new Float32Array(Math.ceil((end / 1000) * options.sampleRate))
  partials.forEach((partial, index) => {
    mixPartial(samples, partial, options, NOISE_SEED + index)
  })
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.max(-1, Math.min(1, samples[i] * SOUND_MASTER_LEVEL))
  }
  return samples
}

const WAV_HEADER_BYTES = 44

/** Samples as a mono 16-bit WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number) {
  const dataBytes = samples.length * 2
  const bytes = new Uint8Array(WAV_HEADER_BYTES + dataBytes)
  const view = new DataView(bytes.buffer)
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      bytes[offset + i] = text.charCodeAt(i)
    }
  }
  writeText(0, "RIFF")
  view.setUint32(4, 36 + dataBytes, true)
  writeText(8, "WAVEfmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, "data")
  view.setUint32(40, dataBytes, true)
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(
      WAV_HEADER_BYTES + index * 2,
      clamped < 0 ? clamped * 32768 : clamped * 32767,
      true
    )
  })
  return bytes
}

/** The file a sound renders to: its recipe in the name, so an edit replaces it. */
export function getSoundFileName(
  name: string,
  partials: SoundPartial[],
  pitch: number
) {
  let hash = 5381
  for (const char of JSON.stringify(partials)) {
    hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0
  }
  return `fabricator-${name}-${Math.round(pitch * 1000)}-${hash.toString(36)}.wav`
}
