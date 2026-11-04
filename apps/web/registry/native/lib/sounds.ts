import * as Haptics from "expo-haptics"

import type { FeedbackName } from "@/registry/native/lib/feedback"
import { getHaptic } from "@/registry/native/lib/sounds-model"

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

let isEnabled = true

export function getSoundsEnabled() {
  return isEnabled
}

export function setSoundsEnabled(enabled: boolean) {
  isEnabled = enabled
}

/** Plays a name's haptic. Devices without a motor ignore it. */
export function playSound(name: FeedbackName) {
  if (!isEnabled) return
  const haptic = getHaptic(name)
  if (!haptic) return
  if (haptic.kind === "selection") void Haptics.selectionAsync()
  if (haptic.kind === "impact") void Haptics.impactAsync(IMPACTS[haptic.weight])
  if (haptic.kind === "notification") {
    void Haptics.notificationAsync(NOTIFICATIONS[haptic.type])
  }
}
