import * as React from "react"
import { Animated, Easing } from "react-native"
import Svg, { Path } from "react-native-svg"

import {
  getToggleGlyphPanel,
  TOGGLE_GLYPH,
  TOGGLE_GLYPH_SCALE,
} from "@/registry/fabricator/shared/lib/sidebar-model"

import { useReducedMotion, useTheme } from "../theme"

const MIRRORED = { transform: [{ scaleX: -1 }] }

/**
 * The website's toggle glyph: the sidebar inside its frame widens as it opens,
 * on the look's move timing. Sized like the website's, by the compact density
 * its `size="icon-sm"` button pins.
 */
export function SidebarToggleIcon({
  isOpen,
  side = "left",
  color,
  background,
}: {
  isOpen: boolean
  /** The edge it stands for: the panel's toggle mirrors the sidebar's. */
  side?: "left" | "right"
  /** Defaults to muted text; on the frame, the frame's muted text. */
  color?: string
  /** What the icon sits on: the sidebar's shape is cut out in this colour. */
  background: string
}) {
  const theme = useTheme()
  const { moveMs, moveEasing } = theme.motion
  const reduceMotion = useReducedMotion()
  const size = theme.compact.icon[16] * TOGGLE_GLYPH_SCALE
  const fill = color ?? theme.colors.muted
  const progress = React.useRef(new Animated.Value(isOpen ? 1 : 0)).current
  const [panel, setPanel] = React.useState(() =>
    getToggleGlyphPanel(isOpen ? 1 : 0)
  )

  // A path can't animate on the native driver, so each frame draws the shape.
  React.useEffect(() => {
    const listener = progress.addListener(({ value }) =>
      setPanel(getToggleGlyphPanel(value))
    )
    return () => progress.removeListener(listener)
  }, [progress])

  React.useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: reduceMotion ? 0 : moveMs,
      easing: Easing.bezier(
        moveEasing[0],
        moveEasing[1],
        moveEasing[2],
        moveEasing[3]
      ),
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [isOpen, progress, reduceMotion, moveMs, moveEasing])

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={side === "right" ? MIRRORED : undefined}
    >
      <Path
        d={TOGGLE_GLYPH.frame}
        fill={fill}
        stroke={fill}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d={panel} fill={background} />
    </Svg>
  )
}
