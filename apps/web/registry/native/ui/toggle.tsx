import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, type GestureResponderEvent } from "react-native"
import Animated, { useAnimatedStyle } from "react-native-reanimated"

import { useFeedback } from "@/registry/native/lib/feedback"
import { usePressScale } from "@/registry/native/lib/motion"
import { StateFill } from "@/registry/native/lib/press-wash"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { ButtonJoinedContext } from "@/registry/native/ui/button"
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

const toggleTextVariants = cva("cn-toggle-text")
const toggleOnTextVariants = cva("cn-toggle-text-on")

// A control's size="sm" pins it to compact and size="lg" to spacious.
const SIZE_DENSITY: Partial<Record<string, Density>> = {
  sm: "compact",
  lg: "spacious",
}

// What takes each size to a 44pt target: sm pins compact's 28pt, default is 36pt
// at the default density, and lg pins spacious' 44pt.
const HIT_SLOP: Partial<Record<string, number>> = { sm: 8, default: 4 }

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
  isLit = false,
  paintsOwnFill = true,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  VariantProps<typeof toggleVariants> &
  RenderProps & {
    pressed?: boolean
    defaultPressed?: boolean
    onPressedChange?: (pressed: boolean) => void
    className?: string
    children?: React.ReactNode
    /** A Fluid Hover group's lit item: foreground, stroke 2. */
    isLit?: boolean
    /** Off in a group whose overlays already paint what's pressed and on. */
    paintsOwnFill?: boolean
  }) {
  const [isOn = false, setIsOn] = useControllableState({
    prop: pressed,
    defaultProp: defaultPressed,
    onChange: onPressedChange,
  })
  const feedback = useFeedback()
  const press = usePressScale()
  const [isHeld, setIsHeld] = React.useState(false)
  const isJoined = React.use(ButtonJoinedContext)
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isJoined ? 1 : press.scale.value }],
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
    hitSlop: hitSlop ?? HIT_SLOP[resolvedSize],
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
        setIsHeld(true)
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        press.onPressOut()
        setIsHeld(false)
        onPressOut?.(event)
      }}
    >
      {paintsOwnFill ? (
        <StateFill isOn={isOn || isHeld} className="cn-toggle-fill" />
      ) : null}
      {renderTextChildren(children)}
    </AnimatedPressable>
  )
  const isForeground = isOn || isHeld || isLit
  return (
    <DensityScope density={SIZE_DENSITY[resolvedSize]}>
      <TextStyle
        eases
        className={cn(
          toggleTextVariants(),
          isForeground ? toggleOnTextVariants() : undefined
        )}
      >
        <IconProvider strokeWidth={isForeground ? 2 : 1.5}>
          {content}
        </IconProvider>
      </TextStyle>
    </DensityScope>
  )
}

export { Toggle, toggleVariants }
