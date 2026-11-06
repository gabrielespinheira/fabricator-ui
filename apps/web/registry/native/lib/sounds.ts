import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio"
import { File, Paths } from "expo-file-system"
import * as Haptics from "expo-haptics"

import {
  DEFAULT_SOUND_VOLUME,
  SOUND_DEFINITIONS,
} from "@/registry/fabricator/shared/lib/sound-recipes"
import type {
  FeedbackName,
  FeedbackOptions,
} from "@/registry/native/lib/feedback"
import {
  encodeWav,
  getSoundFileName,
  renderSound,
} from "@/registry/native/lib/sound-synth"
import {
  createSoundGate,
  getHaptic,
  quantizePitch,
} from "@/registry/native/lib/sounds-model"

const IMPACTS = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
}

const NOTIFICATIONS = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
}

const SAMPLE_RATE = 44100

// Rendered and loaded ahead of the first press, since a press can't wait for it.
const EVERYDAY_SOUNDS: FeedbackName[] = [
  "tap",
  "press",
  "tick",
  "check",
  "uncheck",
  "pick",
  "toggle-on",
  "toggle-off",
  "latch",
  "unlatch",
  "note",
  "pop",
  "dismiss",
  "open",
  "close",
  "slide-in",
  "slide-out",
  "expand",
  "collapse",
  "alert",
  "notify",
  "success",
  "warning",
  "error",
  "thud",
  "page",
  "whisk",
  "notch",
  "grab",
  "drop",
  "deny",
  "copy",
]

const RECIPES = new Map(
  SOUND_DEFINITIONS.map((sound) => [sound.name, sound.partials])
)

// A surface's sound replaces the press that opened or closed it.
const SURFACE_SOUNDS = new Set<FeedbackName>([
  "pop",
  "dismiss",
  "open",
  "close",
  "alert",
  "slide-in",
  "slide-out",
])

const players = new Map<string, AudioPlayer>()
const shouldPlay = createSoundGate()
let pendingPress: number | null = null

let isEnabled = true
let isHapticEnabled = true
let volume = DEFAULT_SOUND_VOLUME
let isAudioReady = false

export function getSoundsEnabled() {
  return isEnabled
}

/** Turns sounds off. Haptics have their own switch, `setHapticsEnabled`. */
export function setSoundsEnabled(enabled: boolean) {
  isEnabled = enabled
}

export function getHapticsEnabled() {
  return isHapticEnabled
}

export function setHapticsEnabled(enabled: boolean) {
  isHapticEnabled = enabled
}

export function getSoundVolume() {
  return volume
}

/** Master volume, 0 to 1. */
export function setSoundVolume(next: number) {
  volume = Math.min(1, Math.max(0, next))
  for (const player of players.values()) player.volume = volume
}

// Interface sounds sit on top of whatever else is playing, and the ring switch
// silences them, as with any iPhone app's.
function prepareAudio() {
  if (isAudioReady) return
  isAudioReady = true
  void setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: "mixWithOthers",
    shouldPlayInBackground: false,
    allowsRecording: false,
  })
}

/** A sound's player, rendering its file the first time it's asked for. */
function getPlayer(name: FeedbackName, pitch: number) {
  const key = `${name}@${pitch}`
  const existing = players.get(key)
  if (existing) return existing
  const partials = RECIPES.get(name)
  if (!partials) return null
  const file = new File(Paths.cache, getSoundFileName(name, partials, pitch))
  if (!file.exists) {
    file.create({ overwrite: true })
    file.write(
      encodeWav(
        renderSound(partials, { sampleRate: SAMPLE_RATE, pitch }),
        SAMPLE_RATE
      )
    )
  }
  const player = createAudioPlayer({ uri: file.uri })
  player.volume = volume
  // Back at the start before the next press: a seek takes a moment, and a play
  // issued during one is dropped.
  player.addListener("playbackStatusUpdate", (status) => {
    if (status.didJustFinish) void player.seekTo(0)
  })
  players.set(key, player)
  return player
}

/** Loads the everyday sounds, one per tick, so a first press plays right away. */
export function preloadSounds() {
  prepareAudio()
  const queue = [...EVERYDAY_SOUNDS]
  const next = () => {
    const name = queue.shift()
    if (!name) return
    getPlayer(name, 1)
    setTimeout(next, 0)
  }
  setTimeout(next, 0)
}

function playAudio(name: FeedbackName, pitch: number) {
  prepareAudio()
  const player = getPlayer(name, pitch)
  if (!player) return
  if (player.currentTime > 0) {
    void player.seekTo(0).then(() => player.play())
    return
  }
  player.play()
}

function playHaptic(name: FeedbackName) {
  const haptic = getHaptic(name)
  if (!haptic) return
  if (haptic.kind === "selection") void Haptics.selectionAsync()
  if (haptic.kind === "impact") void Haptics.impactAsync(IMPACTS[haptic.weight])
  if (haptic.kind === "notification") {
    void Haptics.notificationAsync(NOTIFICATIONS[haptic.type])
  }
}

/**
 * Plays a name's sound and haptic. Devices without a motor ignore the haptic. A
 * press's sound waits a frame, as on the website: if the press also opened or
 * closed a surface, the surface's sound plays instead.
 */
export function playSound(name: FeedbackName, options: FeedbackOptions = {}) {
  if (!isEnabled && !isHapticEnabled) return
  if (!shouldPlay(name, Date.now())) return
  if (isHapticEnabled) playHaptic(name)
  if (!isEnabled) return
  const pitch = quantizePitch(options.pitch ?? 1)
  if (pendingPress !== null) cancelAnimationFrame(pendingPress)
  pendingPress = null
  if (SURFACE_SOUNDS.has(name)) {
    playAudio(name, pitch)
    return
  }
  pendingPress = requestAnimationFrame(() => {
    pendingPress = null
    playAudio(name, pitch)
  })
}
