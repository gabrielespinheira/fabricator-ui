"use client"

import * as React from "react"

// A full-page demo in an iframe. Previews break out of the docs prose (see
// app/fabricator-site.css), so on a desktop the page renders at full size.
// Between `scaleFrom` and `minWidth` it renders at `minWidth` and is scaled
// down to fit, so app shells (Sidebar) keep their desktop layout; narrower
// than `scaleFrom` (a phone) it renders as is and shows the mobile layout.
export function FramePreview({
  src,
  title,
  minWidth = 820,
  scaleFrom = 560,
}: {
  src: string
  title: string
  minWidth?: number
  scaleFrom?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setScale(width < scaleFrom ? 1 : Math.min(1, width / minWidth))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [minWidth, scaleFrom])

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
