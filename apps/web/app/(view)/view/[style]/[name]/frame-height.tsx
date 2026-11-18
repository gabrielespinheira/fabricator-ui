"use client"

import * as React from "react"

import { FRAME_HEIGHT_MESSAGE } from "@/components/fabricator/frame-preview"

/**
 * In a docs frame that fits its content (FramePreview fit), tells the page
 * around it how tall the demo is, whenever that changes.
 */
export function FrameHeight() {
  React.useEffect(() => {
    if (window.parent === window) return
    const content = document.querySelector<HTMLElement>(
      '[data-slot="view-preview"]'
    )
    if (!content) return
    const report = () =>
      window.parent.postMessage(
        { type: FRAME_HEIGHT_MESSAGE, height: content.offsetHeight },
        window.location.origin
      )
    const observer = new ResizeObserver(report)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])
  return null
}
