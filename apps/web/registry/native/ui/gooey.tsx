import * as React from "react"
import { I18nManager } from "react-native"
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  type SvgProps,
} from "react-native-svg"

import {
  getGooeyPath,
  GOOEY_VIEW_BOX,
  resolveGooeyOptions,
  type GooeyDirection,
  type GooeyEffect,
  type GooeyPreference,
  type GooeySettings,
} from "@/registry/fabricator/shared/lib/gooey-model"
import { useMotion } from "@/registry/native/lib/motion"

export type {
  GooeyDirection,
  GooeyEffect,
  GooeyOptions,
  GooeyPreference,
  GooeySettings,
} from "@/registry/fabricator/shared/lib/gooey-model"

const GooeyContext = React.createContext<GooeySettings | undefined>(undefined)

function GooeyProvider({
  mode,
  waviness,
  children,
}: GooeySettings & { children: React.ReactNode }) {
  const parent = React.useContext(GooeyContext)
  const resolvedMode = parent?.mode === "off" ? "off" : mode
  const resolvedWaviness = waviness ?? parent?.waviness
  const settings = React.useMemo(
    () => ({ mode: resolvedMode, waviness: resolvedWaviness }),
    [resolvedMode, resolvedWaviness]
  )
  return (
    <GooeyContext.Provider value={settings}>{children}</GooeyContext.Provider>
  )
}

type GooeyProps = Omit<SvgProps, "children" | "viewBox" | "fill"> & {
  effect?: GooeyEffect
  progress?: number
  intensity?: number
  waviness?: number
  direction?: GooeyDirection
  fill?: string
  accentFill?: string
}

const gradientDirections: Record<
  GooeyDirection,
  [string, string, string, string]
> = {
  right: ["0%", "25%", "100%", "75%"],
  left: ["100%", "25%", "0%", "75%"],
  down: ["75%", "0%", "25%", "100%"],
  up: ["25%", "100%", "75%", "0%"],
}

function Gooey({
  effect,
  intensity,
  waviness,
  progress = 0,
  direction = "right",
  fill = "currentColor",
  accentFill,
  ...props
}: GooeyProps) {
  const settings = React.useContext(GooeyContext)
  const options = resolveGooeyOptions(
    settings,
    { effect, intensity, waviness },
    true
  )
  const { isOff, isReduced } = useMotion("move")
  const amount = options && !isOff && !isReduced ? progress : 0
  const gradient = `gooey-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const hasMelt =
    options?.effect === "melt" && Boolean(accentFill) && amount > 0
  const [x1, y1, x2, y2] = gradientDirections[direction]
  return (
    <Svg
      {...props}
      data-slot="gooey"
      viewBox={GOOEY_VIEW_BOX}
      preserveAspectRatio="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {hasMelt && (
        <Defs>
          <LinearGradient id={gradient} {...{ x1, y1, x2, y2 }}>
            <Stop offset="25%" stopColor={fill} />
            <Stop offset="75%" stopColor={accentFill} />
          </LinearGradient>
        </Defs>
      )}
      <Path
        d={getGooeyPath(
          options?.effect ?? "move",
          amount,
          options?.intensity ?? 0,
          options?.waviness ?? 0,
          direction
        )}
        fill={hasMelt ? `url(#${gradient})` : fill}
      />
    </Svg>
  )
}

type GooeyFeedbackProps = {
  value?: number
  position?: SharedValue<number>
  gooey?: GooeyPreference
  effect: GooeyEffect
  isVertical?: boolean
  isDisabled?: boolean
  followsTextDirection?: boolean
  fill: string
}

const AnimatedPath = Animated.createAnimatedComponent(Path)

function GooeyFeedback({
  gooey,
  effect,
  isDisabled,
  ...props
}: GooeyFeedbackProps) {
  const settings = React.useContext(GooeyContext)
  const options = resolveGooeyOptions(settings, gooey, false, effect)
  if (!options?.intensity || isDisabled) return null
  return <GooeyPulse {...props} {...options} />
}

function GooeyPulse({
  value,
  position,
  effect,
  intensity,
  waviness,
  isVertical,
  followsTextDirection,
  fill,
}: Omit<GooeyFeedbackProps, "gooey" | "isDisabled"> & {
  intensity: number
  waviness: number
}) {
  const { isOff, isReduced, enterMs } = useMotion("move")
  const localPosition = useSharedValue(value)
  const progress = useSharedValue(0)
  const direction = useSharedValue<GooeyDirection>("right")
  const isRightToLeft = Boolean(followsTextDirection && I18nManager.isRTL)
  React.useEffect(() => {
    localPosition.set(value)
  }, [localPosition, value])
  useAnimatedReaction(
    () => (position ? position.get() : localPosition.get()),
    (next, previous) => {
      if (
        isOff ||
        isReduced ||
        enterMs <= 0 ||
        next === undefined ||
        previous == null ||
        next === previous
      )
        return
      const isForward = next > previous !== isRightToLeft
      direction.set(
        isVertical
          ? next > previous
            ? "up"
            : "down"
          : isForward
            ? "right"
            : "left"
      )
      progress.set(1)
      progress.set(withTiming(0, { duration: enterMs }))
    }
  )
  const animatedProps = useAnimatedProps(() => ({
    d: getGooeyPath(
      effect,
      progress.get(),
      intensity,
      waviness,
      direction.get()
    ),
    opacity: Math.min(1, progress.get() * 2),
  }))
  if (isOff || isReduced) return null
  return (
    <Svg
      data-slot="gooey-feedback"
      width="160%"
      height="180%"
      viewBox={GOOEY_VIEW_BOX}
      preserveAspectRatio="none"
      style={{ position: "absolute", left: "-30%", top: "-40%" }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <AnimatedPath animatedProps={animatedProps} fill={fill} />
    </Svg>
  )
}

export { Gooey, GooeyFeedback, GooeyProvider }
export type { GooeyProps }
