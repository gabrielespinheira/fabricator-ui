import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, type GestureResponderEvent } from "react-native"
import Animated, { useAnimatedStyle } from "react-native-reanimated"

import { getTouchSlop } from "@/registry/native/lib/density-scale"
import { useFeedback, type FeedbackName } from "@/registry/native/lib/feedback"
import { usePressScale } from "@/registry/native/lib/motion"
import { PressWash } from "@/registry/native/lib/press-wash"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { DensityScope, useControlSize } from "@/registry/native/ui/density"
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

// Held, or with its popup open: a ghost button's label turns foreground.
const buttonLiftedTextVariants = cva("", {
  variants: {
    variant: {
      default: "",
      outline: "",
      secondary: "",
      ghost: "cn-button-text-lifted-ghost",
      destructive: "",
      link: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

// The pressed fill, a layer under the label that eases in and out.
const buttonWashVariants = cva("cn-button-wash", {
  variants: {
    variant: {
      default: "cn-button-wash-variant-default",
      outline: "cn-button-wash-variant-outline",
      secondary: "cn-button-wash-variant-secondary",
      ghost: "cn-button-wash-variant-ghost",
      destructive: "cn-button-wash-variant-destructive",
      link: "cn-button-wash-variant-link",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

// A joined button squares the corners it shares, and its wash follows them.
const WASH_CORNERS: Partial<Record<string, ReturnType<typeof cva>>> = {
  "horizontal-first": cva("cn-button-wash-horizontal-first"),
  "horizontal-middle": cva("cn-button-wash-horizontal-middle"),
  "horizontal-last": cva("cn-button-wash-horizontal-last"),
  "vertical-first": cva("cn-button-wash-vertical-first"),
  "vertical-middle": cva("cn-button-wash-vertical-middle"),
  "vertical-last": cva("cn-button-wash-vertical-last"),
}

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>
type ButtonVariant = VariantProps<typeof buttonVariants>["variant"]

/**
 * Joined controls stay flat when pressed, as the website's `motion-press` has
 * them inside a button group or an input group. The pressed wash still shows.
 */
const ButtonJoinedContext = React.createContext(false)

// Which step of the scale each size takes: the icon sizes match their text sizes.
const SIZE_STEP: Partial<Record<ButtonSize, "sm" | "lg">> = {
  sm: "sm",
  "icon-sm": "sm",
  lg: "lg",
  "icon-lg": "lg",
}

// Heavier for the primary action, a damped thud for a destructive one, the
// lightest sound for a link.
function getButtonFeedback(variant: ButtonVariant) {
  if (variant === "default") return "press"
  if (variant === "destructive") return "thud"
  if (variant === "link") return "tick"
  return "tap"
}

// Smaller buttons sound a little higher, larger ones a little lower.
const SIZE_PITCH: Partial<Record<string, number>> = {
  xs: 1.12,
  "icon-xs": 1.12,
  sm: 1.06,
  "icon-sm": 1.06,
  lg: 0.92,
  "icon-lg": 0.92,
}

function getHitSlop(slop: number, groupItem: string | undefined) {
  if (!slop || !groupItem) return slop
  // Joined buttons touch: reaching along the group would take a neighbour's press.
  return groupItem.startsWith("horizontal")
    ? { top: slop, bottom: slop }
    : { left: slop, right: slop }
}

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
  washClassName,
  "data-sound": sound,
  ...props
}: React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> &
  RenderProps & {
    className?: string
    children?: React.ReactNode
    /** For a button drawn with other corners, so the pressed wash matches them. */
    washClassName?: string
    /** Another sound in place of the button's, or `none`, as on the website. */
    "data-sound"?: FeedbackName | "none"
    /** Set by ButtonGroup: where this button sits, joined to its neighbours. */
    "data-group-item"?: string
    /** The size a part draws itself, when it isn't `size`: it sets the pitch. */
    "data-size"?: string | null
  }) {
  const isExpanded = props["aria-expanded"] === true
  const press = usePressScale({ isHeld: isExpanded })
  const [isPressedIn, setIsPressedIn] = React.useState(false)
  const isLifted = isExpanded || isPressedIn
  const feedback = useFeedback()
  const isJoined = React.use(ButtonJoinedContext)
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isJoined ? 1 : press.scale.value }],
  }))
  const resolvedSize = size ?? "default"
  const groupItem = props["data-group-item"]
  const control = useControlSize(SIZE_STEP[resolvedSize])
  const isXs = resolvedSize === "xs" || resolvedSize === "icon-xs"
  const shared = {
    "data-slot": "button",
    role: "button" as const,
    accessibilityState: { disabled: Boolean(props.disabled) },
    hitSlop:
      hitSlop ??
      getHitSlop(
        getTouchSlop(isXs ? control.xs.height : control.height),
        groupItem
      ),
    className: cn(buttonVariants({ variant, size, className })),
    onPress: (event: GestureResponderEvent) => {
      // Still focusable while disabled, as on the website: it says no instead.
      if (props["aria-disabled"]) {
        feedback("deny")
        return
      }
      if (sound !== "none") {
        feedback(sound ?? getButtonFeedback(variant), {
          pitch: SIZE_PITCH[props["data-size"] ?? resolvedSize],
        })
      }
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
    <DensityScope density={control.density}>
      <TextStyle
        // Changing this wrapper on a variant switch remounts the press target
        // before its delayed release, leaving the pressed wash held.
        eases
        className={cn(
          buttonTextVariants({ variant, size }),
          isLifted ? buttonLiftedTextVariants({ variant }) : undefined
        )}
      >
        <IconProvider
          strokeWidth={isLifted ? 2 : 1.5}
          {...(isXs ? { size: control.xs.icon } : {})}
        >
          {slotted ?? (
            <AnimatedPressable
              {...shared}
              style={[pressStyle, style]}
              onPressIn={(event) => {
                press.onPressIn()
                setIsPressedIn(true)
                onPressIn?.(event)
              }}
              onPressOut={(event) => {
                press.onPressOut()
                setIsPressedIn(false)
                onPressOut?.(event)
              }}
            >
              <PressWash
                press={press}
                className={cn(
                  buttonWashVariants({ variant }),
                  groupItem ? WASH_CORNERS[groupItem]?.() : undefined,
                  washClassName
                )}
              />
              {renderTextChildren(children)}
            </AnimatedPressable>
          )}
        </IconProvider>
      </TextStyle>
    </DensityScope>
  )
}

export { Button, ButtonJoinedContext, buttonTextVariants, buttonVariants }
