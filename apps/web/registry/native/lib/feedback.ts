import * as React from "react"

/*
 * What a control plays when it's used: a sound and a haptic. The website's
 * <SoundEffects /> listens on the document; React Native has no document, so
 * controls call this hook. With no <SoundEffects /> mounted it does nothing, and
 * adds no dependency. It isn't React context: overlays render in a portal, which
 * leaves the tree a provider would sit in.
 */
export type FeedbackName =
  | "tap"
  | "press"
  | "thud"
  | "tick"
  | "copy"
  | "check"
  | "uncheck"
  | "pick"
  | "toggle-on"
  | "toggle-off"
  | "latch"
  | "unlatch"
  | "note"
  | "page"
  | "whisk"
  | "pop"
  | "dismiss"
  | "open"
  | "close"
  | "alert"
  | "slide-in"
  | "slide-out"
  | "expand"
  | "collapse"
  | "notify"
  | "success"
  | "warning"
  | "error"
  | "notch"
  | "grab"
  | "drop"
  | "deny"

export type FeedbackOptions = {
  /** Multiplies every frequency in the sound (1 is the designed pitch). */
  pitch?: number
}

type FeedbackPlayer = (name: FeedbackName, options?: FeedbackOptions) => void

let player: FeedbackPlayer | null = null

function playFeedback(name: FeedbackName, options?: FeedbackOptions) {
  player?.(name, options)
}

// A surface only sounds right after a touch, as on the website: one that opens by
// itself, from a timer or `defaultOpen`, stays quiet.
const GESTURE_WINDOW_MS = 1000

let lastGestureAt: number | null = null

/** Notes a touch. FabricatorRoot calls this for every one, and takes none of them. */
function markGesture(now = Date.now()) {
  lastGestureAt = now
}

function isAfterGesture(now: number, gestureAt: number | null) {
  return gestureAt !== null && now - gestureAt < GESTURE_WINDOW_MS
}

function playSurfaceFeedback(name: FeedbackName) {
  if (isAfterGesture(Date.now(), lastGestureAt)) playFeedback(name)
}

/** Installs what plays feedback. <SoundEffects /> calls this. */
function setFeedbackPlayer(next: FeedbackPlayer | null) {
  player = next
}

/** Plays a control's feedback, if the app turned it on. */
function useFeedback() {
  return playFeedback
}

const SURFACE_FEEDBACK = {
  popup: ["pop", "dismiss"],
  dialog: ["open", "close"],
  alert: ["alert", "close"],
  panel: ["slide-in", "slide-out"],
} as const satisfies Record<string, readonly [FeedbackName, FeedbackName]>

/** Plays a surface's sound as it opens and closes, and nothing as it mounts. */
function useSurfaceFeedback(
  kind: keyof typeof SURFACE_FEEDBACK,
  isOpen: boolean
) {
  const wasOpen = React.useRef(isOpen)
  React.useEffect(() => {
    if (wasOpen.current === isOpen) return
    wasOpen.current = isOpen
    playSurfaceFeedback(SURFACE_FEEDBACK[kind][isOpen ? 0 : 1])
  }, [isOpen, kind])
}

/**
 * For a surface that only renders while it's open, like a popup's content: plays
 * its opening sound as it mounts, and its closing one as it unmounts.
 */
function useMountFeedback(kind: keyof typeof SURFACE_FEEDBACK) {
  React.useEffect(() => {
    playSurfaceFeedback(SURFACE_FEEDBACK[kind][0])
    return () => playSurfaceFeedback(SURFACE_FEEDBACK[kind][1])
  }, [kind])
}

export {
  isAfterGesture,
  markGesture,
  setFeedbackPlayer,
  useFeedback,
  useMountFeedback,
  useSurfaceFeedback,
}
