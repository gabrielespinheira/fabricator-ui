import * as React from "react"
import * as PopoverPrimitive from "@rn-primitives/popover"
import { cn } from "cn"
import { View } from "react-native"
import Animated from "react-native-reanimated"

import { useMountFeedback } from "@/registry/native/lib/feedback"
import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  COLLISION_INSETS,
  getVerticalSide,
  useTriggerOpen,
} from "@/registry/native/lib/overlay-model"
import { resolveRender, type RenderProps } from "@/registry/native/lib/render"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type PopoverTriggerRef = React.RefObject<PopoverPrimitive.TriggerRef | null>

const PopoverContext = React.createContext<PopoverTriggerRef | null>(null)

function Popover({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: Omit<PopoverPrimitive.RootProps, "onOpenChange"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const trigger = useTriggerOpen<PopoverPrimitive.TriggerRef>({
    open,
    defaultOpen,
    onOpenChange,
  })
  return (
    <PopoverContext value={trigger.triggerRef}>
      <PopoverPrimitive.Root
        data-slot="popover"
        onOpenChange={trigger.onOpenChange}
        {...props}
      />
    </PopoverContext>
  )
}

function PopoverTrigger({
  render,
  asChild,
  children,
  ...props
}: Omit<PopoverPrimitive.TriggerProps, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const triggerRef = React.use(PopoverContext)
  const resolved = resolveRender({ render, asChild, children })
  return (
    <PopoverPrimitive.Trigger
      ref={triggerRef}
      data-slot="popover-trigger"
      {...props}
      asChild={resolved.asChild}
    >
      {resolved.asChild
        ? resolved.children
        : renderTextChildren(resolved.children)}
    </PopoverPrimitive.Trigger>
  )
}

// The primitive's portal renders this only while the popover is open.
function PopoverFeedback() {
  useMountFeedback("popup")
  return null
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  insets = COLLISION_INSETS,
  children,
  ...props
}: Omit<PopoverPrimitive.ContentProps, "side"> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  const density = useDensity()
  // The primitive clamps to the screen and never flips, so this is what renders.
  const renderedSide = getVerticalSide(side)
  const { entering, exiting, origin } = useSurfaceAnimation("popup", {
    side: renderedSide,
    align,
  })
  return (
    <PopoverPrimitive.Portal>
      <DensityScope density={density}>
        <PopoverFeedback />
        <PopoverPrimitive.Overlay aria-modal className="absolute inset-0">
          <PopoverPrimitive.Content
            align={align}
            alignOffset={alignOffset}
            side={renderedSide}
            sideOffset={sideOffset}
            insets={insets}
            {...props}
          >
            <Animated.View
              data-slot="popover-content"
              entering={entering}
              exiting={exiting}
              style={origin}
              className={cn(
                "cn-popover-content cn-popover-content-logical w-72 flex-col",
                className
              )}
            >
              <TextStyle className="cn-popover-text">
                {renderTextChildren(children)}
              </TextStyle>
            </Animated.View>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Overlay>
      </DensityScope>
    </PopoverPrimitive.Portal>
  )
}

function PopoverHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="popover-header"
      className={cn("cn-popover-header flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function PopoverTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="popover-title"
      role="heading"
      className={cn("cn-popover-title", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="popover-description"
      className={cn("cn-popover-description", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
