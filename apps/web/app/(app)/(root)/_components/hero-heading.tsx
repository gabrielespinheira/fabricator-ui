"use client"

import { useEffect, useRef, useState } from "react"

import { useSiteSettings } from "@/lib/site-settings"
import { useMediaQuery } from "@/hooks/use-media-query"

const platforms = [
  "your apps",
  "web",
  "mobile",
  "desktop",
  "iPadOS",
  "iOS",
  "macOS",
  "Linux",
  "Windows",
  "Android",
]
const platformReadingTime = 2_600

type HeroHeadingProps = { headline: string; prefix: string }

export function HeroHeading({ headline, prefix }: HeroHeadingProps) {
  const [rotation, setRotation] = useState(0)
  const [platformWidth, setPlatformWidth] = useState<number>()
  const currentPlatformRef = useRef<HTMLSpanElement>(null)
  const { motion } = useSiteSettings()
  const shouldAnimate = useMediaQuery("(prefers-reduced-motion: no-preference)")
  const canRotate = shouldAnimate && motion !== "off"

  useEffect(() => {
    if (!canRotate) return

    const timer = window.setInterval(() => {
      if (!document.hidden) setRotation((previous) => previous + 1)
    }, platformReadingTime)

    return () => window.clearInterval(timer)
  }, [canRotate])

  // The slot takes the current word's width, so the centred line stays
  // centred and the prefix glides instead of sitting beside empty space.
  // Observing also catches font loading and the container-sized font.
  useEffect(() => {
    const currentPlatform = currentPlatformRef.current
    if (!currentPlatform) return

    const observer = new ResizeObserver(([entry]) => {
      setPlatformWidth(entry.borderBoxSize[0].inlineSize)
    })
    observer.observe(currentPlatform)

    return () => observer.disconnect()
  }, [rotation])

  const currentIndex = rotation % platforms.length
  const leavingIndex =
    rotation === 0 ? undefined : (rotation - 1) % platforms.length

  return (
    <div className="@container relative mt-4 w-full">
      <h1 className="text-[clamp(1rem,6.25cqi,3.75rem)] leading-[1.08] font-medium tracking-[-0.022em]">
        <span className="sr-only">{headline}</span>
        <span aria-hidden="true">{prefix} </span>
        <span
          aria-hidden="true"
          className="hero-platform-track relative inline-block text-start whitespace-nowrap text-primary-text"
          style={{ width: platformWidth }}
        >
          {leavingIndex === undefined ? null : (
            <span
              key={`leaving-${rotation}`}
              data-hero-platform=""
              data-state="leaving"
              className="absolute start-0 top-0 inline-block"
            >
              {platforms[leavingIndex]}
            </span>
          )}
          <span
            key={`current-${rotation}`}
            ref={currentPlatformRef}
            data-hero-platform=""
            data-state={rotation === 0 ? "current" : "entering"}
            className="inline-block"
          >
            {platforms[currentIndex]}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="hero-platform-fallback hidden text-primary-text"
        >
          all your apps
        </span>
      </h1>
    </div>
  )
}
