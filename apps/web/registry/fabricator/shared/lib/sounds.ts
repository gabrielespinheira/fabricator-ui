import * as React from "react"

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
 * Sounds are OFF until something calls `setSoundsEnabled(true)` (or renders
 * `<SoundEffects enabled />`): a library must never surprise people with
 * audio. Playing always follows a user gesture, which is when browsers allow
 * an AudioContext to start.
 */

export type SoundName =
  // Actions
  | "tap"
  | "press"
  | "thud"
  | "tick"
  | "copy"
  // Selection
  | "check"
  | "uncheck"
  | "pick"
  | "toggle-on"
  | "toggle-off"
  | "latch"
  | "unlatch"
  // Navigation
  | "note"
  | "page"
  | "whisk"
  // Surfaces
  | "pop"
  | "dismiss"
  | "open"
  | "close"
  | "alert"
  | "slide-in"
  | "slide-out"
  | "expand"
  | "collapse"
  // Notifications
  | "notify"
  | "success"
  | "warning"
  | "error"
  // Movement
  | "notch"
  | "grab"
  | "drop"
  // Feedback
  | "deny"

export type SoundCategory =
  | "Actions"
  | "Selection"
  | "Navigation"
  | "Surfaces"
  | "Notifications"
  | "Movement"
  | "Feedback"

/**
 * One layer of a sound. Times are in milliseconds from the start of the sound.
 * An oscillator partial plays `wave` at `freq`; a noise partial plays white
 * noise through a band-pass centred on `freq`.
 */
type Partial = {
  wave: OscillatorType | "noise"
  freq: number
  /** Glide to this frequency over the partial's length. */
  to?: number
  at?: number
  length: number
  attack?: number
  /** Peak level, before the master volume. */
  gain: number
  /** Low-pass cutoff for oscillators; rounds off square and triangle edges. */
  lowpass?: number
  /** Band-pass width for noise (higher is narrower). */
  q?: number
}

type SoundDefinition = {
  name: SoundName
  category: SoundCategory
  description: string
  /** Where the sound plays by default. */
  usedBy: string
  partials: Partial[]
}

export type SoundInfo = {
  name: SoundName
  category: SoundCategory
  description: string
  usedBy: string
  /** Length in milliseconds. */
  length: number
  /** Main pitch in Hz: the first tonal partial. */
  pitch: number
}

// The roles follow Bencho's sound library (https://bencho.dev/sounds): one
// sound per kind of moment, quiet and short. The sounds themselves are ours.
// prettier-ignore
const DEFINITIONS: SoundDefinition[] = [
  // --- Actions: wood -------------------------------------------------------
  {
    name: "tap",
    category: "Actions",
    description: "A light knock of wood, for an everyday press.",
    usedBy: "Outline, secondary and ghost buttons",
    partials: [
      { wave: "triangle", freq: 280, to: 250, length: 45, attack: 2, gain: 0.22, lowpass: 1800 },
      { wave: "noise", freq: 3200, length: 8, attack: 1, gain: 0.25, q: 1.2 },
    ],
  },
  {
    name: "press",
    category: "Actions",
    description: "A fuller, lower knock with an octave above, for the main action.",
    usedBy: "Primary buttons",
    partials: [
      { wave: "triangle", freq: 196, to: 175, length: 80, attack: 3, gain: 0.221, lowpass: 1400 },
      { wave: "sine", freq: 392, to: 370, length: 40, attack: 2, gain: 0.068 },
      { wave: "noise", freq: 2400, length: 10, attack: 1, gain: 0.255, q: 1 },
    ],
  },
  {
    name: "thud",
    category: "Actions",
    description: "A heavy, damped drop, for an action that can't be taken back.",
    usedBy: "Destructive buttons",
    partials: [
      { wave: "sine", freq: 155, to: 98, length: 140, attack: 3, gain: 0.221, lowpass: 700 },
      { wave: "triangle", freq: 310, to: 250, length: 30, attack: 2, gain: 0.065, lowpass: 1200 },
      { wave: "noise", freq: 900, length: 25, attack: 1, gain: 0.227, q: 0.8 },
    ],
  },
  {
    name: "tick",
    category: "Actions",
    description: "A tiny, glassy tick, light enough for every row and link.",
    usedBy: "Menu items, links, sidebar and navigation items, link buttons",
    partials: [
      { wave: "sine", freq: 1180, to: 1100, length: 22, attack: 1, gain: 0.07 },
      { wave: "triangle", freq: 590, length: 16, attack: 1, gain: 0.06, lowpass: 2600 },
    ],
  },
  {
    name: "copy",
    category: "Actions",
    description: "Two bright blips a fifth apart: it's on the clipboard.",
    usedBy: 'Copy buttons (data-sound="copy")',
    partials: [
      { wave: "sine", freq: 1047, length: 45, attack: 2, gain: 0.102 },
      { wave: "sine", freq: 1568, at: 55, length: 70, attack: 2, gain: 0.085 },
    ],
  },

  // --- Selection: a mechanism -----------------------------------------------
  {
    name: "check",
    category: "Selection",
    description: "Two clicks stepping up, the way a check mark is drawn.",
    usedBy: "Checkboxes, menu checkboxes",
    partials: [
      { wave: "square", freq: 392, length: 20, attack: 1, gain: 0.06, lowpass: 2400 },
      { wave: "square", freq: 587, at: 30, length: 45, attack: 1, gain: 0.07, lowpass: 2600 },
      { wave: "sine", freq: 1174, at: 30, length: 60, attack: 2, gain: 0.03 },
    ],
  },
  {
    name: "uncheck",
    category: "Selection",
    description: "One soft click sliding down, for a box being cleared.",
    usedBy: "Checkboxes, menu checkboxes",
    partials: [
      { wave: "square", freq: 330, to: 280, length: 30, attack: 1, gain: 0.07, lowpass: 1800 },
    ],
  },
  {
    name: "pick",
    category: "Selection",
    description: "A click that rings on, for one choice taken from a set.",
    usedBy: "Radios, select and combobox options, command items, calendar days",
    partials: [
      { wave: "square", freq: 440, length: 18, attack: 1, gain: 0.033, lowpass: 2400 },
      { wave: "sine", freq: 880, at: 4, length: 110, attack: 4, gain: 0.065 },
    ],
  },
  // The switch pair is Bencho's liquid toggle ("Tick" and "Hush"), with the
  // gains scaled to sit at Bencho's level under our master volume.
  {
    name: "toggle-on",
    category: "Selection",
    description: "A soft, round drop as the thumb settles on.",
    usedBy: "Switches",
    partials: [
      { wave: "sine", freq: 196, to: 130, length: 150, attack: 4, gain: 0.26, lowpass: 900 },
    ],
  },
  {
    name: "toggle-off",
    category: "Selection",
    description: "A quieter, shorter sigh as it lets go.",
    usedBy: "Switches",
    partials: [
      { wave: "sine", freq: 330, to: 247, length: 88, attack: 8, gain: 0.11, lowpass: 720 },
    ],
  },
  {
    name: "latch",
    category: "Selection",
    description: "A key pressing in, then catching: click, clack.",
    usedBy: "Toggles, toggle group items",
    partials: [
      { wave: "noise", freq: 1500, length: 12, attack: 1, gain: 0.3, q: 1.5 },
      { wave: "triangle", freq: 247, length: 40, attack: 2, gain: 0.18, lowpass: 1500 },
      { wave: "noise", freq: 2200, at: 32, length: 10, attack: 1, gain: 0.22, q: 1.5 },
      { wave: "square", freq: 494, at: 32, length: 22, attack: 1, gain: 0.045, lowpass: 2000 },
    ],
  },
  {
    name: "unlatch",
    category: "Selection",
    description: "The key springing back up: one lower click that lifts.",
    usedBy: "Toggles, toggle group items",
    partials: [
      { wave: "noise", freq: 1100, length: 12, attack: 1, gain: 0.3, q: 1.5 },
      { wave: "triangle", freq: 196, to: 233, length: 50, attack: 2, gain: 0.2, lowpass: 1100 },
    ],
  },

  // --- Navigation -----------------------------------------------------------
  {
    name: "note",
    category: "Navigation",
    description: "A small bell per tab: each position rings the next note of a chord.",
    usedBy: "Tabs",
    partials: [
      { wave: "sine", freq: 294, to: 292, length: 220, attack: 6, gain: 0.11 },
      { wave: "sine", freq: 588, length: 120, attack: 4, gain: 0.028 },
      { wave: "triangle", freq: 882, length: 40, attack: 2, gain: 0.017, lowpass: 2000 },
    ],
  },
  {
    name: "page",
    category: "Navigation",
    description: "A paper flick, for turning to another page or month.",
    usedBy: "Pagination, calendar month buttons",
    partials: [
      { wave: "noise", freq: 2600, to: 1400, length: 60, attack: 3, gain: 0.255, q: 0.9 },
      { wave: "triangle", freq: 330, to: 300, length: 35, attack: 2, gain: 0.068, lowpass: 1600 },
    ],
  },
  {
    name: "whisk",
    category: "Navigation",
    description: "A soft rush of air, for content sliding past.",
    usedBy: "Carousel previous and next",
    partials: [
      { wave: "noise", freq: 500, to: 1800, length: 150, attack: 40, gain: 0.28, q: 0.7 },
      { wave: "sine", freq: 165, to: 220, length: 140, attack: 20, gain: 0.1 },
    ],
  },

  // --- Surfaces -------------------------------------------------------------
  {
    name: "pop",
    category: "Surfaces",
    description: "A quick rising bubble, for a small surface appearing.",
    usedBy: "Menus, popovers, select and combobox lists, hover cards",
    partials: [
      { wave: "sine", freq: 520, to: 820, length: 40, attack: 2, gain: 0.14 },
      { wave: "triangle", freq: 1040, length: 14, attack: 1, gain: 0.03, lowpass: 3000 },
    ],
  },
  {
    name: "dismiss",
    category: "Surfaces",
    description: "The bubble falling back, quieter.",
    usedBy: "Menus, popovers, select and combobox lists, hover cards",
    partials: [{ wave: "sine", freq: 700, to: 460, length: 45, attack: 2, gain: 0.1 }],
  },
  {
    name: "open",
    category: "Surfaces",
    description: "Two warm notes a fifth apart blooming in, for a dialog.",
    usedBy: "Dialogs, command palettes, Search",
    partials: [
      { wave: "sine", freq: 220, to: 218, length: 340, attack: 14, gain: 0.144, lowpass: 1400 },
      { wave: "sine", freq: 330, to: 328, at: 40, length: 300, attack: 14, gain: 0.096 },
      { wave: "sine", freq: 660, at: 40, length: 120, attack: 10, gain: 0.016 },
    ],
  },
  {
    name: "close",
    category: "Surfaces",
    description: "The same fifth stepping down and away.",
    usedBy: "Dialogs, alert dialogs, command palettes, Search",
    partials: [
      { wave: "sine", freq: 330, to: 320, length: 120, attack: 6, gain: 0.12 },
      { wave: "sine", freq: 220, to: 200, at: 45, length: 160, attack: 6, gain: 0.15 },
    ],
  },
  {
    name: "alert",
    category: "Surfaces",
    description: "A minor third with a knock in front: this one needs an answer.",
    usedBy: "Alert dialogs",
    partials: [
      { wave: "sine", freq: 220, length: 380, attack: 10, gain: 0.144 },
      { wave: "sine", freq: 262, at: 60, length: 340, attack: 10, gain: 0.104 },
      { wave: "triangle", freq: 440, length: 60, attack: 2, gain: 0.032, lowpass: 1600 },
    ],
  },
  {
    name: "slide-in",
    category: "Surfaces",
    description: "Air rising under a low note, for a panel sliding in.",
    usedBy: "Sheets and drawers opening",
    partials: [
      { wave: "noise", freq: 350, to: 1500, length: 200, attack: 70, gain: 0.3, q: 0.6 },
      { wave: "sine", freq: 131, to: 175, length: 200, attack: 50, gain: 0.12 },
    ],
  },
  {
    name: "slide-out",
    category: "Surfaces",
    description: "The air falling away again.",
    usedBy: "Sheets and drawers closing",
    partials: [
      { wave: "noise", freq: 1500, to: 350, length: 170, attack: 30, gain: 0.221, q: 0.6 },
      { wave: "sine", freq: 175, to: 131, length: 160, attack: 20, gain: 0.085 },
    ],
  },
  {
    name: "expand",
    category: "Surfaces",
    description: "A short upward unfold, for content opening in place.",
    usedBy: "Accordions, collapsibles, <details>",
    partials: [
      { wave: "triangle", freq: 294, to: 392, length: 90, attack: 8, gain: 0.16, lowpass: 1500 },
      { wave: "noise", freq: 2000, length: 20, attack: 2, gain: 0.1, q: 1 },
    ],
  },
  {
    name: "collapse",
    category: "Surfaces",
    description: "The unfold in reverse, a little quieter.",
    usedBy: "Accordions, collapsibles, <details>",
    partials: [
      { wave: "triangle", freq: 392, to: 294, length: 75, attack: 6, gain: 0.13, lowpass: 1300 },
    ],
  },

  // --- Notifications: chimes ------------------------------------------------
  {
    name: "notify",
    category: "Notifications",
    description: "Two bell tones a fifth apart, for news arriving.",
    usedBy: "Toasts (default and info)",
    partials: [
      { wave: "sine", freq: 392, length: 260, attack: 6, gain: 0.109 },
      { wave: "sine", freq: 1176, length: 90, attack: 3, gain: 0.017 },
      { wave: "sine", freq: 587, at: 90, length: 320, attack: 6, gain: 0.095 },
      { wave: "sine", freq: 1761, at: 90, length: 100, attack: 3, gain: 0.014 },
    ],
  },
  {
    name: "success",
    category: "Notifications",
    description: "A quick rising major chord, for something done.",
    usedBy: "Success toasts",
    partials: [
      { wave: "sine", freq: 523, length: 140, attack: 4, gain: 0.082 },
      { wave: "sine", freq: 659, at: 60, length: 150, attack: 4, gain: 0.082 },
      { wave: "sine", freq: 784, at: 120, length: 300, attack: 4, gain: 0.088 },
      { wave: "sine", freq: 1568, at: 120, length: 120, attack: 3, gain: 0.014 },
    ],
  },
  {
    name: "warning",
    category: "Notifications",
    description: "Two even, reedy pulses on one note: look at this.",
    usedBy: "Warning toasts",
    partials: [
      { wave: "triangle", freq: 440, length: 90, attack: 4, gain: 0.16, lowpass: 1800 },
      { wave: "triangle", freq: 440, at: 130, length: 120, attack: 4, gain: 0.16, lowpass: 1800 },
    ],
  },
  {
    name: "error",
    category: "Notifications",
    description: "Two low, buzzing notes falling a third: something failed.",
    usedBy: "Error toasts",
    partials: [
      { wave: "triangle", freq: 247, length: 110, attack: 4, gain: 0.2, lowpass: 1000 },
      { wave: "square", freq: 247, length: 60, attack: 2, gain: 0.03, lowpass: 900 },
      { wave: "triangle", freq: 196, at: 120, length: 200, attack: 4, gain: 0.22, lowpass: 900 },
    ],
  },

  // --- Movement -------------------------------------------------------------
  {
    name: "notch",
    category: "Movement",
    description: "A tiny detent that follows the value, light enough to repeat along a drag.",
    usedBy: "Sliders",
    partials: [
      { wave: "triangle", freq: 640, length: 16, attack: 1, gain: 0.09, lowpass: 2400 },
    ],
  },
  {
    name: "grab",
    category: "Movement",
    description: "A low catch, for picking something up.",
    usedBy: "Resizable handles",
    partials: [
      { wave: "noise", freq: 1200, length: 18, attack: 1, gain: 0.325, q: 1.2 },
      { wave: "triangle", freq: 175, length: 40, attack: 2, gain: 0.208, lowpass: 1000 },
    ],
  },
  {
    name: "drop",
    category: "Movement",
    description: "A soft landing, for letting it go.",
    usedBy: "Resizable handles",
    partials: [
      { wave: "sine", freq: 165, to: 123, length: 90, attack: 2, gain: 0.2, lowpass: 900 },
      { wave: "noise", freq: 700, length: 25, attack: 1, gain: 0.2, q: 0.9 },
    ],
  },

  // --- Feedback -------------------------------------------------------------
  {
    name: "deny",
    category: "Feedback",
    description: 'Two low knocks, "uh-uh": short enough not to scold.',
    usedBy: "Disabled controls",
    partials: [
      { wave: "triangle", freq: 185, to: 175, length: 70, attack: 2, gain: 0.18, lowpass: 900 },
      { wave: "triangle", freq: 165, to: 150, at: 95, length: 110, attack: 2, gain: 0.18, lowpass: 800 },
    ],
  },
]

const PARTIALS = Object.fromEntries(
  DEFINITIONS.map((sound) => [sound.name, sound.partials])
) as Record<SoundName, Partial[]>

export const SOUNDS: readonly SoundInfo[] = DEFINITIONS.map(
  ({ partials, ...info }) => ({
    ...info,
    length: Math.max(...partials.map((p) => (p.at ?? 0) + p.length)),
    pitch: (partials.find((p) => p.wave !== "noise") ?? partials[0]).freq,
  })
)

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
    master.gain.value = state.volume * MASTER_LEVEL
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
  p: Partial,
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

/**
 * Chord tones for `note`, as `pitch` multipliers of its 294Hz: G, B, D, G, B,
 * D. Tabs pass their position, so a row of tabs plays a rising arpeggio from
 * first to last.
 */
export const NOTE_STEPS = [196, 247, 294, 392, 494, 587].map((hz) => hz / 294)

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
