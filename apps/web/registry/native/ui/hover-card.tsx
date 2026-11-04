import * as React from "react"
import * as HoverCardPrimitive from "@rn-primitives/hover-card"
import { cn } from "cn"
import { Pressable } from "react-native"
import Animated from "react-native-reanimated"

import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  COLLISION_INSETS,
  getVerticalSide,
  useTriggerOpen,
} from "@/registry/native/lib/overlay-model"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

type HoverCardTriggerRef = React.RefObject<HoverCardPrimitive.TriggerRef | null>

const HoverCardContext = React.createContext<HoverCardTriggerRef | null>(null)

function HoverCard({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: Omit<HoverCardPrimitive.RootProps, "onOpenChange"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const trigger = useTriggerOpen<HoverCardPrimitive.TriggerRef>({
    open,
    defaultOpen,
    onOpenChange,
  })
  return (
    <HoverCardContext value={trigger.triggerRef}>
      <HoverCardPrimitive.Root
        data-slot="hover-card"
        onOpenChange={trigger.onOpenChange}
        {...props}
      />
    </HoverCardContext>
  )
}

type HoverCardTriggerProps = Omit<
  React.ComponentProps<typeof Pressable>,
  "children"
> &
  RenderProps & { children?: React.ReactNode }

// The primitive's trigger toggles on press. Here a tap goes through to the
// trigger's own action and a long press opens, so the toggle it passes down is
// dropped.
function LongPressTarget({
  onPress: _toggle,
  onTap,
  render,
  asChild,
  children,
  ...props
}: HoverCardTriggerProps & { onTap: HoverCardTriggerProps["onPress"] }) {
  const shared = { ...props, onPress: onTap }
  return (
    renderSlot({ render, asChild }, shared, children) ?? (
      <Pressable {...shared}>{renderTextChildren(children)}</Pressable>
    )
  )
}

function HoverCardTrigger({
  delay,
  closeDelay: _closeDelay,
  onPress,
  onLongPress,
  disabled,
  ...props
}: HoverCardTriggerProps & {
  /** How long the press lasts before it opens. */
  delay?: number
  /** Kept so code from the website compiles: a press outside closes it. */
  closeDelay?: number
}) {
  const triggerRef = React.use(HoverCardContext)
  return (
    <HoverCardPrimitive.Trigger ref={triggerRef} asChild disabled={disabled}>
      <LongPressTarget
        data-slot="hover-card-trigger"
        delayLongPress={delay}
        onTap={onPress}
        onLongPress={(event) => {
          triggerRef?.current?.open()
          onLongPress?.(event)
        }}
        {...props}
      />
    </HoverCardPrimitive.Trigger>
  )
}

function HoverCardContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 4,
  insets = COLLISION_INSETS,
  children,
  ...props
}: Omit<HoverCardPrimitive.ContentProps, "side"> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  const density = useDensity()
  const { entering, exiting } = useSurfaceAnimation("popup")
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <DensityScope density={density}>
        <HoverCardPrimitive.Overlay aria-modal className="absolute inset-0">
          <HoverCardPrimitive.Content
            side={getVerticalSide(side)}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            insets={insets}
            {...props}
          >
            <Animated.View
              data-slot="hover-card-content"
              entering={entering}
              exiting={exiting}
              className={cn(
                "cn-hover-card-content cn-hover-card-content-logical",
                className
              )}
            >
              <TextStyle className="cn-hover-card-text">
                {renderTextChildren(children)}
              </TextStyle>
            </Animated.View>
          </HoverCardPrimitive.Content>
        </HoverCardPrimitive.Overlay>
      </DensityScope>
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardContent, HoverCardTrigger }
