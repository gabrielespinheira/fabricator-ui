// What a toast plays. No React Native imports, so it stays testable anywhere.

import type { FeedbackName } from "@/registry/native/lib/feedback"

/** The sound for a toast of this type. A loading toast waits until it settles. */
export function getToastFeedback(
  type: string | undefined
): FeedbackName | null {
  if (type === "loading") return null
  if (type === "success" || type === "warning" || type === "error") return type
  return "notify"
}
