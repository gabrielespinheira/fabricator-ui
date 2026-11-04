"use client"

import * as React from "react"
import type { AnimatedIconHandle } from "@fabricator-ui/icons/animated"
import type * as Animated from "@fabricator-ui/icons/animated"

export type AnimatedComponent = typeof Animated.BellIcon

/** The animated icons by export name, which load only once their tab opens. */
export type AnimatedComponents = Map<string, AnimatedComponent>

export function useAnimatedComponents(isNeeded: boolean) {
  const [components, setComponents] = React.useState<AnimatedComponents | null>(
    null
  )
  React.useEffect(() => {
    if (!isNeeded || components) return
    let isCurrent = true
    void import("@fabricator-ui/icons/animated").then((module) => {
      if (!isCurrent) return
      const icons = Object.entries(module).filter(
        (entry): entry is [string, AnimatedComponent] => entry[0] !== "default"
      )
      setComponents(new Map(icons))
    })
    return () => {
      isCurrent = false
    }
  }, [isNeeded, components])
  return components
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
}: {
  component: AnimatedComponent
  isPlaying: boolean
  size: number
  strokeWidth: number
}) {
  const handle = React.useRef<AnimatedIconHandle>(null)
  const wasPlaying = React.useRef(false)
  React.useEffect(() => {
    if (isPlaying === wasPlaying.current) return
    wasPlaying.current = isPlaying
    if (isPlaying) handle.current?.startAnimation()
    else handle.current?.stopAnimation()
  }, [isPlaying])
  return <Component ref={handle} size={size} strokeWidth={strokeWidth} />
}
