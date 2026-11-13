import * as React from "react"
import {
  ChevronDownIcon,
  IconProvider,
} from "@fabricator-ui/icons-react-native"
import * as AccordionPrimitive from "@rn-primitives/accordion"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { View, type GestureResponderEvent } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import {
  getAccordionItemOrder,
  getAccordionItemShape,
} from "@/registry/fabricator/shared/lib/accordion-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  FluidHoverHighlight,
  FluidHoverProvider,
  useFluidHover,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { DisclosurePanel } from "@/registry/native/ui/collapsible"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

// Items are cards: closed neighbours join into one, an open item parts from
// both, and the gap and corners spring there (getAccordionItemShape). Each
// item reports where it laid out, so the root knows their order however
// they're wrapped, as the website reads siblings.
type AccordionLayout = {
  items: string[]
  open: string[]
  report: (value: string, y: number | null) => void
}

const AccordionLayoutContext = React.createContext<AccordionLayout>({
  items: [],
  open: [],
  report: () => {},
})

function useItemOrder() {
  const positions = React.useRef(new Map<string, number>())
  const [items, setItems] = React.useState<string[]>([])
  const report = React.useCallback((value: string, y: number | null) => {
    if (y === null) positions.current.delete(value)
    else positions.current.set(value, y)
    const next = getAccordionItemOrder(positions.current)
    // Items move every frame while a gap springs; only a new order renders.
    setItems((current) =>
      current.join("\u0000") === next.join("\u0000") ? current : next
    )
  }, [])
  return { items, report }
}

const AnimatedItem = Animated.createAnimatedComponent(AccordionPrimitive.Item)

// The trigger tells its item it's held, so an open item's card can tint.
const AccordionItemPressContext = React.createContext<
  (isPressed: boolean) => void
>(() => {})

function Accordion({
  className,
  value,
  defaultValue = [],
  onValueChange,
  multiple = false,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof View>,
  "children" | "value" | "defaultValue"
> & {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  multiple?: boolean
  disabled?: boolean
  children?: React.ReactNode
}) {
  const [current = [], setCurrent] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  // The accordion sits in a page that scrolls, so a drag stays the page's.
  const fluid = useFluidHover()
  const { items, report } = useItemOrder()
  const layout = React.useMemo(
    () => ({ items, open: current, report }),
    [items, current, report]
  )
  return (
    <FluidHoverProvider fluid={fluid}>
      <AccordionLayoutContext value={layout}>
        <AccordionPrimitive.Root
          ref={fluid.attach}
          data-slot="accordion"
          // Base UI's value is always an array, so the primitive runs in its array
          // mode and a single accordion keeps only the item just opened.
          type="multiple"
          value={current}
          onValueChange={(next) => {
            setCurrent(
              multiple ? next : next.filter((item) => !current.includes(item))
            )
          }}
          className={cn("cn-accordion relative flex-col", className)}
          {...props}
        >
          <FluidHoverHighlight
            hover={fluid.hover}
            className="cn-accordion-highlight"
          />
          {children}
        </AccordionPrimitive.Root>
      </AccordionLayoutContext>
    </FluidHoverProvider>
  )
}

function AccordionItem({
  className,
  style,
  value,
  onLayout,
  ...props
}: AccordionPrimitive.ItemProps) {
  const layout = React.use(AccordionLayoutContext)
  const { report } = layout
  const [isPressed, setIsPressed] = React.useState(false)
  React.useEffect(() => () => report(value, null), [report, value])
  const shape = getAccordionItemShape(layout.items, layout.open, value)
  const motion = useMotion("bounce")
  const [radiusToken, gapToken] = useCSSVariable(["--radius-xl", "--density-8"])
  const radius = parseNumber(radiusToken, 14)
  const gapSize = parseNumber(gapToken, 8)
  const gap = useSharedValue(shape.hasGap ? 1 : 0)
  const top = useSharedValue(shape.isTopRound ? 1 : 0)
  const bottom = useSharedValue(shape.isBottomRound ? 1 : 0)
  React.useEffect(() => {
    const spring = (isOn: boolean) =>
      withTiming(isOn ? 1 : 0, {
        duration: motion.isReduced ? 0 : isOn ? motion.enterMs : motion.exitMs,
        easing: motion.bounceEasing,
      })
    // Closing, the gap settles without the spring, so it never dips into an
    // overlap of the two tiles.
    gap.value = shape.hasGap
      ? spring(true)
      : withTiming(0, {
          duration: motion.isReduced ? 0 : motion.exitMs,
          easing: motion.enterEasing,
        })
    top.value = spring(shape.isTopRound)
    bottom.value = spring(shape.isBottomRound)
  }, [
    shape.hasGap,
    shape.isTopRound,
    shape.isBottomRound,
    motion,
    gap,
    top,
    bottom,
  ])
  const shapeStyle = useAnimatedStyle(() => {
    const topRadius = Math.max(0, top.value * radius)
    const bottomRadius = Math.max(0, bottom.value * radius)
    return {
      marginTop: gap.value * gapSize,
      borderTopLeftRadius: topRadius,
      borderTopRightRadius: topRadius,
      borderBottomLeftRadius: bottomRadius,
      borderBottomRightRadius: bottomRadius,
    }
  })
  return (
    <AccordionItemPressContext value={setIsPressed}>
      <AnimatedItem
        data-slot="accordion-item"
        data-pressed={isPressed && layout.open.includes(value)}
        value={value}
        className={cn("cn-accordion-item", className)}
        style={[shapeStyle, style]}
        onLayout={(event) => {
          report(value, event.nativeEvent.layout.y)
          onLayout?.(event)
        }}
        {...props}
      />
    </AccordionItemPressContext>
  )
}

function AccordionTrigger({
  className,
  children,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onLayout,
  ...props
}: Omit<AccordionPrimitive.TriggerProps, "children"> & {
  children?: React.ReactNode
}) {
  const { isExpanded, disabled: isItemDisabled } =
    AccordionPrimitive.useItemContext()
  const { disabled: isRootDisabled } = AccordionPrimitive.useRootContext()
  const feedback = useFeedback()
  const setIsPressed = React.use(AccordionItemPressContext)
  // The chevron turns on the move timing: a spring would wobble it.
  const motion = useMotion("move")
  const { isLit, rowProps } = useFluidRow({
    // An open item's trigger isn't lit: a row highlight inside its own card
    // reads as a box in a box, so pressing it tints the whole card instead.
    disabled: disabled || isItemDisabled || isRootDisabled || isExpanded,
    onLayout,
    onPressIn: (event: GestureResponderEvent) => {
      setIsPressed(true)
      onPressIn?.(event)
    },
    onPressOut: (event: GestureResponderEvent) => {
      setIsPressed(false)
      onPressOut?.(event)
    },
    onHoverIn,
    onHoverOut,
  })
  const turn = useSharedValue(isExpanded ? 1 : 0)
  React.useEffect(() => {
    turn.value = withTiming(isExpanded ? 1 : 0, {
      duration: motion.isReduced
        ? 0
        : isExpanded
          ? motion.enterMs
          : motion.exitMs,
      easing: motion.moveEasing,
    })
  }, [isExpanded, motion, turn])
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(turn.value - 1) * 90}deg` }],
  }))

  const trigger = (
    <AccordionPrimitive.Header className="flex-row">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        data-state={isExpanded ? "open" : "closed"}
        hitSlop={4}
        disabled={disabled}
        className={cn(
          "cn-accordion-trigger relative flex-1 flex-row items-start justify-between disabled:opacity-50",
          className
        )}
        onPress={(event) => {
          feedback(isExpanded ? "collapse" : "expand")
          onPress?.(event)
        }}
        {...rowProps}
        {...props}
      >
        <View className="flex-1 shrink">{renderTextChildren(children)}</View>
        <IconProvider strokeWidth={isExpanded || isLit ? 2 : 1.5}>
          <Animated.View
            data-slot="accordion-trigger-icon"
            className="cn-accordion-trigger-icon shrink-0 items-center justify-center"
            style={iconStyle}
          >
            <ChevronDownIcon />
          </Animated.View>
        </IconProvider>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
  if (isExpanded) {
    return (
      <TextStyle
        eases
        className="cn-accordion-trigger-text cn-accordion-trigger-text-open"
      >
        {trigger}
      </TextStyle>
    )
  }
  if (isLit) {
    return (
      <TextStyle
        eases
        className="cn-accordion-trigger-text cn-accordion-trigger-text-lit"
      >
        {trigger}
      </TextStyle>
    )
  }
  return (
    <TextStyle eases className="cn-accordion-trigger-text">
      {trigger}
    </TextStyle>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DisclosurePanel>, "isOpen">) {
  const { isExpanded } = AccordionPrimitive.useItemContext()
  return (
    <TextStyle className="cn-accordion-content-text">
      <DisclosurePanel
        data-slot="accordion-content"
        isOpen={isExpanded}
        motionRole="bounce"
        className={cn(
          "cn-accordion-content cn-accordion-content-inner",
          className
        )}
        {...props}
      >
        {children}
      </DisclosurePanel>
    </TextStyle>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
