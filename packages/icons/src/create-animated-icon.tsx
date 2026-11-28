"use client"

import {
  cloneElement,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SVGProps,
} from "react"
import { motion, useAnimation } from "motion/react"

import type { IconGesture } from "./animated-gestures.js"
import type { AnimatedIconHandle, AnimatedIconProps } from "./animated-icon.js"
import { AnimatedPanelArtwork } from "./animated-panel.js"
import {
  getAnimatedDrawing,
  getIconGestures,
  type PanelRecipe,
} from "./animated-recipes.js"
import type {
  IconData,
  IconMotion,
  IconWeight,
} from "./generated/runtime/types.js"
import { renderIcon } from "./icon.js"
import { isMotionOff } from "./motion-preference.js"
import type { AnimatedPanelIconProps } from "./panel-motion.js"
import { SidebarToggleIcon } from "./sidebar-toggle.js"

type Props = AnimatedIconProps & { ref?: Ref<AnimatedIconHandle> }

const rest = {
  x: 0,
  y: 0,
  rotate: 0,
  rotateX: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
}

function MorphingPath({
  shape,
  controls,
  gesture,
}: {
  shape: ReactElement<SVGProps<SVGElement>>
  controls: ReturnType<typeof useAnimation>
  gesture: IconGesture
}) {
  const { d, fill, fillRule, stroke, strokeWidth, style, vectorEffect } =
    shape.props
  return (
    <motion.path
      d={d}
      fill={fill}
      fillRule={fillRule}
      stroke={stroke}
      strokeWidth={strokeWidth}
      style={style}
      vectorEffect={vectorEffect}
      animate={controls}
      initial={false}
      variants={{ play: gesture.play, rest: { d, opacity: 1 } }}
    />
  )
}

function MovingPart({
  controls,
  gesture,
  children,
}: {
  controls: ReturnType<typeof useAnimation>
  gesture: IconGesture
  children: ReactNode
}) {
  return (
    <motion.g
      animate={controls}
      initial={false}
      variants={{
        play: gesture.play,
        rest: gesture.trace
          ? { ...rest, strokeDasharray: "none", strokeDashoffset: 0 }
          : rest,
      }}
      style={{
        transformBox: "view-box",
        transformOrigin: gesture.origin ?? "50% 50%",
      }}
    >
      {children}
    </motion.g>
  )
}

type ArtworkProps = Omit<AnimatedPanelIconProps, "variant"> & {
  data: IconData
  recipe: IconMotion
}

export function AnimatedArtworkIcon({
  data,
  recipe,
  open,
  ...props
}: ArtworkProps) {
  if (recipe === "sidebar-toggle") {
    const variant =
      data.paint === "fill" ? "fill" : data.secondary ? "duotone" : "outline"
    return <SidebarToggleIcon variant={variant} open={open} {...props} />
  }
  if (recipe === "panel-left" || recipe === "panel-right") {
    return (
      <AnimatedPanelArtwork
        data={data}
        side={recipe === "panel-left" ? "left" : "right"}
        open={open}
        {...props}
      />
    )
  }
  return <HoverArtworkIcon data={data} recipe={recipe} {...props} />
}

function HoverArtworkIcon({
  data,
  recipe,
  ref,
  loop,
  onMouseEnter,
  onMouseLeave,
  ...props
}: Omit<ArtworkProps, "recipe" | "open"> & {
  recipe: Exclude<IconMotion, PanelRecipe>
}) {
  const controls = useAnimation()
  const svg = useRef<SVGSVGElement>(null)
  const run = useRef(0)
  const isPlaying = useRef(false)
  const shouldRepeat = useRef(false)
  const maskId = useId()
  const drawing = useMemo(() => getAnimatedDrawing(data), [data])
  const { whole, parts } = useMemo(
    () => getIconGestures(drawing, recipe),
    [drawing, recipe]
  )

  function startAnimation() {
    if (isMotionOff(svg.current)) return
    shouldRepeat.current = Boolean(loop)
    if (isPlaying.current) return
    isPlaying.current = true
    const playback = ++run.current
    controls.set("rest")
    function play() {
      void controls.start("play").then(() => {
        if (playback !== run.current) return
        if (shouldRepeat.current && !isMotionOff(svg.current)) play()
        else isPlaying.current = false
      })
    }
    play()
  }

  function stopAnimation() {
    run.current++
    isPlaying.current = false
    shouldRepeat.current = false
    controls.stop()
    controls.set("rest")
  }

  useImperativeHandle(ref, () => ({ startAnimation, stopAnimation }))
  useEffect(() => {
    if (!loop) shouldRepeat.current = false
  }, [loop])
  useEffect(
    () => () => {
      run.current++
      isPlaying.current = false
      shouldRepeat.current = false
      controls.stop()
    },
    [controls]
  )

  return renderIcon(
    drawing,
    {
      ...props,
      ref: svg,
      onMouseEnter(event) {
        if (!ref) startAnimation()
        onMouseEnter?.(event)
      },
      onMouseLeave(event) {
        if (!ref) shouldRepeat.current = false
        onMouseLeave?.(event)
      },
    },
    {
      maskId,
      allowOverflow: true,
      wrapArtwork: whole
        ? (artwork) => (
            <MovingPart controls={controls} gesture={whole}>
              {artwork}
            </MovingPart>
          )
        : undefined,
      wrapShape: parts
        ? (shape, layer, index) => {
            const gesture = parts(layer, index)
            if (!gesture) return shape
            if (gesture.play.d && shape.type === "path") {
              return (
                <MorphingPath
                  key={shape.key}
                  shape={shape}
                  controls={controls}
                  gesture={gesture}
                />
              )
            }
            return (
              <MovingPart key={shape.key} controls={controls} gesture={gesture}>
                {gesture.trace ? cloneElement(shape, { pathLength: 1 }) : shape}
              </MovingPart>
            )
          }
        : undefined,
    }
  )
}

export function createAnimatedIcon(
  drawings: Record<IconWeight, IconData>,
  recipe: Exclude<IconMotion, PanelRecipe>
) {
  return function AnimatedIcon({ variant = "outline", ...props }: Props) {
    return (
      <HoverArtworkIcon data={drawings[variant]} recipe={recipe} {...props} />
    )
  }
}
