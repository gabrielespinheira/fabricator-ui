"use client"

import * as React from "react"

/** Sent by a demo in a fitted frame (FrameHeight) with its height. */
export const FRAME_HEIGHT_MESSAGE = "fabricator-frame-height"

const isFrameHeight = (data: unknown): data is { height: number } =>
  typeof data === "object" &&
  data !== null &&
  "type" in data &&
  data.type === FRAME_HEIGHT_MESSAGE &&
  "height" in data &&
  typeof data.height === "number"

// Until a fitted demo reports its height.
const FIT_FALLBACK_HEIGHT = 900

// A full-page demo in an iframe. Previews break out of the docs prose (see
// app/fabricator-site.css), so on a desktop the page renders at full size.
// Between `scaleFrom` and `minWidth` it renders at `minWidth` and is scaled
// down to fit, so app shells (Sidebar) keep their desktop layout; narrower
// than `scaleFrom` (a phone) it renders as is and shows the mobile layout.
//
// `fit` is for a responsive demo that needs a document of its own, as the
// Event Calendar does: every insert in the docs page restyles all of it, a
// frame restyles only the demo. It renders at the frame's width, unscaled,
// as tall as the demo says it is.
export function FramePreview({
  src,
  title,
  minWidth = 820,
  scaleFrom = 560,
  fit = false,
}: {
  src: string
  title: string
  minWidth?: number
  scaleFrom?: number
  fit?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const frameRef = React.useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = React.useState(1)
  const [height, setHeight] = React.useState<number>()

  React.useEffect(() => {
    if (!fit) return
    const handleMessage = (message: MessageEvent) => {
      if (message.origin !== window.location.origin) return
      if (message.source !== frameRef.current?.contentWindow) return
      const data: unknown = message.data
      if (isFrameHeight(data)) setHeight(data.height)
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [fit])

  React.useEffect(() => {
    const element = ref.current
    if (!element || fit) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setScale(width < scaleFrom ? 1 : Math.min(1, width / minWidth))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [fit, minWidth, scaleFrom])

  if (fit) {
    return (
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        loading="lazy"
        className="block w-full bg-background"
        style={{ height: height ?? FIT_FALLBACK_HEIGHT }}
      />
    )
  }

  return (
    <div ref={ref} className="relative size-full overflow-hidden">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        className="absolute top-0 left-0 origin-top-left bg-background"
        style={{
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          transform: scale < 1 ? `scale(${scale})` : undefined,
        }}
      />
    </div>
  )
}
