import * as React from "react"
import * as TooltipPrimitive from "@rn-primitives/tooltip"
import { cn } from "cn"
import { Pressable } from "react-native"
import Animated from "react-native-reanimated"

import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  COLLISION_INSETS,
  getTextContent,
  useTriggerOpen,
} from "@/registry/native/lib/overlay-model"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

type TooltipContextValue = {
  triggerRef: React.RefObject<TooltipPrimitive.TriggerRef | null>
  hint: string | undefined
  setHint: (hint: string | undefined) => void
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)
const TooltipDelayContext = React.createContext(0)

function useTooltip() {
  const context = React.use(TooltipContext)
  if (!context) throw new Error("useTooltip must be used within a Tooltip.")
  return context
}

/**
 * On the website this sets how long a pointer rests before tooltips show. Here it
 * sets how long a press has to last, and 0 leaves the platform's long press.
 */
function TooltipProvider({
  delay = 0,
  children,
}: {
  delay?: number
  children?: React.ReactNode
}) {
  return <TooltipDelayContext value={delay}>{children}</TooltipDelayContext>
}

function Tooltip({
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: Omit<TooltipPrimitive.RootProps, "onOpenChange"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const trigger = useTriggerOpen<TooltipPrimitive.TriggerRef>({
    open,
    defaultOpen,
    onOpenChange,
  })
  const [hint, setHint] = React.useState<string>()
  const context = React.useMemo(
    () => ({ triggerRef: trigger.triggerRef, hint, setHint }),
    [hint, trigger.triggerRef]
  )
  return (
    <TooltipContext value={context}>
      <TooltipPrimitive.Root
        data-slot="tooltip"
        onOpenChange={trigger.onOpenChange}
        {...props}
      >
        {children}
      </TooltipPrimitive.Root>
    </TooltipContext>
  )
}

type TooltipTriggerProps = Omit<
  React.ComponentProps<typeof Pressable>,
  "children"
> &
  RenderProps & { children?: React.ReactNode }

// The primitive's trigger toggles on press. Here a press stays the trigger's own
// action and a long press opens, so the toggle it passes down is dropped.
function LongPressTarget({
  onPress: _toggle,
  onTap,
  render,
  asChild,
  children,
  ...props
}: TooltipTriggerProps & { onTap: TooltipTriggerProps["onPress"] }) {
  const shared = { ...props, onPress: onTap }
  return (
    renderSlot({ render, asChild }, shared, children) ?? (
      <Pressable {...shared}>{renderTextChildren(children)}</Pressable>
    )
  )
}

function TooltipTrigger({
  delay,
  closeDelay: _closeDelay,
  onPress,
  onLongPress,
  disabled,
  ...props
}: TooltipTriggerProps & {
  /** How long the press lasts before it shows. */
  delay?: number
  /** Kept so code from the website compiles: a press outside closes it. */
  closeDelay?: number
}) {
  const { triggerRef, hint } = useTooltip()
  const providerDelay = React.use(TooltipDelayContext)
  return (
    <TooltipPrimitive.Trigger ref={triggerRef} asChild disabled={disabled}>
      <LongPressTarget
        data-slot="tooltip-trigger"
        accessibilityHint={hint}
        delayLongPress={delay || providerDelay || undefined}
        onTap={onPress}
        onLongPress={(event) => {
          triggerRef.current?.open()
          onLongPress?.(event)
        }}
        {...props}
      />
    </TooltipPrimitive.Trigger>
  )
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  insets = COLLISION_INSETS,
  children,
  ...props
}: TooltipPrimitive.ContentProps) {
  const density = useDensity()
  const { setHint } = useTooltip()
  // The primitive draws `left` and `right` on top, and clamps rather than flips.
  const { entering, exiting, origin } = useSurfaceAnimation("tooltip", {
    side: side === "bottom" ? "bottom" : "top",
    align,
  })
  const text = getTextContent(children)
  React.useEffect(() => {
    setHint(text || undefined)
  }, [setHint, text])
  return (
    <TooltipPrimitive.Portal>
      <DensityScope density={density}>
        <TooltipPrimitive.Overlay className="absolute inset-0">
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            insets={insets}
            {...props}
          >
            <Animated.View
              data-slot="tooltip-content"
              entering={entering}
              exiting={exiting}
              style={origin}
              className={cn(
                "cn-tooltip-content cn-tooltip-content-logical max-w-xs flex-row items-center bg-foreground",
                className
              )}
            >
              <TextStyle className="cn-tooltip-text">
                {renderTextChildren(children)}
              </TextStyle>
            </Animated.View>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Overlay>
      </DensityScope>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
