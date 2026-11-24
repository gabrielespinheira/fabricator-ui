"use client"

import * as React from "react"

import { ONBOARDING_FAILING_SOURCES } from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-data"

export type OnboardingSourceState =
  | "off"
  | "connecting"
  | "connected"
  | "failed"

// Swap the timer for your provider's consent window.
const CONNECT_TIME = 1100

/** Connecting takes a moment and can fail, per source. */
export function useOnboardingSources(
  connected: string[],
  onConnectedChange: (connected: string[]) => void
) {
  const [pending, setPending] = React.useState<string[]>([])
  const [failed, setFailed] = React.useState<string[]>([])
  const timers = React.useRef(new Set<ReturnType<typeof setTimeout>>())
  const latest = React.useRef({ connected, onConnectedChange })

  React.useEffect(() => {
    latest.current = { connected, onConnectedChange }
  })
  React.useEffect(() => {
    const running = timers.current
    return () => running.forEach((timer) => clearTimeout(timer))
  }, [])

  const getState = (id: string): OnboardingSourceState => {
    if (connected.includes(id)) return "connected"
    if (pending.includes(id)) return "connecting"
    return failed.includes(id) ? "failed" : "off"
  }

  const connect = (id: string) => {
    const isRetry = failed.includes(id)
    setFailed((current) => current.filter((other) => other !== id))
    setPending((current) => [...current, id])
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      setPending((current) => current.filter((other) => other !== id))
      if (ONBOARDING_FAILING_SOURCES.includes(id) && !isRetry) {
        setFailed((current) => [...current, id])
        return
      }
      latest.current.onConnectedChange([...latest.current.connected, id])
    }, CONNECT_TIME)
    timers.current.add(timer)
  }

  const toggle = (id: string) => {
    const state = getState(id)
    if (state === "connecting") return
    if (state === "connected") {
      onConnectedChange(connected.filter((other) => other !== id))
      return
    }
    connect(id)
  }

  return { getState, toggle }
}
