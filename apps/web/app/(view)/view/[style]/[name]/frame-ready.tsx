"use client"

import * as React from "react"

import { FRAME_READY_MESSAGE } from "@/lib/frame-preview-model"

/**
 * Tells the page around a preview frame that this one has hydrated and laid
 * out, so its loading placeholder can fade (FramePreview). It runs after the
 * preview's own effects, a frame later, once the App Shell has restored its
 * layout.
 */
export function FrameReady() {
  React.useEffect(() => {
    if (window.parent === window) return
    const frame = window.requestAnimationFrame(() =>
      window.parent.postMessage(
        { type: FRAME_READY_MESSAGE },
        window.location.origin
      )
    )
    return () => window.cancelAnimationFrame(frame)
  }, [])
  return null
}
