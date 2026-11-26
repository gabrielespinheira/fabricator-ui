"use client"

import * as React from "react"

const MINUTE = 60_000

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, MINUTE / 6)
  return () => window.clearInterval(timer)
}

const getMinute = () => Math.floor(Date.now() / MINUTE) * MINUTE
const getServerMinute = () => undefined

/**
 * The current minute, updated as it passes. Undefined on the server and while
 * hydrating, because the two clocks and time zones differ.
 */
export function useBoardNow(): number | undefined {
  return React.useSyncExternalStore<number | undefined>(
    subscribe,
    getMinute,
    getServerMinute
  )
}
