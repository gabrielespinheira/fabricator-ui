"use client"

import * as React from "react"

import { hasLeftDragThreshold } from "@/registry/bases/__base__/lib/slider-model"

/**
 * Whether the pointer is dragging a slider, as opposed to pressing it. The
 * primitives flag a drag from the first press, so a click on the track would
 * skip the glide to its value; this only turns true once the pointer travels.
 */
export function useSliderDrag() {
  const [isDragging, setIsDragging] = React.useState(false)
  const stopListening = React.useRef<() => void>(undefined)

  React.useEffect(() => () => stopListening.current?.(), [])

  const onPointerDown = React.useCallback((event: React.PointerEvent) => {
    const start = { x: event.clientX, y: event.clientY }
    const move = (moved: PointerEvent) => {
      if (!hasLeftDragThreshold(start, { x: moved.clientX, y: moved.clientY }))
        return
      setIsDragging(true)
      window.removeEventListener("pointermove", move)
    }
    const end = () => {
      setIsDragging(false)
      remove()
    }
    const remove = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
    }
    stopListening.current?.()
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
    stopListening.current = remove
  }, [])

  return { isDragging, onPointerDown }
}
