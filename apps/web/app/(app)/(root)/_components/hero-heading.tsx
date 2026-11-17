"use client"

import { useEffect, useState } from "react"

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
const platformReadingTime = 2_400

type HeroHeadingProps = { headline: string; prefix: string }

export function HeroHeading({ headline, prefix }: HeroHeadingProps) {
  const [rotation, setRotation] = useState(0)
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

  const currentIndex = rotation % platforms.length
  const leavingIndex = (rotation - 1) % platforms.length
  const currentState = rotation === 0 ? "current" : "entering"

  return (
    <div className="@container relative mt-4 w-full">
      <h1 className="text-[clamp(1rem,6.25cqi,3.75rem)] leading-[1.08] font-medium tracking-[-0.022em]">
        <span className="sr-only">{headline}</span>
        <span aria-hidden="true">{prefix} </span>
        <span
          aria-hidden="true"
          className="hero-platform-track inline-grid justify-items-start overflow-hidden text-start align-top text-primary-text"
        >
          {platforms.map((platform, index) => {
            const state = index === currentIndex ? currentState : undefined

            return (
              <span
                key={platform}
                data-hero-platform=""
                data-state={index === leavingIndex ? "leaving" : state}
                className="col-start-1 row-start-1"
              >
                {platform}
              </span>
            )
          })}
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
