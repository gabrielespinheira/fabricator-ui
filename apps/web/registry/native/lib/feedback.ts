import * as React from "react"

/*
 * What a control plays when it's used. The website's <SoundEffects /> listens on
 * the document; React Native has no document, so controls call this hook. With
 * no <SoundEffects /> above them it does nothing, and adds no dependency.
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

const NO_FEEDBACK = () => {}

const FeedbackContext =
  React.createContext<(name: FeedbackName) => void>(NO_FEEDBACK)

/** Plays a control's feedback, if the app turned it on. */
function useFeedback() {
  return React.use(FeedbackContext)
}

export { FeedbackContext, useFeedback }
