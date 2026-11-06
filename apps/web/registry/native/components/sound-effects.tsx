import * as React from "react"

import { setFeedbackPlayer } from "@/registry/native/lib/feedback"
import {
  playSound,
  preloadSounds,
  setHapticsEnabled,
  setSoundsEnabled,
  setSoundVolume,
} from "@/registry/native/lib/sounds"

/**
 * Turns on feedback for every control while it's mounted: the website's sounds,
 * plus a haptic for each. Render it once, near the root. The ring switch silences
 * the sounds, and other apps' audio keeps playing under them.
 */
function SoundEffects({
  enabled,
  haptics,
  volume,
  children,
}: {
  /** Turns sounds on or off. Sounds are on by default. */
  enabled?: boolean
  /** Turns haptics on or off. Haptics are on by default. */
  haptics?: boolean
  /** Master volume, 0 to 1. */
  volume?: number
  children?: React.ReactNode
}) {
  React.useEffect(() => {
    if (enabled !== undefined) setSoundsEnabled(enabled)
  }, [enabled])

  React.useEffect(() => {
    if (haptics !== undefined) setHapticsEnabled(haptics)
  }, [haptics])

  React.useEffect(() => {
    if (volume !== undefined) setSoundVolume(volume)
  }, [volume])

  React.useEffect(() => {
    setFeedbackPlayer(playSound)
    preloadSounds()
    return () => setFeedbackPlayer(null)
  }, [])

  return children
}

export { SoundEffects }
