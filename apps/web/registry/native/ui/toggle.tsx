import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, type GestureResponderEvent } from "react-native"
import Animated, { useAnimatedStyle } from "react-native-reanimated"

import { useFeedback } from "@/registry/native/lib/feedback"
import { usePressScale } from "@/registry/native/lib/motion"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { DensityScope, type Density } from "@/registry/native/ui/density"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const toggleVariants = cva(
  "cn-toggle shrink-0 flex-row items-center justify-center disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "cn-toggle-variant-default",
        outline: "cn-toggle-variant-outline",
      },
      size: {
        default: "cn-toggle-size-default",
        sm: "cn-toggle-size-sm",
        lg: "cn-toggle-size-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// A control's size="sm" pins it to compact and size="lg" to spacious.
const SIZE_DENSITY: Partial<Record<string, Density>> = {
  sm: "compact",
  lg: "spacious",
}

function Toggle({
  className,
  variant = "default",
  size = "default",
  pressed,
  defaultPressed = false,
  onPressedChange,
  render,
  asChild,
  children,
  onPress,
  onPressIn,
  onPressOut,
  style,
  hitSlop,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  VariantProps<typeof toggleVariants> &
  RenderProps & {
    pressed?: boolean
    defaultPressed?: boolean
    onPressedChange?: (pressed: boolean) => void
    className?: string
    children?: React.ReactNode
  }) {
  const [isOn = false, setIsOn] = useControllableState({
    prop: pressed,
    defaultProp: defaultPressed,
    onChange: onPressedChange,
  })
  const feedback = useFeedback()
  const press = usePressScale()
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))
  const resolvedSize = size ?? "default"
  const shared = {
    "data-slot": "toggle",
    "data-state": isOn ? "on" : "off",
    "data-variant": variant ?? "default",
    "data-size": resolvedSize,
    accessibilityRole: "togglebutton" as const,
    "aria-checked": isOn,
    "aria-disabled": Boolean(props.disabled),
    hitSlop: hitSlop ?? (resolvedSize === "sm" ? 8 : undefined),
    className: cn(toggleVariants({ variant, size, className })),
    onPress: (event: GestureResponderEvent) => {
      feedback(isOn ? "unlatch" : "latch")
      setIsOn(!isOn)
      onPress?.(event)
    },
    ...props,
  }
  const slotted = renderSlot({ render, asChild }, shared, children)
  const content = slotted ?? (
    <AnimatedPressable
      {...shared}
      style={[pressStyle, style]}
      onPressIn={(event) => {
        press.onPressIn()
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        press.onPressOut()
        onPressOut?.(event)
      }}
    >
      {renderTextChildren(children)}
    </AnimatedPressable>
  )
  return (
    <DensityScope density={SIZE_DENSITY[resolvedSize]}>
      {isOn ? (
        <TextStyle className="cn-toggle-text cn-toggle-text-on">
          <IconProvider strokeWidth={2}>{content}</IconProvider>
        </TextStyle>
      ) : (
        <TextStyle className="cn-toggle-text">
          <IconProvider strokeWidth={1.5}>{content}</IconProvider>
        </TextStyle>
      )}
    </DensityScope>
  )
}

export { Toggle, toggleVariants }
