import * as React from "react"

import { FeedbackContext } from "@/registry/native/lib/feedback"
import { playSound, setSoundsEnabled } from "@/registry/native/lib/sounds"

/**
 * Turns on feedback for every control inside it. On native it's haptic; the
 * website's Web Audio sounds don't exist here.
 */
function SoundEffects({
  enabled = true,
  children,
}: {
  enabled?: boolean
  children?: React.ReactNode
}) {
  React.useEffect(() => {
    setSoundsEnabled(enabled)
  }, [enabled])
  return <FeedbackContext value={playSound}>{children}</FeedbackContext>
}

export { SoundEffects }
