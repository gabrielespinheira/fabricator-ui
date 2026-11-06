import * as React from "react"
import { cn } from "cn"
import { View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useMotion } from "@/registry/native/lib/motion"
import { renderTextChildren, Text } from "@/registry/native/ui/text"

type ProgressStatus = "indeterminate" | "progressing" | "complete"

const ProgressContext = React.createContext<{
  value: number | null
  percentage: number | null
  formattedValue: string
  status: ProgressStatus
}>({
  value: null,
  percentage: null,
  formattedValue: "",
  status: "indeterminate",
})

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

function Progress({
  className,
  children,
  value = null,
  min = 0,
  max = 100,
  format,
  locale,
  getAriaValueText,
  ...props
}: React.ComponentProps<typeof View> & {
  value?: number | null
  min?: number
  max?: number
  format?: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  getAriaValueText?: (formattedValue: string, value: number | null) => string
}) {
  // A null or non-finite value is indeterminate, as Base UI has it.
  const clamped =
    value !== null && Number.isFinite(value) ? clamp(value, min, max) : null
  const percentage =
    clamped === null
      ? null
      : clamp(((clamped - min) * 100) / (max - min) || 0, 0, 100)
  const status: ProgressStatus =
    clamped === null
      ? "indeterminate"
      : clamped === max
        ? "complete"
        : "progressing"
  let formattedValue = ""
  if (clamped !== null && percentage !== null) {
    formattedValue = format
      ? new Intl.NumberFormat(locale, format).format(clamped)
      : new Intl.NumberFormat(locale, { style: "percent" }).format(
          percentage / 100
        )
  }
  return (
    <ProgressContext value={{ value, percentage, formattedValue, status }}>
      <View
        data-slot="progress"
        data-status={status}
        accessible
        role="progressbar"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped ?? undefined}
        aria-valuetext={
          getAriaValueText
            ? getAriaValueText(formattedValue, value)
            : formattedValue || "indeterminate progress"
        }
        className={cn("cn-progress-root flex-row flex-wrap", className)}
        {...props}
      >
        {renderTextChildren(children)}
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </View>
    </ProgressContext>
  )
}

function ProgressTrack({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="progress-track"
      className={cn(
        "cn-progress-track relative w-full flex-row items-center overflow-hidden",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function ProgressIndicator({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  const { percentage, status } = React.use(ProgressContext)
  const target = percentage ?? 0
  const motion = useMotion("move")
  const fill = useSharedValue(target)
  React.useEffect(() => {
    fill.value = withTiming(target, {
      duration: motion.enterMs,
      easing: motion.moveEasing,
    })
  }, [fill, motion, target])
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }))
  return (
    <Animated.View
      data-slot="progress-indicator"
      data-status={status}
      style={[fillStyle, style]}
      className={cn("cn-progress-indicator h-full", className)}
      {...props}
    />
  )
}

function ProgressLabel({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="progress-label"
      className={cn("cn-progress-label", className)}
      {...props}
    />
  )
}

function ProgressValue({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Text>, "children"> & {
  children?:
    | React.ReactNode
    | ((formattedValue: string, value: number | null) => React.ReactNode)
}) {
  const { value, formattedValue, status } = React.use(ProgressContext)
  const isIndeterminate = status === "indeterminate"
  return (
    <Text
      data-slot="progress-value"
      aria-hidden
      className={cn("cn-progress-value", className)}
      {...props}
    >
      {typeof children === "function"
        ? children(isIndeterminate ? "indeterminate" : formattedValue, value)
        : isIndeterminate
          ? null
          : formattedValue}
    </Text>
  )
}

export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
}
