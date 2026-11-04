import * as React from "react"
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

const buttonVariants = cva(
  "cn-button shrink-0 flex-row items-center justify-center disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "cn-button-variant-default",
        outline: "cn-button-variant-outline",
        secondary: "cn-button-variant-secondary",
        ghost: "cn-button-variant-ghost",
        destructive: "cn-button-variant-destructive",
        link: "cn-button-variant-link",
      },
      size: {
        default: "cn-button-size-default",
        xs: "cn-button-size-xs",
        sm: "cn-button-size-sm",
        lg: "cn-button-size-lg",
        icon: "cn-button-size-icon",
        "icon-xs": "cn-button-size-icon-xs",
        "icon-sm": "cn-button-size-icon-sm",
        "icon-lg": "cn-button-size-icon-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const buttonTextVariants = cva("cn-button-text", {
  variants: {
    variant: {
      default: "cn-button-text-variant-default",
      outline: "cn-button-text-variant-outline",
      secondary: "cn-button-text-variant-secondary",
      ghost: "cn-button-text-variant-ghost",
      destructive: "cn-button-text-variant-destructive",
      link: "cn-button-text-variant-link",
    },
    size: {
      default: "",
      xs: "cn-button-text-size-xs",
      sm: "",
      lg: "",
      icon: "",
      "icon-xs": "",
      "icon-sm": "",
      "icon-lg": "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>
type ButtonVariant = VariantProps<typeof buttonVariants>["variant"]

// A control's size="sm" pins it to compact and size="lg" to spacious.
const SIZE_DENSITY: Partial<Record<ButtonSize, Density>> = {
  sm: "compact",
  "icon-sm": "compact",
  lg: "spacious",
  "icon-lg": "spacious",
}

// Heavier for the primary action, a damped thud for a destructive one.
function getButtonFeedback(variant: ButtonVariant) {
  if (variant === "default") return "press"
  if (variant === "destructive") return "thud"
  return "tap"
}

// Small controls keep a finger-sized target.
const SMALL_SIZES: ButtonSize[] = ["xs", "sm", "icon-xs", "icon-sm"]

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  asChild,
  children,
  onPress,
  onPressIn,
  onPressOut,
  style,
  hitSlop,
  ...props
}: React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> &
  RenderProps & { className?: string; children?: React.ReactNode }) {
  const press = usePressScale()
  const feedback = useFeedback()
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))
  const resolvedSize = size ?? "default"
  const shared = {
    "data-slot": "button",
    role: "button" as const,
    accessibilityState: { disabled: Boolean(props.disabled) },
    hitSlop: hitSlop ?? (SMALL_SIZES.includes(resolvedSize) ? 8 : undefined),
    className: cn(buttonVariants({ variant, size, className })),
    onPress: (event: GestureResponderEvent) => {
      feedback(getButtonFeedback(variant))
      onPress?.(event)
    },
    ...props,
  }
  // `render` takes the label as its children, and a bare string can't be drawn.
  const slotted = renderSlot(
    { render, asChild },
    shared,
    render && children !== undefined ? renderTextChildren(children) : children
  )
  return (
    <DensityScope density={SIZE_DENSITY[resolvedSize]}>
      <TextStyle className={buttonTextVariants({ variant, size })}>
        {slotted ?? (
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
        )}
      </TextStyle>
    </DensityScope>
  )
}

export { Button, buttonTextVariants, buttonVariants }
