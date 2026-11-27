"use client"

import { useId, useImperativeHandle, type Ref } from "react"
import { motion, type TargetAndTransition } from "motion/react"

import {
  isMotionOff,
  useAnimation,
  type AnimatedIconHandle,
  type AnimatedIconProps,
} from "./animated-icon.js"
import type {
  IconData,
  IconMotion,
  IconWeight,
} from "./generated/runtime/types.js"
import { renderIcon } from "./icon.js"

type Animation = { origin: string; play: TargetAndTransition }

const ease = "easeInOut"
const short: TargetAndTransition["transition"] = {
  duration: 0.36,
  times: [0, 0.4, 1],
  ease,
}

const animations: Record<IconMotion, Animation> = {
  left: { origin: "center", play: { x: [0, -2, 0], transition: short } },
  right: { origin: "center", play: { x: [0, 2, 0], transition: short } },
  up: { origin: "center", play: { y: [0, -2, 0], transition: short } },
  down: { origin: "center", play: { y: [0, 2, 0], transition: short } },
  bookmark: {
    origin: "50% 22%",
    play: {
      y: [0, 0.27, -0.12, 0],
      scaleX: [1, 1.07, 0.98, 1],
      scaleY: [1, 0.84, 1.04, 1],
      transition: { duration: 0.46, times: [0, 0.28, 0.62, 1], ease },
    },
  },
  pencil: {
    origin: "17% 83%",
    play: {
      x: [0, -0.31, 0.09, 0],
      y: [0, 0.2, -0.09, 0],
      rotate: [0, -12, 5, 0],
      transition: { duration: 0.48, times: [0, 0.35, 0.68, 1], ease },
    },
  },
  bell: {
    origin: "50% 13%",
    play: { rotate: [0, -12, 12, -7, 0], transition: { duration: 0.5, ease } },
  },
  toggle: {
    origin: "center",
    play: { scaleX: [1, 0.86, 1], transition: short },
  },
  turn: {
    origin: "center",
    play: { rotate: [0, 20, -6, 0], transition: { duration: 0.48, ease } },
  },
  open: {
    origin: "50% 78%",
    play: { scaleY: [1, 0.87, 1.03, 1], transition: { duration: 0.43, ease } },
  },
  pulse: {
    origin: "center",
    play: { scale: [1, 1.09, 0.96, 1], transition: { duration: 0.44, ease } },
  },
  mark: {
    origin: "center",
    play: { scale: [1, 0.86, 1.05, 1], transition: { duration: 0.4, ease } },
  },
  lift: {
    origin: "center",
    play: { y: [0, -1.5, 0], rotate: [0, 7, 0], transition: short },
  },
  press: { origin: "center", play: { scale: [1, 0.89, 1], transition: short } },
  scan: {
    origin: "center",
    play: { scale: [1, 1.09, 1], x: [0, 1.15, 0], transition: short },
  },
  swing: {
    origin: "27% 73%",
    play: { rotate: [0, -11, 0], transition: short },
  },
  sweep: {
    origin: "center",
    play: {
      x: [0, -1.5, 0.8, 0],
      rotate: [0, -4, 2, 0],
      transition: { duration: 0.45, ease },
    },
  },
  widen: {
    origin: "center",
    play: { scaleX: [1, 0.88, 1.04, 1], transition: { duration: 0.4, ease } },
  },
  rise: {
    origin: "50% 88%",
    play: { scaleY: [1, 0.84, 1.04, 1], transition: { duration: 0.42, ease } },
  },
  spark: {
    origin: "center",
    play: { scale: [1, 1.12, 1], opacity: [1, 0.67, 1], transition: short },
  },
  hop: {
    origin: "50% 80%",
    play: { y: [0, -2.2, 0], scaleY: [1, 1.06, 1], transition: short },
  },
  nod: {
    origin: "50% 72%",
    play: { rotate: [0, 6, -3, 0], transition: { duration: 0.42, ease } },
  },
  lean: { origin: "50% 80%", play: { rotate: [0, 8, 0], transition: short } },
  settle: {
    origin: "center",
    play: {
      scale: [1, 0.9, 1.04, 1],
      opacity: [1, 0.82, 1, 1],
      transition: { duration: 0.4, ease },
    },
  },
}

type Props = AnimatedIconProps & { ref?: Ref<AnimatedIconHandle> }

const rest = {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
}

export function AnimatedArtworkIcon({
  data,
  recipe,
  ref,
  onMouseEnter,
  ...props
}: Omit<Props, "variant"> & { data: IconData; recipe: IconMotion }) {
  const { origin, play } = animations[recipe]
  const controls = useAnimation()
  const maskId = useId()

  function startAnimation() {
    if (isMotionOff()) return
    controls.stop()
    controls.set(rest)
    void controls.start(play)
  }

  function stopAnimation() {
    controls.stop()
    controls.set(rest)
  }

  useImperativeHandle(ref, () => ({ startAnimation, stopAnimation }))

  return renderIcon(
    data,
    {
      ...props,
      onMouseEnter: (event) => {
        if (!ref) startAnimation()
        onMouseEnter?.(event)
      },
    },
    {
      maskId,
      wrapArtwork: (artwork) => (
        <motion.g
          animate={controls}
          initial={false}
          style={{ transformBox: "view-box", transformOrigin: origin }}
        >
          {artwork}
        </motion.g>
      ),
    }
  )
}

export function createAnimatedIcon(
  drawings: Record<IconWeight, IconData>,
  recipe: IconMotion
) {
  return function AnimatedIcon({ variant = "outline", ...props }: Props) {
    return (
      <AnimatedArtworkIcon
        data={drawings[variant]}
        recipe={recipe}
        {...props}
      />
    )
  }
}
