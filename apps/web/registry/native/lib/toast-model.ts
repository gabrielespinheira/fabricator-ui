// What a toast plays, and the sizes its stack goes by. No React Native imports, so it stays testable anywhere.

import type { ToastSize } from "@/registry/fabricator/shared/lib/toast-stack-model"
import type { FeedbackName } from "@/registry/native/lib/feedback"

/** The sound for a toast of this type. A loading toast waits until it settles. */
export function getToastFeedback(
  type: string | undefined
): FeedbackName | null {
  if (type === "loading") return null
  if (type === "success" || type === "warning" || type === "error") return type
  return "notify"
}

/**
 * The sizes the stack goes by, front first. A new toast has none until it's laid
 * out, so it takes the one it covers; nothing is placed until one is measured.
 */
export function getStackSizes(
  toasts: readonly { size?: ToastSize }[]
): ToastSize[] {
  const measured = toasts.find((toast) => toast.size)?.size
  if (!measured) return []
  return toasts.map((toast) => toast.size ?? measured)
}
