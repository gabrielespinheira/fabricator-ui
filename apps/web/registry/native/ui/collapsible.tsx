import * as React from "react"
import * as CollapsiblePrimitive from "@rn-primitives/collapsible"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { View } from "react-native"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import { resolveRender, type RenderProps } from "@/registry/native/lib/render"
import { renderTextChildren } from "@/registry/native/ui/text"

const CollapsibleContext = React.createContext(false)

function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: CollapsiblePrimitive.RootProps) {
  const [isOpen = false, setIsOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  return (
    <CollapsibleContext value={isOpen}>
      <CollapsiblePrimitive.Root
        data-slot="collapsible"
        data-state={isOpen ? "open" : "closed"}
        open={isOpen}
        onOpenChange={setIsOpen}
        {...props}
      >
        {renderTextChildren(children)}
      </CollapsiblePrimitive.Root>
    </CollapsibleContext>
  )
}

function CollapsibleTrigger({
  className,
  render,
  asChild,
  children,
  onPress,
  ...props
}: Omit<CollapsiblePrimitive.TriggerProps, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const isOpen = React.use(CollapsibleContext)
  const feedback = useFeedback()
  const resolved = resolveRender({ render, asChild, children })
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      data-state={isOpen ? "open" : "closed"}
      hitSlop={12}
      className={cn("cn-collapsible-trigger", className)}
      onPress={(event) => {
        // Composed with a control, that control sounds: Button can't give up its
        // own, and two at once would be worse than the wrong one.
        if (!resolved.asChild) feedback(isOpen ? "collapse" : "expand")
        onPress?.(event)
      }}
      {...props}
      asChild={resolved.asChild}
    >
      {resolved.asChild
        ? resolved.children
        : renderTextChildren(resolved.children)}
    </CollapsiblePrimitive.Trigger>
  )
}

/**
 * A panel that opens and closes on its measured height, on the disclosure
 * timing. Settled open, the height is its content's, so something growing inside
 * needs no measure. Reduced motion drops the height's travel and keeps a fade.
 * Its content unmounts once closed, as Base UI's panel does, unless `keepMounted`.
 * Accordion's panels are this one too.
 */
function DisclosurePanel({
  isOpen,
  keepMounted = false,
  className,
  children,
  style,
  ...props
}: Omit<
  React.ComponentProps<typeof Animated.View>,
  "children" | "className"
> & {
  isOpen: boolean
  keepMounted?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const motion = useMotion("disclosure")
  const isReduced = motion.isReduced
  const [isMounted, setIsMounted] = React.useState(isOpen)
  if (isOpen && !isMounted) setIsMounted(true)

  const [hasHeight, setHasHeight] = React.useState(false)
  const measured = useSharedValue(0)
  const progress = useSharedValue(isOpen ? 1 : 0)
  React.useEffect(() => {
    // Opening waits for the content's height. The curve moves fastest at its
    // start, so frames lost to the measure would show as a jump.
    if (isOpen && !hasHeight) return
    progress.value = withTiming(
      isOpen ? 1 : 0,
      {
        duration: isOpen ? motion.enterMs : motion.exitMs,
        easing: isOpen ? motion.enterEasing : motion.exitEasing,
      },
      (finished) => {
        if (!finished || isOpen || keepMounted) return
        runOnJS(setIsMounted)(false)
        runOnJS(setHasHeight)(false)
      }
    )
  }, [hasHeight, isOpen, keepMounted, motion, progress])

  const heightStyle = useAnimatedStyle(() => {
    if (isReduced) {
      return {
        opacity: progress.value,
        height: progress.value > 0 ? "auto" : 0,
      }
    }
    if (progress.value >= 1) return { height: "auto" }
    return { height: measured.value * progress.value }
  })

  return (
    <Animated.View
      data-state={isOpen ? "open" : "closed"}
      role="region"
      aria-hidden={!isOpen}
      accessibilityElementsHidden={!isOpen}
      importantForAccessibility={isOpen ? "auto" : "no-hide-descendants"}
      pointerEvents={isOpen ? "auto" : "none"}
      className="overflow-hidden"
      style={[heightStyle, style]}
      {...props}
    >
      {isMounted || keepMounted ? (
        <View
          className={className}
          onLayout={(event) => {
            measured.value = event.nativeEvent.layout.height
            setHasHeight(true)
          }}
        >
          {renderTextChildren(children)}
        </View>
      ) : null}
    </Animated.View>
  )
}

function CollapsibleContent({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DisclosurePanel>, "isOpen">) {
  const isOpen = React.use(CollapsibleContext)
  return (
    <DisclosurePanel
      data-slot="collapsible-content"
      isOpen={isOpen}
      className={cn("cn-collapsible-content", className)}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger, DisclosurePanel }
