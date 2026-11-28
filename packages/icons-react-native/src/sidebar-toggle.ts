import { createElement, Fragment, useEffect } from "react"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type WithTimingConfig,
} from "react-native-reanimated"
import { G, Path } from "react-native-svg"

import { useIconDefaults } from "./context.js"
import { hasA11yProp, UI_STROKE_WIDTH } from "./generated/runtime/attributes.js"
import {
  getSidebarToggleDivider,
  getSidebarToggleFill,
  getSidebarTogglePanel,
  SIDEBAR_TOGGLE_DURATION,
  SIDEBAR_TOGGLE_EASING,
  SIDEBAR_TOGGLE_FRAME,
  SIDEBAR_TOGGLE_NAME,
} from "./generated/runtime/sidebar-toggle.js"
import type { IconWeight } from "./generated/runtime/types.js"
import { renderIcon, type IconProps } from "./icon.js"

export type SidebarToggleIconProps = IconProps & {
  open?: boolean
  side?: "left" | "right"
  variant?: IconWeight
  duration?: number
  easing?: WithTimingConfig["easing"]
}

const AnimatedPath = Animated.createAnimatedComponent(Path)
const defaultEasing = Easing.bezier(...SIDEBAR_TOGGLE_EASING)

export function SidebarToggleIcon({
  open = false,
  side = "left",
  variant = "outline",
  duration = SIDEBAR_TOGGLE_DURATION,
  easing = defaultEasing,
  secondaryColor,
  secondaryOpacity = 0.2,
  children,
  ...props
}: SidebarToggleIconProps) {
  const defaults = useIconDefaults()
  const progress = useSharedValue(Number(open))
  useEffect(() => {
    progress.set(
      withTiming(Number(open), {
        duration,
        easing,
        reduceMotion: ReduceMotion.System,
      })
    )
  }, [open, duration, easing, progress])

  const isFilled = variant === "fill"
  const outline = useAnimatedProps(() => ({
    d: isFilled
      ? getSidebarToggleFill(progress.get())
      : getSidebarToggleDivider(progress.get()),
  }))
  const tone = useAnimatedProps(() => ({
    d: getSidebarTogglePanel(progress.get()),
  }))
  const color = props.color ?? defaults.foreground

  const artwork = createElement(
    G,
    { transform: side === "right" ? "translate(24 0) scale(-1 1)" : undefined },
    variant === "duotone"
      ? createElement(AnimatedPath, {
          animatedProps: tone,
          fill: secondaryColor ?? color,
          fillOpacity: secondaryOpacity,
          stroke: "none",
        })
      : null,
    createElement(AnimatedPath, {
      animatedProps: outline,
      ...(isFilled && { fill: color, fillRule: "evenodd", stroke: "none" }),
    }),
    createElement(Path, { d: SIDEBAR_TOGGLE_FRAME })
  )

  return renderIcon(
    { name: SIDEBAR_TOGGLE_NAME, node: [], strokeWidth: UI_STROKE_WIDTH },
    {
      ...(!children && !hasA11yProp(props) && { "aria-hidden": true }),
      ...props,
      children: createElement(Fragment, null, artwork, children),
    },
    defaults
  )
}
