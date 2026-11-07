import * as React from "react"

import {
  DEFAULT_SOUND_VOLUME,
  SOUND_DEFINITIONS,
  SOUND_MASTER_LEVEL,
  type SoundDefinition,
  type SoundName,
  type SoundPartial,
} from "@/registry/radix-fabricator/lib/sound-recipes"

export {
  NOTE_STEPS,
  noteStep,
} from "@/registry/radix-fabricator/lib/sound-recipes"
export type {
  SoundCategory,
  SoundName,
} from "@/registry/radix-fabricator/lib/sound-recipes"

/*
 * Interface sounds, synthesized with the Web Audio API: no audio files, no
 * dependencies. Every sound is a few short partials (oscillators, each through
 * its own low-pass, or bursts of filtered noise) under soft envelopes, mixed
 * through one master gain.
 *
 * Each family of components has its own material, so you can tell what you
 * touched without looking:
 *
 * - Buttons are wood: triangle waves with a short noise transient.
 * - Checkboxes, radios and toggles are a mechanism: filtered square clicks.
 * - Switches are liquid: one soft, falling sine as the thumb settles.
 * - Rows, links and menu items are glass: very short, high sines.
 * - Tabs are bells, tuned to a chord across their positions.
 * - Popups pop, dialogs bloom, sheets and drawers move air.
 * - Toasts chime by type: info, success, warning and error.
 *
 * Sounds are on by default; turn them off with `setSoundsEnabled(false)` (or
 * `<SoundEffects enabled={false} />`), for example from a user setting. Playing
 * always follows a user gesture, which is when browsers allow an AudioContext
 * to start.
 */

export type SoundInfo = Omit<SoundDefinition, "partials"> & {
  /** Length in milliseconds. */
  length: number
  /** Main pitch in Hz: the first tonal partial. */
  pitch: number
}

const PARTIALS = Object.fromEntries(
  SOUND_DEFINITIONS.map((sound) => [sound.name, sound.partials])
) as Record<SoundName, SoundPartial[]>

export const SOUNDS: readonly SoundInfo[] = SOUND_DEFINITIONS.map(
  ({ partials, ...info }) => ({
    ...info,
    length: Math.max(...partials.map((p) => (p.at ?? 0) + p.length)),
    pitch: (partials.find((p) => p.wave !== "noise") ?? partials[0])?.freq ?? 0,
  })
)

const SOUND_NAMES = new Set<string>(SOUNDS.map((sound) => sound.name))

export function isSoundName(value: unknown): value is SoundName {
  return typeof value === "string" && SOUND_NAMES.has(value)
}

// --- State -----------------------------------------------------------------

type State = { enabled: boolean; volume: number }

let state: State = { enabled: true, volume: DEFAULT_SOUND_VOLUME }
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
    master.gain.setTargetAtTime(
      next * SOUND_MASTER_LEVEL,
      context.currentTime,
      0.02
    )
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

// The same sound can't retrigger faster than this (a drag fires many events).
const RETRIGGER_MS = 35
// At most this many sounds ring at once; extra plays are dropped.
const MAX_VOICES = 6
// Each play is detuned by up to this much, so repeats don't sound mechanical.
const HUMANIZE = 0.012

let context: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
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
    master.gain.value = state.volume * SOUND_MASTER_LEVEL
    master.connect(context.destination)
  }
  if (context.state === "suspended") void context.resume()
  return context
}

/** Half a second of white noise, made once and read from a random offset. */
function getNoise(ctx: AudioContext) {
  if (!noise) {
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.5), ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}

/** Schedules one partial; returns when it has rung out, in context time. */
function playPartial(
  ctx: AudioContext,
  out: AudioNode,
  t0: number,
  p: SoundPartial,
  pitch: number
) {
  const start = t0 + (p.at ?? 0) / 1000
  const length = p.length / 1000
  const end = start + length
  const attack = Math.min((p.attack ?? 2) / 1000, length * 0.5)

  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(p.gain, start + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, end)
  env.connect(out)

  const filter = ctx.createBiquadFilter()
  let source: AudioScheduledSourceNode
  let frequency: AudioParam
  if (p.wave === "noise") {
    const buffer = getNoise(ctx)
    const node = ctx.createBufferSource()
    node.buffer = buffer
    filter.type = "bandpass"
    filter.Q.value = p.q ?? 1
    frequency = filter.frequency
    source = node
    node.connect(filter).connect(env)
    node.start(start, Math.random() * Math.max(0, 0.5 - length))
  } else {
    const node = ctx.createOscillator()
    node.type = p.wave
    filter.type = "lowpass"
    filter.frequency.value = p.lowpass ?? 8000
    frequency = node.frequency
    source = node
    node.connect(filter).connect(env)
    node.start(start)
  }
  frequency.setValueAtTime(p.freq * pitch, start)
  if (p.to) frequency.exponentialRampToValueAtTime(p.to * pitch, end)
  source.stop(end + 0.02)
  return end
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
  const partials = PARTIALS[name]
  if (!partials) return

  if (performance.now() - (lastPlayed.get(name) ?? -Infinity) < RETRIGGER_MS) {
    return
  }

  const ctx = getContext()
  if (!ctx || !master) return
  const t0 = ctx.currentTime + 0.005
  voicesEndAt = voicesEndAt.filter((end) => end > ctx.currentTime)
  if (voicesEndAt.length >= MAX_VOICES) return
  // Read the clock after the context exists: creating it can take a tenth of
  // a second, longer than the retrigger window.
  lastPlayed.set(name, performance.now())

  const out = ctx.createGain()
  out.gain.value = Math.min(1, Math.max(0, options.volume ?? 1))
  out.connect(master)
  const pitch = (options.pitch ?? 1) * (1 + (Math.random() - 0.5) * HUMANIZE)
  let end = t0
  for (const partial of partials) {
    end = Math.max(end, playPartial(ctx, out, t0, partial, pitch))
  }
  voicesEndAt.push(end)
  // Release the per-play gain once the sound has rung out.
  window.setTimeout(
    () => out.disconnect(),
    Math.ceil((end - ctx.currentTime) * 1000) + 100
  )
}
