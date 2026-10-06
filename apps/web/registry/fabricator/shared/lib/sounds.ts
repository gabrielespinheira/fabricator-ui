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
  | "note"

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

// The catalogue follows the roles in Bencho's sound library
// (https://bencho.dev/sounds): the same jobs, lengths and pitches, made here
// with our own synthesis. Everything is a sine with a short attack, a gentle
// pitch fall and an exponential tail, so the set sounds like one instrument.
export const SOUNDS: readonly SoundInfo[] = [
  {
    name: "tap",
    category: "Actions",
    description: "A soft, short note for the moment a finger lands.",
    length: 100,
    pitch: 168,
  },
  {
    name: "tick",
    category: "Selection",
    description: "The selection mark, for a row, a tool or a tab.",
    length: 150,
    pitch: 196,
  },
  {
    name: "check",
    category: "Selection",
    description: "A box being checked: the selection mark.",
    length: 150,
    pitch: 196,
  },
  {
    name: "uncheck",
    category: "Selection",
    description: "A falling note for a box being cleared.",
    length: 95,
    pitch: 330,
  },
  {
    name: "toggle-on",
    category: "Selection",
    description: "A switch turning on: the selection mark.",
    length: 150,
    pitch: 196,
  },
  {
    name: "toggle-off",
    category: "Selection",
    description: "A falling note for anything switching off.",
    length: 95,
    pitch: 330,
  },
  {
    name: "open",
    category: "Navigation",
    description:
      "Two notes a fifth apart, for a menu, a field or a sheet opening.",
    length: 360,
    pitch: 196,
  },
  {
    name: "close",
    category: "Navigation",
    description: "A falling note for anything closing.",
    length: 95,
    pitch: 330,
  },
  {
    name: "note",
    category: "Navigation",
    description:
      "A warm note per tab: each position plays the next note of a chord.",
    length: 270,
    pitch: 196,
  },
  {
    name: "whisk",
    category: "Navigation",
    description: "A deep, short sound for moving between views.",
    length: 130,
    pitch: 124,
  },
  {
    name: "pop",
    category: "Notifications",
    description: "The one voice that rises, for a small thing appearing.",
    length: 45,
    pitch: 680,
  },
  {
    name: "notify",
    category: "Notifications",
    description: "A warm chime for alerts and arrivals.",
    length: 270,
    pitch: 220,
  },
  {
    name: "notch",
    category: "Movement",
    description: "A quiet, high blip light enough to repeat along a drag.",
    length: 35,
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
    description: "A slow, settling note for an action completing.",
    length: 330,
    pitch: 262,
  },
  {
    name: "copy",
    category: "Actions",
    description: "The rising blip, for something copied.",
    length: 45,
    pitch: 680,
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

type Voice = (
  ctx: AudioContext,
  out: AudioNode,
  t0: number,
  p: number
) => number

// `p` scales every frequency (the `pitch` option); 1 is the designed pitch.
// Every voice is a sine: a 4ms attack, a pitch fall over most of its length,
// and an exponential tail.
const fall = (
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  freq: number,
  to: number,
  length: number,
  gain: number,
  at = 0
) =>
  tone(ctx, out, t, {
    freq,
    to,
    glide: length * 0.9,
    decay: length,
    gain,
    at,
  })

const VOICES: Record<SoundName, Voice> = {
  tap: (ctx, out, t, p) =>
    tone(ctx, out, t, { freq: 168 * p, decay: 0.1, gain: 0.26 }),
  tick: (ctx, out, t, p) => fall(ctx, out, t, 196 * p, 130 * p, 0.15, 0.26),
  check: (ctx, out, t, p) => fall(ctx, out, t, 196 * p, 130 * p, 0.15, 0.26),
  "toggle-on": (ctx, out, t, p) =>
    fall(ctx, out, t, 196 * p, 130 * p, 0.15, 0.26),
  uncheck: (ctx, out, t, p) => fall(ctx, out, t, 330 * p, 247 * p, 0.095, 0.2),
  "toggle-off": (ctx, out, t, p) =>
    fall(ctx, out, t, 330 * p, 247 * p, 0.095, 0.2),
  close: (ctx, out, t, p) => fall(ctx, out, t, 330 * p, 247 * p, 0.095, 0.2),
  // A fifth: the low note, and the high note a breath later.
  open: (ctx, out, t, p) =>
    Math.max(
      fall(ctx, out, t, 196 * p, 174 * p, 0.36, 0.2),
      fall(ctx, out, t, 294 * p, 262 * p, 0.3, 0.16, 0.03)
    ),
  note: (ctx, out, t, p) => fall(ctx, out, t, 196 * p, 174 * p, 0.27, 0.22),
  whisk: (ctx, out, t, p) => fall(ctx, out, t, 124 * p, 104 * p, 0.13, 0.28),
  pop: (ctx, out, t, p) => fall(ctx, out, t, 680 * p, 930 * p, 0.045, 0.14),
  copy: (ctx, out, t, p) => fall(ctx, out, t, 680 * p, 930 * p, 0.045, 0.14),
  // A warm root with its fifth arriving just after.
  notify: (ctx, out, t, p) =>
    Math.max(
      fall(ctx, out, t, 220 * p, 208 * p, 0.27, 0.18),
      fall(ctx, out, t, 330 * p, 311 * p, 0.22, 0.12, 0.06)
    ),
  notch: (ctx, out, t, p) =>
    tone(ctx, out, t, { freq: 660 * p, decay: 0.035, gain: 0.06 }),
  deny: (ctx, out, t, p) => fall(ctx, out, t, 208 * p, 150 * p, 0.12, 0.24),
  success: (ctx, out, t, p) => fall(ctx, out, t, 262 * p, 247 * p, 0.33, 0.22),
}

/**
 * Chord tones for `note`, as `pitch` multipliers of its 196Hz: C, E, G, C, E,
 * G. Navigation passes the item's position, so tabs and dock items play a
 * rising arpeggio from first to last.
 */
export const NOTE_STEPS = [131, 163, 196, 262, 330, 392].map((hz) => hz / 196)

/** The `pitch` for the item at `index` in a row of navigation items. */
export function noteStep(index: number) {
  return NOTE_STEPS[Math.max(0, index) % NOTE_STEPS.length]
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
