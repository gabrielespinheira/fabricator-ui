"use client"

// Morph Island: one pill that morphs between live activities: a timer, an
// upload, a call. Every state stays mounted; the island takes the size of
// the current one on springs (morph-island-model), so a change lands
// sideways first, drops into place and keeps its volume, while the contents
// cross-fade through a blur. A change or a press gives it a small squash.
// It is a status region, so screen readers hear what it changes to; states
// that aren't showing are inert.
import * as React from "react"
import { cn } from "cn"

import {
  getIslandFrame,
  getIslandHeightSpring,
  isIslandGrowing,
  MORPH_ISLAND_SPRINGS,
  PRESS_KICK,
  PRESS_SCALE,
  SPEED_REFERENCE_STIFFNESS,
  type IslandSize,
} from "@/registry/bases/__base__/lib/morph-island-model"
import {
  isSpringAtRest,
  resolveSpring,
  retimeSpring,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from "@/registry/bases/__base__/lib/spring-model"

const MorphIslandContext = React.createContext<string | undefined>(undefined)

const ACTIVE_CONTENT = '[data-slot="morph-island-content"][data-active]'

// How much faster or slower the page plays springs than the default speed;
// null jumps (motion off, Reduce Motion).
function readTimeScale(element: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null
  const style = getComputedStyle(element)
  const settle = resolveSpring(
    style.getPropertyValue("--motion-spring-settle"),
    style.getPropertyValue("--motion-scale")
  )
  return settle ? Math.sqrt(SPEED_REFERENCE_STIFFNESS / settle.stiffness) : null
}

type Motion = {
  width: SpringState
  height: SpringState
  press: SpringState
  target: IslandSize
  pressTarget: number
  springs: { width: SpringConfig; height: SpringConfig; press: SpringConfig }
}

function MorphIsland({
  value,
  className,
  children,
  onPointerDown,
  ...props
}: React.ComponentProps<"div"> & {
  /** Which MorphIslandContent shows. */
  value: string
}) {
  const island = React.useRef<HTMLDivElement | null>(null)
  const motion = React.useRef<Motion | null>(null)
  const frame = React.useRef<number | null>(null)
  const lastTime = React.useRef(0)

  const draw = React.useCallback(() => {
    const element = island.current
    const current = motion.current
    if (!element || !current) return
    const maxRadius =
      Number.parseFloat(
        getComputedStyle(element).getPropertyValue("--morph-island-radius")
      ) || 32
    const box = getIslandFrame(
      {
        width: current.width.value,
        height: current.height.value,
        heightVelocity: current.height.velocity,
      },
      maxRadius
    )
    element.style.width = `${box.width}px`
    element.style.height = `${box.height}px`
    element.style.borderRadius = `${box.radius}px`
    element.style.scale = String(Math.round(current.press.value * 1000) / 1000)
  }, [])

  const run = React.useCallback(() => {
    if (frame.current !== null) return
    const tick = (time: number) => {
      const current = motion.current
      if (!current) return
      const elapsed = (time - lastTime.current) / 1000
      lastTime.current = time
      current.width = stepSpring(
        current.width,
        current.target.width,
        current.springs.width,
        elapsed
      )
      current.height = stepSpring(
        current.height,
        current.target.height,
        current.springs.height,
        elapsed
      )
      current.press = stepSpring(
        current.press,
        current.pressTarget,
        current.springs.press,
        elapsed
      )
      const isAtRest =
        isSpringAtRest(current.width, current.target.width) &&
        isSpringAtRest(current.height, current.target.height) &&
        isSpringAtRest(current.press, current.pressTarget)
      if (isAtRest) {
        current.width = { value: current.target.width, velocity: 0 }
        current.height = { value: current.target.height, velocity: 0 }
        current.press = { value: current.pressTarget, velocity: 0 }
        frame.current = null
      } else {
        frame.current = requestAnimationFrame(tick)
      }
      draw()
    }
    lastTime.current = performance.now()
    frame.current = requestAnimationFrame(tick)
  }, [draw])

  // Takes the current content's size: at once the first time, on the
  // springs after that.
  const morphTo = React.useCallback(
    (isNewState: boolean) => {
      const element = island.current
      const content = element?.querySelector<HTMLElement>(ACTIVE_CONTENT)
      if (!element || !content) return
      const target = {
        width: content.offsetWidth,
        height: content.offsetHeight,
      }
      const timeScale = readTimeScale(element)
      const current = motion.current
      if (!current || timeScale === null) {
        if (frame.current !== null) cancelAnimationFrame(frame.current)
        frame.current = null
        motion.current = {
          width: { value: target.width, velocity: 0 },
          height: { value: target.height, velocity: 0 },
          press: { value: 1, velocity: 0 },
          target,
          pressTarget: 1,
          springs: {
            width: MORPH_ISLAND_SPRINGS.width,
            height: MORPH_ISLAND_SPRINGS.height,
            press: MORPH_ISLAND_SPRINGS.press,
          },
        }
        draw()
        return
      }
      const isSameSize =
        target.width === current.target.width &&
        target.height === current.target.height
      if (isSameSize && !isNewState) return
      const isGrowing = isIslandGrowing(current.target, target)
      current.springs = {
        width: retimeSpring(MORPH_ISLAND_SPRINGS.width, timeScale),
        height: retimeSpring(getIslandHeightSpring(isGrowing), timeScale),
        press: retimeSpring(MORPH_ISLAND_SPRINGS.press, timeScale),
      }
      if (isNewState) {
        current.press.velocity += isSameSize
          ? PRESS_KICK.same
          : isGrowing
            ? PRESS_KICK.grow
            : PRESS_KICK.shrink
      }
      current.target = target
      run()
    },
    [draw, run]
  )

  React.useLayoutEffect(() => {
    morphTo(true)
  }, [value, morphTo])

  // A state's content can change size while it shows (a longer name, a
  // count that grows): the island follows.
  React.useEffect(() => {
    const element = island.current
    if (!element) return
    const observer = new ResizeObserver(() => morphTo(false))
    for (const content of element.querySelectorAll(
      '[data-slot="morph-island-content"]'
    ))
      observer.observe(content)
    return () => observer.disconnect()
  }, [morphTo])

  React.useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    []
  )

  const press = (isDown: boolean) => {
    const current = motion.current
    if (!current || !island.current || readTimeScale(island.current) === null)
      return
    current.pressTarget = isDown ? PRESS_SCALE : 1
    run()
  }

  return (
    <MorphIslandContext.Provider value={value}>
      <div
        ref={island}
        data-slot="morph-island"
        data-value={value}
        role="status"
        aria-live="polite"
        className={cn(
          "cn-morph-island relative shrink-0 overflow-hidden",
          className
        )}
        onPointerDown={(event) => {
          onPointerDown?.(event)
          press(true)
          const release = () => {
            press(false)
            window.removeEventListener("pointerup", release)
            window.removeEventListener("pointercancel", release)
          }
          window.addEventListener("pointerup", release)
          window.addEventListener("pointercancel", release)
        }}
        {...props}
      >
        {children}
      </div>
    </MorphIslandContext.Provider>
  )
}

/** One state of the island, shown while the island's `value` is its own. */
function MorphIslandContent({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  value: string
}) {
  const isActive = React.useContext(MorphIslandContext) === value
  return (
    <div
      data-slot="morph-island-content"
      data-value={value}
      data-active={isActive ? "" : undefined}
      aria-hidden={!isActive}
      inert={!isActive}
      className={cn(
        "cn-morph-island-content absolute top-1/2 left-1/2 flex w-max items-center",
        className
      )}
      {...props}
    />
  )
}

export { MorphIsland, MorphIslandContent }
