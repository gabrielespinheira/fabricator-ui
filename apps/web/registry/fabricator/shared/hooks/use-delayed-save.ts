"use client"

// One save for a run of changes: a stepper held down, a colour dragged. It
// waits for the run to end, and never loses the last change to leaving.
import * as React from "react"

const SAVE_DELAY = 300

function useDelayedSave<Value>(onSave: (value: Value) => void) {
  const save = React.useRef(onSave)
  const pending = React.useRef<(() => void) | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => {
    save.current = onSave
  })
  function cancel() {
    clearTimeout(timer.current)
    pending.current = null
  }
  function flush() {
    const run = pending.current
    cancel()
    run?.()
  }
  React.useEffect(
    () => () => {
      clearTimeout(timer.current)
      pending.current?.()
    },
    []
  )
  return {
    cancel,
    /** Saves what is waiting, now. */
    flush,
    schedule: (value: Value) => {
      cancel()
      pending.current = () => save.current(value)
      timer.current = setTimeout(flush, SAVE_DELAY)
    },
  }
}

export { useDelayedSave }
