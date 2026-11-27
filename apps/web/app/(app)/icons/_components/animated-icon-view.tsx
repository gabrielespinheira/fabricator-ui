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
 * Plays while `isPlaying`. A ref takes the icon off its own hover, so a whole
 * cell can be the target, and the keyboard can reach it.
 */
export function AnimatedIconView({
  component: Component,
  isPlaying,
  size,
  strokeWidth,
  data,
  recipe,
}: {
  component: AnimatedRenderer
  isPlaying: boolean
  size: number
  strokeWidth: number
} & Pick<React.ComponentProps<AnimatedRenderer>, "data" | "recipe">) {
  const handle = React.useRef<AnimatedIconHandle>(null)
  const wasPlaying = React.useRef(false)
  React.useEffect(() => {
    if (isPlaying === wasPlaying.current) return
    wasPlaying.current = isPlaying
    if (isPlaying) handle.current?.startAnimation()
    else handle.current?.stopAnimation()
  }, [isPlaying])
  return (
    <Component
      data={data}
      recipe={recipe}
      ref={handle}
      size={size}
      strokeWidth={strokeWidth}
    />
  )
}
