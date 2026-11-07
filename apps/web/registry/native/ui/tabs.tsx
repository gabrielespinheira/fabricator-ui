import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import * as TabsPrimitive from "@rn-primitives/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { noteStep } from "@/registry/fabricator/shared/lib/sound-recipes"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  FluidHoverArea,
  FluidHoverHighlight,
  FluidHoverProvider,
  FluidHoverSelection,
  useFluidHover,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import {
  getTextContent,
  wrapTextChildren,
} from "@/registry/native/lib/text-children"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type TabsOrientation = "horizontal" | "vertical"

const TabsContext = React.createContext<TabsOrientation>("horizontal")

const TabsListContext = React.createContext<"default" | "subtle">("default")

// Each tab rings a step higher along the track.
const TabIndexContext = React.createContext(0)

// The lit tab and the active one turn foreground; the weight never changes.
const tabsTriggerTextVariants = cva("cn-tabs-trigger-text")
const tabsTriggerLitTextVariants = cva("cn-tabs-trigger-text-lit")
const tabsTriggerActiveTextVariants = cva("cn-tabs-trigger-text-active")

// Each run of text becomes a label, as on the website.
function renderLabels(children: React.ReactNode) {
  return wrapTextChildren(children, (text, key) => (
    <Text
      key={key}
      data-slot="tabs-trigger-label"
      className="cn-tabs-trigger-label"
    >
      {text}
    </Text>
  ))
}

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: Omit<TabsPrimitive.RootProps, "value" | "onValueChange"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [current, setCurrent] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next)
    },
  })
  return (
    <TabsContext value={orientation}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        orientation={orientation}
        value={current ?? ""}
        onValueChange={setCurrent}
        className={cn(
          "cn-tabs data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
      </TabsPrimitive.Root>
    </TabsContext>
  )
}

const tabsListVariants = cva(
  "cn-tabs-list flex-row items-center justify-center self-start data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
  {
    variants: {
      variant: {
        default: "cn-tabs-list-variant-default",
        // Only the active tab shows its label; the others show their icon.
        subtle: "cn-tabs-list-variant-subtle",
        /** @deprecated Kept for compatibility; renders as `default`. */
        line: "cn-tabs-list-variant-default",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: TabsPrimitive.ListProps & VariantProps<typeof tabsListVariants>) {
  const { value } = TabsPrimitive.useRootContext()
  const orientation = React.use(TabsContext)
  const resolvedVariant = variant === "subtle" ? "subtle" : "default"
  // Dragging across the tabs moves the highlight; letting go selects, as a
  // segmented control does.
  const fluid = useFluidHover({
    selected: value,
    axis: orientation === "vertical" ? "y" : "x",
    track: orientation === "vertical" ? "hold" : "drag",
    previewsSelection: true,
  })
  return (
    <FluidHoverProvider fluid={fluid}>
      <FluidHoverArea fluid={fluid}>
        <TabsPrimitive.List
          ref={fluid.attach}
          data-slot="tabs-list"
          data-variant={resolvedVariant}
          data-orientation={orientation}
          className={cn(tabsListVariants({ variant }), className)}
          {...props}
        >
          <FluidHoverSelection
            data-variant={resolvedVariant}
            selection={fluid.selection}
            className="cn-tabs-selection"
          />
          <FluidHoverHighlight
            data-variant={resolvedVariant}
            hover={fluid.hover}
            className="cn-tabs-highlight"
          />
          <TabsListContext value={resolvedVariant}>
            {React.Children.toArray(children).map((child, index) => (
              <TabIndexContext key={index} value={index}>
                {child}
              </TabIndexContext>
            ))}
          </TabsListContext>
        </TabsPrimitive.List>
      </FluidHoverArea>
    </FluidHoverProvider>
  )
}

function TabsTrigger({
  className,
  value,
  children,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onLayout,
  ...props
}: Omit<TabsPrimitive.TriggerProps, "children"> & {
  children?: React.ReactNode
}) {
  const { value: selected, onValueChange } = TabsPrimitive.useRootContext()
  const orientation = React.use(TabsContext)
  const variant = React.use(TabsListContext)
  const index = React.use(TabIndexContext)
  const feedback = useFeedback()
  const isActive = selected === value
  // A subtle list draws only the active tab's label; the others keep it as
  // their accessible name.
  const isIconOnly = variant === "subtle" && !isActive
  const { isLit, rowProps } = useFluidRow({
    itemKey: value,
    disabled: props.disabled,
    onActivate: () => {
      feedback("note", { pitch: noteStep(index) })
      onValueChange(value)
    },
    onLayout,
    onPressIn,
    onPressOut,
    onHoverIn,
    onHoverOut,
  })
  return (
    <TextStyle
      eases
      className={cn(
        tabsTriggerTextVariants(),
        isActive
          ? tabsTriggerActiveTextVariants()
          : isLit
            ? tabsTriggerLitTextVariants()
            : undefined
      )}
    >
      <IconProvider strokeWidth={isActive || isLit ? 2 : 1.5}>
        <TabsPrimitive.Trigger
          data-slot="tabs-trigger"
          data-state={isActive ? "active" : "inactive"}
          data-orientation={orientation}
          data-variant={variant}
          value={value}
          // Up and down only: sideways it would take a neighbour's press.
          hitSlop={{ top: 8, bottom: 8 }}
          // Not flex-1: its zero basis collapses a tab in a list that fits its tabs.
          className={cn(
            "cn-tabs-trigger relative grow flex-row items-center justify-center disabled:opacity-50 data-[orientation=vertical]:flex-none data-[orientation=vertical]:justify-start",
            className
          )}
          onPress={(event) => {
            feedback("note", { pitch: noteStep(index) })
            onPress?.(event)
          }}
          accessibilityLabel={
            isIconOnly ? getTextContent(children) : undefined
          }
          {...rowProps}
          {...props}
        >
          {isIconOnly
            ? React.Children.toArray(children).filter(React.isValidElement)
            : renderLabels(children)}
        </TabsPrimitive.Trigger>
      </IconProvider>
    </TextStyle>
  )
}

function TabsContent({
  className,
  value,
  keepMounted = false,
  children,
  ...props
}: Omit<TabsPrimitive.ContentProps, "children" | "forceMount"> & {
  keepMounted?: boolean
  children?: React.ReactNode
}) {
  const { value: selected } = TabsPrimitive.useRootContext()
  return (
    <TextStyle className="cn-tabs-content-text">
      <TabsPrimitive.Content
        data-slot="tabs-content"
        value={value}
        forceMount={keepMounted ? true : undefined}
        className={cn(
          "cn-tabs-content flex-1",
          selected !== value && "hidden",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
      </TabsPrimitive.Content>
    </TextStyle>
  )
}

export { Tabs, TabsContent, TabsList, tabsListVariants, TabsTrigger }
