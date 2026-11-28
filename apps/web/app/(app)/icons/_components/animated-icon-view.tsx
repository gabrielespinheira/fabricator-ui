"use client"

import * as React from "react"
import type { AnimatedIconHandle } from "@fabricator-ui/icons/animated"
import type { AnimatedArtworkIcon } from "@fabricator-ui/icons/animated/preview"

export type AnimatedRenderer = typeof AnimatedArtworkIcon

export function useAnimatedRenderer(isNeeded: boolean) {
  const [renderer, setRenderer] = React.useState<AnimatedRenderer | null>(null)
  React.useEffect(() => {
    if (!isNeeded || renderer) return
    let isCurrent = true
    void import("@fabricator-ui/icons/animated/preview").then((module) => {
      if (isCurrent) setRenderer(() => module.AnimatedArtworkIcon)
    })
    return () => {
      isCurrent = false
    }
  }, [isNeeded, renderer])
  return renderer
}

/**
 * Starts when `isPlaying` turns on. A ref takes the icon off its own hover, so a whole
 * cell can be the target, and the keyboard can reach it.
 */
export function AnimatedIconView({
  component: Component,
  isPlaying,
  size,
  strokeWidth,
  data,
  recipe,
  playCount = 0,
  loop = false,
  open,
}: {
  component: AnimatedRenderer
  isPlaying: boolean
  size: number
  strokeWidth: number
  playCount?: number
} & Pick<
  React.ComponentProps<AnimatedRenderer>,
  "data" | "recipe" | "loop" | "open"
>) {
  const handle = React.useRef<AnimatedIconHandle>(null)
  const lastPlayCount = React.useRef(0)
  const wasLooping = React.useRef(false)
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const isReplay = lastPlayCount.current !== playCount
      if (isPlaying || isReplay) handle.current?.startAnimation()
      else if (wasLooping.current && loop) handle.current?.stopAnimation()
      wasLooping.current = isPlaying && loop
      lastPlayCount.current = playCount
    })
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, loop, playCount])
  return (
    <Component
      data={data}
      recipe={recipe}
      ref={handle}
      size={size}
      strokeWidth={strokeWidth}
      loop={loop}
      open={open}
    />
  )
}
