"use client"

import * as React from "react"

import {
  getDefaultAnswers,
  getNextStep,
  getPreviousStep,
  parseAnswers,
  resolveStep,
  type OnboardingAnswers,
  type OnboardingStep,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"

// The answers live in sessionStorage and the step in the URL's hash, so a
// reload keeps both and the browser's Back goes one question back.

const STORAGE_KEY = "onboarding-01"

const listeners = new Set<() => void>()
// Stands in where the browser refuses storage.
let memory: string | null = null

function readSaved() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return memory
  }
}

function writeSaved(text: string) {
  memory = text
  try {
    window.sessionStorage.setItem(STORAGE_KEY, text)
  } catch {
    // Kept in memory until the page goes.
  }
  for (const listener of listeners) listener()
}

function subscribeToSaved(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  window.addEventListener("popstate", onChange)
  return () => {
    window.removeEventListener("hashchange", onChange)
    window.removeEventListener("popstate", onChange)
  }
}

export function useOnboarding(email: string) {
  const saved = React.useSyncExternalStore(
    subscribeToSaved,
    readSaved,
    () => null
  )
  const hash = React.useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash.slice(1),
    () => ""
  )
  const answers = React.useMemo(
    () => parseAnswers(saved, getDefaultAnswers(email)),
    [saved, email]
  )
  // A step stays while it is answered: emptying a name in the review doesn't
  // send people back to the question.
  const [held, setHeld] = React.useState<{
    key: string
    step: OnboardingStep
  }>()
  const key = `${hash} ${saved === null}`
  if (held?.key !== key) {
    setHeld({ key, step: resolveStep(hash || "use", answers) })
  }
  const step =
    held?.key === key ? held.step : resolveStep(hash || "use", answers)
  const [isBackward, setBackward] = React.useState(false)

  const goTo = (next: OnboardingStep) => {
    window.location.hash = next
  }

  return {
    answers,
    step,
    isBackward,
    setAnswers: (patch: Partial<OnboardingAnswers>) =>
      writeSaved(JSON.stringify({ ...answers, ...patch })),
    goTo,
    goNext() {
      setBackward(false)
      goTo(getNextStep(step, answers))
    },
    goBack() {
      const previous = getPreviousStep(step, answers)
      if (!previous) return
      setBackward(true)
      goTo(previous)
    },
  }
}

const TEXT_INPUTS = ["text", "email", "search", "url", "tel", "password"]

function isTyping(target: EventTarget | null) {
  if (target instanceof HTMLInputElement) {
    return TEXT_INPUTS.includes(target.type)
  }
  return (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

// Enter belongs to these: it presses them.
const PRESSED_BY_ENTER =
  "button:not([role=radio]):not([role=tab]), a, [role=switch], [role=option]"

/** 1 to 9 pick an option and Enter continues, wherever focus rests. */
export function useOnboardingKeys({
  onPick,
  onContinue,
}: {
  onPick: (index: number) => void
  onContinue: () => void
}) {
  const handlers = React.useRef({ onPick, onContinue })
  React.useEffect(() => {
    handlers.current = { onPick, onContinue }
  })
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey
      if (event.defaultPrevented || hasModifier || isTyping(event.target)) {
        return
      }
      if (document.querySelector("[role=dialog], [role=listbox]")) return
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault()
        handlers.current.onPick(Number(event.key) - 1)
        return
      }
      const isPressed =
        event.target instanceof Element &&
        event.target.closest(PRESSED_BY_ENTER) !== null
      if (event.key !== "Enter" || isPressed) return
      event.preventDefault()
      handlers.current.onContinue()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
