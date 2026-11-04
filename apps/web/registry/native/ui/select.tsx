import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import * as PopoverPrimitive from "@rn-primitives/popover"
import { cn } from "cn"
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from "react-native"
import Animated from "react-native-reanimated"

import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  COLLISION_INSETS,
  getMenuMaxHeight,
  getTextContent,
  getVerticalSide,
  useTriggerOpen,
} from "@/registry/native/lib/overlay-model"
import {
  getSelectLabel,
  getSelectPresentation,
  isSelectValueEmpty,
  isValueSelected,
  toggleSelectValue,
  type SelectItems,
} from "@/registry/native/lib/select-model"
import {
  SheetSurface,
  SheetSurfaceScrollView,
} from "@/registry/native/lib/sheet-surface"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type SelectContextValue = {
  value: unknown
  items: SelectItems | undefined
  labels: ReadonlyMap<unknown, string>
  multiple: boolean
  disabled: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  triggerRef: React.RefObject<PopoverPrimitive.TriggerRef | null>
  choose: (value: unknown) => void
  registerLabel: (value: unknown, label: string) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelect() {
  const context = React.use(SelectContext)
  if (!context) throw new Error("useSelect must be used within a Select.")
  return context
}

function Select<Value = string, Multiple extends boolean | undefined = false>({
  items,
  value,
  defaultValue,
  onValueChange,
  multiple,
  open,
  defaultOpen,
  onOpenChange,
  disabled = false,
  ...props
}: Omit<PopoverPrimitive.RootProps, "onOpenChange"> & {
  items?: SelectItems
  value?: (Multiple extends true ? readonly Value[] : Value) | null
  defaultValue?: (Multiple extends true ? readonly Value[] : Value) | null
  onValueChange?: (
    value: Multiple extends true ? Value[] : Value | null
  ) => void
  multiple?: Multiple
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
}) {
  const trigger = useTriggerOpen<PopoverPrimitive.TriggerRef>({
    open,
    defaultOpen,
    onOpenChange,
  })
  const [current, setCurrent] = useControllableState<unknown>({
    prop: value,
    defaultProp: defaultValue ?? null,
    // The one place the values, untyped inside, meet the caller's own type.
    onChange: (next) => onValueChange?.(next as never),
  })
  const [labels, setLabels] = React.useState<ReadonlyMap<unknown, string>>(
    () => new Map()
  )
  const registerLabel = React.useCallback((entry: unknown, label: string) => {
    setLabels((previous) =>
      previous.get(entry) === label
        ? previous
        : new Map(previous).set(entry, label)
    )
  }, [])
  const isMultiple = Boolean(multiple)
  const { isOpen, setIsOpen, triggerRef } = trigger
  const context: SelectContextValue = {
    value: current,
    items,
    labels,
    multiple: isMultiple,
    disabled,
    isOpen,
    setIsOpen,
    triggerRef,
    registerLabel,
    choose: (next) => {
      setCurrent(toggleSelectValue(current, next, isMultiple))
      if (!isMultiple) setIsOpen(false)
    },
  }
  return (
    <SelectContext value={context}>
      <PopoverPrimitive.Root
        data-slot="select"
        onOpenChange={trigger.onOpenChange}
        {...props}
      />
    </SelectContext>
  )
}

function SelectGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="select-group"
      role="group"
      className={cn("cn-select-group", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function SelectValue({
  className,
  children,
  placeholder,
  ...props
}: Omit<React.ComponentProps<typeof Text>, "children"> & {
  children?: React.ReactNode | ((value: unknown) => React.ReactNode)
  placeholder?: React.ReactNode
}) {
  const { items, labels, value } = useSelect()
  const isEmpty = isSelectValueEmpty(value)
  const labelOf = (entry: unknown) =>
    getSelectLabel(items, entry) ?? labels.get(entry) ?? String(entry)
  const label = Array.isArray(value)
    ? value.map(labelOf).join(", ")
    : labelOf(value)
  const content =
    typeof children === "function"
      ? children(value)
      : (children ??
        (isEmpty ? (getSelectLabel(items, null) ?? placeholder) : label))
  return (
    <Text
      data-slot="select-value"
      data-placeholder={isEmpty}
      numberOfLines={1}
      className={cn("cn-select-value shrink grow", className)}
      {...props}
    >
      {content}
    </Text>
  )
}

function SelectTrigger({
  className,
  size = "default",
  disabled,
  "aria-invalid": isInvalid,
  children,
  ...props
}: Omit<PopoverPrimitive.TriggerProps, "children"> & {
  size?: "sm" | "default"
  "aria-invalid"?: boolean
  children?: React.ReactNode
}) {
  const select = useSelect()
  return (
    <DensityScope density={size === "sm" ? "compact" : undefined}>
      <TextStyle className="cn-select-trigger-text">
        <PopoverPrimitive.Trigger
          ref={select.triggerRef}
          data-slot="select-trigger"
          data-size={size}
          data-invalid={Boolean(isInvalid)}
          role="combobox"
          aria-invalid={isInvalid}
          disabled={disabled ?? select.disabled}
          className={cn(
            "cn-select-trigger flex-row items-center justify-between disabled:opacity-50",
            className
          )}
          {...props}
        >
          {renderTextChildren(children)}
          <View className="cn-select-trigger-icon shrink-0">
            <TextStyle className="cn-select-trigger-icon-text">
              <ChevronDownIcon />
            </TextStyle>
          </View>
        </PopoverPrimitive.Trigger>
      </TextStyle>
    </DensityScope>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  insets = COLLISION_INSETS,
  ...props
}: Omit<PopoverPrimitive.ContentProps, "side"> & {
  side?: "top" | "right" | "bottom" | "left"
  /** On the website this lines the selected item up with the trigger. */
  alignItemWithTrigger?: boolean
}) {
  const select = useSelect()
  const density = useDensity()
  const { entering, exiting } = useSurfaceAnimation("popup")
  const { width, height } = useWindowDimensions()
  const presentation = getSelectPresentation(width)

  if (presentation === "sheet") {
    return (
      <SheetSurface
        data-slot="select-content"
        data-presentation={presentation}
        open={select.isOpen}
        onOpenChange={select.setIsOpen}
        side="bottom"
        className={cn("cn-select-content cn-select-content-logical", className)}
      >
        <SelectContext value={select}>
          <TextStyle className="cn-select-text">
            <View className="cn-select-sheet-handle items-center">
              <View className="cn-select-sheet-handle-bar" />
            </View>
            <SheetSurfaceScrollView role="list">
              {renderTextChildren(children)}
            </SheetSurfaceScrollView>
          </TextStyle>
        </SelectContext>
      </SheetSurface>
    )
  }

  return (
    <PopoverPrimitive.Portal>
      <DensityScope density={density}>
        <PopoverPrimitive.Overlay aria-modal className="absolute inset-0">
          <PopoverPrimitive.Content
            side={getVerticalSide(side)}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            insets={insets}
            {...props}
          >
            <Animated.View
              data-slot="select-content"
              data-presentation={presentation}
              data-align-trigger={alignItemWithTrigger}
              entering={entering}
              exiting={exiting}
              className={cn(
                "cn-select-content cn-select-content-logical",
                className
              )}
            >
              <SelectContext value={select}>
                <TextStyle className="cn-select-text">
                  <ScrollView
                    role="list"
                    alwaysBounceVertical={false}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: getMenuMaxHeight(height) }}
                  >
                    {renderTextChildren(children)}
                  </ScrollView>
                </TextStyle>
              </SelectContext>
            </Animated.View>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Overlay>
      </DensityScope>
    </PopoverPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="select-label"
      className={cn("cn-select-label", className)}
      {...props}
    />
  )
}

// A selected row reads foreground and semibold.
function SelectItemText({
  isSelected,
  children,
}: {
  isSelected: boolean
  children?: React.ReactNode
}) {
  if (!isSelected) {
    return <TextStyle className="cn-select-item-label">{children}</TextStyle>
  }
  return (
    <TextStyle className="cn-select-item-label cn-select-item-label-selected">
      {children}
    </TextStyle>
  )
}

function SelectItem({
  className,
  children,
  value = null,
  label,
  disabled,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  value?: unknown
  /** What the trigger shows when the children aren't plain text. */
  label?: string
  children?: React.ReactNode
}) {
  const { choose, multiple, registerLabel, value: current } = useSelect()
  const isSelected = isValueSelected(current, value, multiple)
  const text = label ?? getTextContent(children)
  React.useEffect(() => {
    registerLabel(value, text)
  }, [registerLabel, text, value])
  return (
    <SelectItemText isSelected={isSelected}>
      <Pressable
        data-slot="select-item"
        data-selected={isSelected}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled ?? undefined}
        disabled={disabled}
        className={cn(
          "cn-select-item relative w-full flex-row items-center disabled:opacity-50",
          className
        )}
        onPress={(event: GestureResponderEvent) => {
          choose(value)
          onPress?.(event)
        }}
        {...props}
      >
        <View className="cn-select-item-text shrink flex-row items-center">
          {renderTextChildren(children)}
        </View>
        {isSelected ? (
          <View
            pointerEvents="none"
            className="cn-select-item-indicator cn-select-item-indicator-icon absolute items-center justify-center"
          >
            <TextStyle className="cn-select-item-indicator-text">
              <CheckIcon />
            </TextStyle>
          </View>
        ) : null}
      </Pressable>
    </SelectItemText>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="select-separator"
      role="separator"
      pointerEvents="none"
      className={cn("cn-select-separator", className)}
      {...props}
    />
  )
}

/**
 * On the website these scroll a long list under a pointer. A touch list scrolls
 * itself, so SelectContent doesn't render them; they show an arrow if placed.
 */
function SelectScrollUpButton({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-select-scroll-button-text">
      <View
        data-slot="select-scroll-up-button"
        aria-hidden
        className={cn(
          "cn-select-scroll-up-button w-full items-center justify-center",
          className
        )}
        {...props}
      >
        {children ?? <ChevronUpIcon />}
      </View>
    </TextStyle>
  )
}

function SelectScrollDownButton({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-select-scroll-button-text">
      <View
        data-slot="select-scroll-down-button"
        aria-hidden
        className={cn(
          "cn-select-scroll-down-button w-full items-center justify-center",
          className
        )}
        {...props}
      >
        {children ?? <ChevronDownIcon />}
      </View>
    </TextStyle>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
