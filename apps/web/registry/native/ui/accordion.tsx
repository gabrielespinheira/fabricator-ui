import * as React from "react"
import {
  ChevronDownIcon,
  IconProvider,
} from "@fabricator-ui/icons-react-native"
import * as AccordionPrimitive from "@rn-primitives/accordion"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import { DisclosurePanel } from "@/registry/native/ui/collapsible"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

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
  return (
    <AccordionPrimitive.Root
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
      className={cn("cn-accordion flex-col", className)}
      {...props}
    >
      {children}
    </AccordionPrimitive.Root>
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.ItemProps) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("cn-accordion-item", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  onPress,
  ...props
}: Omit<AccordionPrimitive.TriggerProps, "children"> & {
  children?: React.ReactNode
}) {
  const { isExpanded } = AccordionPrimitive.useItemContext()
  const feedback = useFeedback()
  const motion = useMotion("disclosure")
  const turn = useSharedValue(isExpanded ? 1 : 0)
  React.useEffect(() => {
    turn.value = withTiming(isExpanded ? 1 : 0, {
      duration: motion.enterMs,
      easing: motion.enterEasing,
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
        className={cn(
          "cn-accordion-trigger relative flex-1 flex-row items-start justify-between disabled:opacity-50",
          className
        )}
        onPress={(event) => {
          feedback(isExpanded ? "collapse" : "expand")
          onPress?.(event)
        }}
        {...props}
      >
        <View className="flex-1 shrink">{renderTextChildren(children)}</View>
        <IconProvider strokeWidth={isExpanded ? 2 : 1.5}>
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
  return isExpanded ? (
    <TextStyle className="cn-accordion-trigger-text cn-accordion-trigger-text-open">
      {trigger}
    </TextStyle>
  ) : (
    <TextStyle className="cn-accordion-trigger-text">{trigger}</TextStyle>
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
