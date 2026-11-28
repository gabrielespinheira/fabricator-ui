import type { TargetAndTransition } from "motion/react"

import type { IconDirection, IconMotion } from "./generated/runtime/types.js"

export type IconGesture = {
  play: TargetAndTransition
  origin?: string
  trace?: boolean
}

const accelerate = [0.4, 0, 0.8, 0.3] as const
const decelerate = [0.15, 0.78, 0.28, 1] as const
export const settle = [0.33, 0, 0.24, 1] as const

export function nudge(x: number, y: number, duration = 0.68): IconGesture {
  return {
    play: {
      ...(x !== 0 && { x: [0, -x * 0.22, x, 0] }),
      ...(y !== 0 && { y: [0, -y * 0.22, y, 0] }),
      transition: {
        duration,
        times: [0, 0.16, 0.51, 1],
        ease: [decelerate, settle, settle],
      },
    },
  }
}

export function traceLine(delay = 0, retreat = 0.8): IconGesture {
  return {
    trace: true,
    play: {
      strokeDasharray: ["1 2", "1 2", "1 2"],
      strokeDashoffset: [0, retreat, 0],
      transition: {
        delay,
        duration: 0.47,
        times: [0, 0.24, 1],
        ease: [decelerate, settle],
      },
      transitionEnd: { strokeDasharray: "none", strokeDashoffset: 0 },
    },
  }
}

export function revealFace(delay = 0): IconGesture {
  return {
    play: {
      opacity: [1, 0.27, 1],
      transition: {
        delay,
        duration: 0.46,
        times: [0, 0.25, 1],
        ease: [decelerate, settle],
      },
    },
  }
}

const distance = 2.55
const diagonal = distance * Math.SQRT1_2
export const directions: Record<IconDirection, [number, number]> = {
  left: [-distance, 0],
  right: [distance, 0],
  up: [0, -distance],
  down: [0, distance],
  "up-left": [-diagonal, -diagonal],
  "up-right": [diagonal, -diagonal],
  "down-left": [-diagonal, diagonal],
  "down-right": [diagonal, diagonal],
}

export const gestures = {
  "exchange-horizontal": {
    play: {
      scaleX: [1, 0.78, 1],
      transition: { duration: 0.58, ease: settle },
    },
  },
  "exchange-vertical": {
    play: {
      scaleY: [1, 0.78, 1],
      transition: { duration: 0.58, ease: settle },
    },
  },
  expand: {
    play: {
      scale: [1, 1.11, 1.09, 1],
      transition: { duration: 0.64, times: [0, 0.35, 0.53, 1], ease: settle },
    },
  },
  contract: {
    play: {
      scale: [1, 0.74, 0.76, 1],
      transition: { duration: 0.64, times: [0, 0.36, 0.57, 1], ease: settle },
    },
  },
  receive: nudge(0, 2.6),
  dispatch: nudge(0, -2.6),
  "exit-diagonal": nudge(2.25, -2.25),
  send: {
    play: {
      x: [0, -0.8, 3, 2.65, 0],
      y: [0, 0.8, -3, -2.65, 0],
      rotate: [0, -7, 5, 1, 0],
      transition: {
        duration: 0.73,
        times: [0, 0.15, 0.5, 0.62, 1],
        ease: [decelerate, accelerate, "easeOut", settle],
      },
    },
  },
  "rotate-back": {
    play: {
      rotate: [0, -360],
      transition: { duration: 0.73, ease: "easeInOut" },
    },
  },
  "rotate-forward": {
    play: {
      rotate: [0, 360],
      transition: { duration: 0.73, ease: "easeInOut" },
    },
  },
  blink: {
    play: {
      scaleY: [1, 0.08, 0.08, 1],
      transition: {
        duration: 0.47,
        times: [0, 0.32, 0.43, 1],
        ease: [accelerate, "linear", decelerate],
      },
    },
  },
  envelope: {
    origin: "50% 28%",
    play: {
      scaleY: [1, 0.81, 1.02, 1],
      transition: { duration: 0.57, times: [0, 0.38, 0.73, 1], ease: settle },
    },
  },
  shutter: {
    play: {
      scale: [1, 0.92, 1.04, 1],
      opacity: [1, 0.66, 1, 1],
      transition: { duration: 0.52, times: [0, 0.24, 0.55, 1], ease: settle },
    },
  },
  clock: {
    play: {
      rotate: [0, 42, 57, 0],
      transition: { duration: 0.76, times: [0, 0.31, 0.56, 1], ease: settle },
    },
  },
  heartbeat: {
    play: {
      scale: [1, 1.14, 1, 1.08, 1, 1],
      transition: {
        duration: 0.84,
        times: [0, 0.17, 0.34, 0.48, 0.69, 1],
        ease: "easeInOut",
      },
    },
  },
  radiate: {
    origin: "50% 78%",
    play: {
      scale: [1, 0.83, 1.1, 1],
      opacity: [1, 0.5, 1, 1],
      transition: { duration: 0.63, times: [0, 0.22, 0.56, 1], ease: settle },
    },
  },
  sound: {
    play: {
      scaleY: [1, 0.65, 1.13, 0.82, 1],
      transition: {
        duration: 0.65,
        times: [0, 0.24, 0.47, 0.7, 1],
        ease: settle,
      },
    },
  },
  shackle: {
    origin: "50% 48%",
    play: {
      y: [0, -2.2, -2, 0],
      rotate: [0, -9, -6, 0],
      transition: { duration: 0.68, times: [0, 0.39, 0.56, 1], ease: settle },
    },
  },
  check: traceLine(0, 0.95),
  drag: {
    play: {
      x: [0, -1.55, 1.8, 0],
      rotate: [0, -7, 6, 0],
      scale: [1, 0.92, 0.97, 1],
      transition: { duration: 0.61, times: [0, 0.31, 0.62, 1], ease: settle },
    },
  },
  rows: {
    play: {
      scaleX: [1, 0.76, 1.035, 1],
      transition: { duration: 0.56, times: [0, 0.32, 0.68, 1], ease: settle },
    },
  },
  bars: {
    origin: "29% 69%",
    play: {
      scaleY: [1, 0.36, 0.96, 1.07, 1],
      transition: {
        duration: 0.67,
        times: [0, 0.25, 0.53, 0.75, 1],
        ease: settle,
      },
    },
  },
  stack: {
    play: {
      y: [0, -2.1, -1.9, 0],
      rotate: [0, -6, -4, 0],
      transition: { duration: 0.66, times: [0, 0.38, 0.55, 1], ease: settle },
    },
  },
  bookmark: {
    origin: "50% 22%",
    play: {
      y: [0, 1.1, -0.4, 0],
      scaleX: [1, 1.08, 0.98, 1],
      scaleY: [1, 0.82, 1.03, 1],
      transition: { duration: 0.54, times: [0, 0.3, 0.68, 1], ease: settle },
    },
  },
  pencil: {
    origin: "19% 81%",
    play: {
      x: [0, -0.8, 1.65, 0],
      y: [0, 1.2, -0.25, 0],
      rotate: [0, -17, -13, 0],
      transition: { duration: 0.63, times: [0, 0.25, 0.64, 1], ease: settle },
    },
  },
  bell: {
    origin: "50% 20%",
    play: {
      rotate: [0, -18, 15, -9, 4, 0],
      transition: {
        duration: 0.7,
        times: [0, 0.21, 0.42, 0.6, 0.78, 1],
        ease: settle,
      },
    },
  },
  toggle: {
    play: {
      scaleX: [1, 0.84, 1],
      transition: { duration: 0.52, ease: settle },
    },
  },
  turn: {
    play: {
      rotate: [0, -8, 34, 29, 0],
      transition: {
        duration: 0.68,
        times: [0, 0.16, 0.51, 0.65, 1],
        ease: settle,
      },
    },
  },
  open: {
    origin: "50% 80%",
    play: {
      scaleY: [1, 0.72, 1.065, 1],
      rotateX: [0, -22, 5, 0],
      transition: { duration: 0.62, times: [0, 0.37, 0.71, 1], ease: settle },
    },
  },
  pulse: {
    play: {
      scale: [1, 0.91, 1.12, 1],
      transition: { duration: 0.57, times: [0, 0.23, 0.54, 1], ease: settle },
    },
  },
  mark: {
    play: {
      scale: [1, 0.78, 1.09, 1],
      transition: { duration: 0.48, times: [0, 0.27, 0.58, 1], ease: settle },
    },
  },
  lift: {
    play: {
      y: [0, 0.6, -2.4, 0],
      rotate: [0, -3, 6, 0],
      transition: { duration: 0.6, times: [0, 0.18, 0.51, 1], ease: settle },
    },
  },
  press: {
    play: {
      scale: [1, 0.86, 1.04, 1],
      transition: { duration: 0.49, times: [0, 0.29, 0.62, 1], ease: settle },
    },
  },
  scan: {
    origin: "44% 44%",
    play: {
      scale: [1, 1.075, 1.075, 1],
      x: [0, -1.3, 1.3, 0],
      y: [0, -0.7, 0.5, 0],
      transition: { duration: 0.73, times: [0, 0.29, 0.62, 1], ease: settle },
    },
  },
  swing: {
    origin: "28% 72%",
    play: {
      rotate: [0, 14, -19, -15, 0],
      transition: {
        duration: 0.64,
        times: [0, 0.26, 0.48, 0.58, 1],
        ease: settle,
      },
    },
  },
  sweep: {
    play: {
      x: [0, -1.65, 1.5, 0],
      y: [0, -0.7, -0.4, 0],
      rotate: [0, -7, 5, 0],
      transition: { duration: 0.72, times: [0, 0.34, 0.64, 1], ease: settle },
    },
  },
  widen: {
    play: {
      scaleX: [1, 0.8, 1.07, 1],
      transition: { duration: 0.55, times: [0, 0.37, 0.69, 1], ease: settle },
    },
  },
  rise: {
    origin: "50% 87%",
    play: {
      scaleY: [1, 0.73, 1.08, 1],
      transition: { duration: 0.65, times: [0, 0.27, 0.65, 1], ease: settle },
    },
  },
  spark: {
    play: {
      scale: [1, 0.89, 1.14, 1],
      rotate: [0, -8, 7, 0],
      opacity: [1, 0.66, 1, 1],
      transition: { duration: 0.6, times: [0, 0.25, 0.54, 1], ease: settle },
    },
  },
  hop: {
    origin: "50% 79%",
    play: {
      y: [0, 0.4, -2.65, 0, 0],
      scaleY: [1, 0.88, 1.03, 0.93, 1],
      transition: {
        duration: 0.65,
        times: [0, 0.17, 0.43, 0.75, 1],
        ease: [decelerate, "easeOut", "easeIn", decelerate],
      },
    },
  },
  nod: {
    origin: "50% 76%",
    play: {
      rotate: [0, 10, -4, 0],
      y: [0, 0.5, 0, 0],
      transition: { duration: 0.56, times: [0, 0.36, 0.68, 1], ease: settle },
    },
  },
  lean: {
    origin: "50% 79%",
    play: {
      rotate: [0, 12, 10, 0],
      transition: { duration: 0.56, times: [0, 0.36, 0.55, 1], ease: settle },
    },
  },
} satisfies Record<
  Exclude<
    IconMotion,
    IconDirection | "sidebar-toggle" | "panel-left" | "panel-right" | "settle"
  >,
  IconGesture
>
