import * as React from "react"

/*
 * Interface sounds, synthesized with the Web Audio API: no audio files, no
 * dependencies. Every voice is a few milliseconds of oscillators and filtered
 * noise under a soft envelope, mixed through one master gain and a gentle
 * low-pass so nothing sounds harsh.
 *
 * Sounds are OFF until something calls `setSoundsEnabled(true)` (or renders
 * `<SoundEffects enabled />`): a library must never surprise people with
 * audio. Playing always follows a user gesture, which is when browsers allow
 * an AudioContext to start.
 */

export type SoundName =
  | "tap"
  | "tick"
  | "check"
  | "uncheck"
  | "toggle-on"
  | "toggle-off"
  | "pop"
  | "open"
  | "close"
  | "whisk"
  | "notch"
  | "deny"
  | "notify"
  | "success"
  | "copy"

export type SoundCategory =
  | "Actions"
  | "Selection"
  | "Notifications"
  | "Navigation"
  | "Movement"
  | "Feedback"
  | "Progress"

export type SoundInfo = {
  name: SoundName
  category: SoundCategory
  description: string
  /** Approximate length in milliseconds. */
  length: number
  /** Main pitch in Hz. */
  pitch: number
}

export const SOUNDS: readonly SoundInfo[] = [
  {
    name: "tap",
    category: "Actions",
    description: "A soft, short knock for the moment a button is pressed.",
    length: 60,
    pitch: 180,
  },
  {
    name: "copy",
    category: "Actions",
    description: "A light double tap for copying to the clipboard.",
    length: 90,
    pitch: 520,
  },
  {
    name: "tick",
    category: "Selection",
    description: "A small, dry tick for picking a tab, a row or an option.",
    length: 45,
    pitch: 440,
  },
  {
    name: "check",
    category: "Selection",
    description: "Two quick rising notes for ticking a box.",
    length: 90,
    pitch: 370,
  },
  {
    name: "uncheck",
    category: "Selection",
    description: "The same two notes, falling, for clearing a box.",
    length: 80,
    pitch: 330,
  },
  {
    name: "toggle-on",
    category: "Selection",
    description: "A rising latch for a switch turning on.",
    length: 110,
    pitch: 262,
  },
  {
    name: "toggle-off",
    category: "Selection",
    description: "A falling latch for a switch turning off.",
    length: 100,
    pitch: 330,
  },
  {
    name: "pop",
    category: "Notifications",
    description: "The one voice that rises, for a small thing appearing.",
    length: 40,
    pitch: 680,
  },
  {
    name: "notify",
    category: "Notifications",
    description: "A warm two-tone chime for alerts and arrivals.",
    length: 320,
    pitch: 659,
  },
  {
    name: "open",
    category: "Navigation",
    description: "Two notes a fifth apart, for a dialog or sheet opening.",
    length: 300,
    pitch: 196,
  },
  {
    name: "close",
    category: "Navigation",
    description: "A deep, short fall for something closing.",
    length: 140,
    pitch: 220,
  },
  {
    name: "whisk",
    category: "Navigation",
    description: "A soft breath of air for moving between views.",
    length: 130,
    pitch: 124,
  },
  {
    name: "notch",
    category: "Movement",
    description: "A tiny, high tick, quiet enough to hear forty times a drag.",
    length: 25,
    pitch: 660,
  },
  {
    name: "deny",
    category: "Feedback",
    description: "A soft fall for a refusal, short enough not to scold.",
    length: 120,
    pitch: 208,
  },
  {
    name: "success",
    category: "Progress",
    description: "Three rising notes for something completing.",
    length: 360,
    pitch: 392,
  },
]

const SOUND_NAMES = new Set<string>(SOUNDS.map((sound) => sound.name))

export function isSoundName(value: unknown): value is SoundName {
  return typeof value === "string" && SOUND_NAMES.has(value)
}

// --- State -----------------------------------------------------------------

type State = { enabled: boolean; volume: number }

let state: State = { enabled: false, volume: 0.6 }
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function getSoundsEnabled() {
  return state.enabled
}

export function setSoundsEnabled(enabled: boolean) {
  if (state.enabled === enabled) return
  state = { ...state, enabled }
  emit()
}

export function getSoundVolume() {
  return state.volume
}

/** Master volume, 0 to 1. */
export function setSoundVolume(volume: number) {
  const next = Math.min(1, Math.max(0, volume))
  if (state.volume === next) return
  state = { ...state, volume: next }
  if (master && context) {
    master.gain.setTargetAtTime(next * MASTER_LEVEL, context.currentTime, 0.02)
  }
  emit()
}

export function subscribeSounds(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Whether sounds are on, and a setter. */
export function useSoundsEnabled() {
  const enabled = React.useSyncExternalStore(
    subscribeSounds,
    getSoundsEnabled,
    () => false
  )
  return [enabled, setSoundsEnabled] as const
}

/** A stable callback that plays one sound. */
export function useSound(name: SoundName, options?: PlayOptions) {
  const volume = options?.volume
  const pitch = options?.pitch
  const force = options?.force
  return React.useCallback(
    () => playSound(name, { volume, pitch, force }),
    [name, volume, pitch, force]
  )
}

// --- Engine ----------------------------------------------------------------

const MASTER_LEVEL = 0.45
// The same sound can't retrigger faster than this (a drag fires many events).
const RETRIGGER_MS = 35
// At most this many voices ring at once; extra plays are dropped.
const MAX_VOICES = 6

let context: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
const lastPlayed = new Map<SoundName, number>()
let voicesEndAt: number[] = []

function getContext() {
  if (typeof window === "undefined") return null
  if (!context) {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextClass) return null
    context = new AudioContextClass()
    master = context.createGain()
    master.gain.value = state.volume * MASTER_LEVEL
    // Round off the top end: interface sounds should feel soft.
    const tone = context.createBiquadFilter()
    tone.type = "lowpass"
    tone.frequency.value = 7000
    master.connect(tone).connect(context.destination)
  }
  if (context.state === "suspended") void context.resume()
  return context
}

function getNoise(ctx: AudioContext) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const length = Math.floor(ctx.sampleRate * 0.5)
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

type ToneOptions = {
  freq: number
  /** Glide to this frequency over `glide` seconds. */
  to?: number
  glide?: number
  type?: OscillatorType
  at?: number
  attack?: number
  decay: number
  gain: number
}

function tone(ctx: AudioContext, out: AudioNode, t0: number, o: ToneOptions) {
  const start = t0 + (o.at ?? 0)
  const attack = o.attack ?? 0.004
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = o.type ?? "sine"
  osc.frequency.setValueAtTime(o.freq, start)
  if (o.to) {
    osc.frequency.exponentialRampToValueAtTime(
      o.to,
      start + (o.glide ?? o.decay * 0.6)
    )
  }
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(o.gain, start + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, start + attack + o.decay)
  osc.connect(env).connect(out)
  osc.start(start)
  osc.stop(start + attack + o.decay + 0.02)
  return start + attack + o.decay
}

type NoiseOptions = {
  filter?: BiquadFilterType
  freq: number
  to?: number
  q?: number
  at?: number
  attack?: number
  decay: number
  gain: number
}

function noise(ctx: AudioContext, out: AudioNode, t0: number, o: NoiseOptions) {
  const start = t0 + (o.at ?? 0)
  const attack = o.attack ?? 0.002
  const source = ctx.createBufferSource()
  source.buffer = getNoise(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = o.filter ?? "bandpass"
  filter.frequency.setValueAtTime(o.freq, start)
  if (o.to) {
    filter.frequency.exponentialRampToValueAtTime(
      o.to,
      start + attack + o.decay
    )
  }
  filter.Q.value = o.q ?? 1
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(o.gain, start + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, start + attack + o.decay)
  source.connect(filter).connect(env).connect(out)
  // Start somewhere in the buffer so repeated plays don't sound identical.
  source.start(start, Math.random() * 0.3)
  source.stop(start + attack + o.decay + 0.02)
  return start + attack + o.decay
}

type Voice = (
  ctx: AudioContext,
  out: AudioNode,
  t0: number,
  p: number
) => number

// `p` scales every frequency (the `pitch` option); 1 is the designed pitch.
const VOICES: Record<SoundName, Voice> = {
  tap: (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, {
        freq: 180 * p,
        to: 120 * p,
        glide: 0.05,
        type: "triangle",
        decay: 0.055,
        gain: 0.5,
      }),
      noise(ctx, out, t, { freq: 2200 * p, q: 1.2, decay: 0.012, gain: 0.12 })
    ),
  copy: (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, { freq: 520 * p, decay: 0.035, gain: 0.22 }),
      tone(ctx, out, t, { freq: 660 * p, at: 0.05, decay: 0.04, gain: 0.2 })
    ),
  tick: (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, { freq: 440 * p, to: 392 * p, decay: 0.04, gain: 0.2 }),
      noise(ctx, out, t, { freq: 2800 * p, q: 4, decay: 0.012, gain: 0.1 })
    ),
  check: (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, {
        freq: 370 * p,
        type: "triangle",
        decay: 0.04,
        gain: 0.26,
      }),
      tone(ctx, out, t, {
        freq: 555 * p,
        type: "triangle",
        at: 0.035,
        decay: 0.055,
        gain: 0.22,
      })
    ),
  uncheck: (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, {
        freq: 330 * p,
        type: "triangle",
        decay: 0.035,
        gain: 0.22,
      }),
      tone(ctx, out, t, {
        freq: 247 * p,
        type: "triangle",
        at: 0.03,
        decay: 0.05,
        gain: 0.2,
      })
    ),
  "toggle-on": (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, {
        freq: 262 * p,
        to: 392 * p,
        glide: 0.07,
        decay: 0.1,
        gain: 0.28,
      }),
      noise(ctx, out, t, { freq: 3200 * p, q: 3, decay: 0.01, gain: 0.08 })
    ),
  "toggle-off": (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, {
        freq: 330 * p,
        to: 220 * p,
        glide: 0.07,
        decay: 0.09,
        gain: 0.26,
      }),
      noise(ctx, out, t, { freq: 2400 * p, q: 3, decay: 0.01, gain: 0.07 })
    ),
  pop: (ctx, out, t, p) =>
    tone(ctx, out, t, {
      freq: 520 * p,
      to: 880 * p,
      glide: 0.03,
      decay: 0.04,
      gain: 0.22,
    }),
  notify: (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, { freq: 659 * p, decay: 0.22, gain: 0.2 }),
      tone(ctx, out, t, { freq: 659 * 2.76 * p, decay: 0.08, gain: 0.03 }),
      tone(ctx, out, t, { freq: 523 * p, at: 0.09, decay: 0.24, gain: 0.2 }),
      tone(ctx, out, t, {
        freq: 523 * 2.76 * p,
        at: 0.09,
        decay: 0.08,
        gain: 0.03,
      })
    ),
  open: (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, {
        freq: 196 * p,
        attack: 0.01,
        decay: 0.24,
        gain: 0.24,
      }),
      tone(ctx, out, t, {
        freq: 294 * p,
        at: 0.06,
        attack: 0.01,
        decay: 0.24,
        gain: 0.2,
      })
    ),
  close: (ctx, out, t, p) =>
    tone(ctx, out, t, {
      freq: 220 * p,
      to: 130 * p,
      glide: 0.1,
      attack: 0.006,
      decay: 0.13,
      gain: 0.26,
    }),
  whisk: (ctx, out, t, p) =>
    Math.max(
      noise(ctx, out, t, {
        freq: 600 * p,
        to: 1800 * p,
        q: 0.8,
        attack: 0.04,
        decay: 0.09,
        gain: 0.16,
      }),
      tone(ctx, out, t, { freq: 124 * p, attack: 0.02, decay: 0.1, gain: 0.1 })
    ),
  notch: (ctx, out, t, p) =>
    tone(ctx, out, t, {
      freq: 660 * p,
      attack: 0.002,
      decay: 0.02,
      gain: 0.07,
    }),
  deny: (ctx, out, t, p) => {
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 900
    filter.connect(out)
    return tone(ctx, filter, t, {
      freq: 208 * p,
      to: 156 * p,
      glide: 0.1,
      type: "triangle",
      attack: 0.006,
      decay: 0.11,
      gain: 0.36,
    })
  },
  success: (ctx, out, t, p) =>
    Math.max(
      tone(ctx, out, t, { freq: 392 * p, decay: 0.12, gain: 0.18 }),
      tone(ctx, out, t, { freq: 494 * p, at: 0.07, decay: 0.12, gain: 0.18 }),
      tone(ctx, out, t, { freq: 587 * p, at: 0.14, decay: 0.22, gain: 0.18 })
    ),
}

export type PlayOptions = {
  /** 0 to 1, on top of the master volume. */
  volume?: number
  /** Multiplies every frequency in the sound (1 is the designed pitch). */
  pitch?: number
  /** Play even when sounds are off (an explicit preview, never automatic). */
  force?: boolean
}

export function playSound(name: SoundName, options: PlayOptions = {}) {
  if (!options.force && !state.enabled) return
  if (typeof document === "undefined" || document.hidden) return
  const voice = VOICES[name]
  if (!voice) return

  const now = performance.now()
  if (now - (lastPlayed.get(name) ?? -Infinity) < RETRIGGER_MS) return

  const ctx = getContext()
  if (!ctx || !master) return
  const t0 = ctx.currentTime + 0.005
  voicesEndAt = voicesEndAt.filter((end) => end > ctx.currentTime)
  if (voicesEndAt.length >= MAX_VOICES) return
  lastPlayed.set(name, now)

  const out = ctx.createGain()
  out.gain.value = Math.min(1, Math.max(0, options.volume ?? 1))
  out.connect(master)
  const end = voice(ctx, out, t0, options.pitch ?? 1)
  voicesEndAt.push(end)
  // Release the per-play gain once the voice has rung out.
  window.setTimeout(
    () => out.disconnect(),
    Math.ceil((end - ctx.currentTime) * 1000) + 100
  )
}
