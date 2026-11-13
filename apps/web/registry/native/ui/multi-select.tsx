import * as React from "react"
import {
  CheckIcon,
  ChevronsUpDownIcon,
  IconProvider,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { Pressable, ScrollView, TextInput, View } from "react-native"
import Animated, {
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import { getTouchSlop } from "@/registry/native/lib/density-scale"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  filterItems,
  getItemLabel,
  isItemSelected,
  removeItem,
  selectItem,
  type ItemFilter,
} from "@/registry/native/lib/filter-model"
import {
  FluidHoverArea,
  FluidHoverHighlight,
  FluidHoverProvider,
  useFluidHover,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { Button } from "@/registry/native/ui/button"
import { Dialog, DialogContent } from "@/registry/native/ui/dialog"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// The website's Multi Select floats a list under the field. A phone has no
// room beside the keyboard, so here the field opens the list in a dialog, as
// Combobox does, and picking keeps it open. Filtering and selection follow
// Base UI's. Chips rise in, shrink out and the rest glide over on the move
// timing (the website wipes them out; a view can't clip-path).

type MultiSelectState = {
  items: readonly unknown[]
  isEmpty: boolean
  disabled: boolean
  selection: readonly unknown[]
  isOpen: boolean
  setOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
  isSelected: (item: unknown) => boolean
  toggle: (item: unknown) => void
  remove: (item: unknown) => void
  getLabel: (item: unknown) => string
  /** Inside the dialog, where the search takes text. */
  isInPopup: boolean
}

const MultiSelectContext = React.createContext<MultiSelectState | null>(null)

function useMultiSelect() {
  const context = React.use(MultiSelectContext)
  if (!context) {
    throw new Error("MultiSelect parts must be used within a <MultiSelect />")
  }
  return context
}

type MultiSelectProps<TValue> = {
  children?: React.ReactNode
  /** A flat list, or groups of `{ value, items }`. */
  items?: readonly unknown[]
  /** Skips the built-in filter, for lists that filter on a server. */
  filteredItems?: readonly unknown[]
  /** `null` keeps every item. */
  filter?: ItemFilter | null
  limit?: number
  value?: readonly TValue[]
  defaultValue?: readonly TValue[]
  onValueChange?: (value: TValue[]) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  inputValue?: string
  defaultInputValue?: string
  onInputValueChange?: (value: string) => void
  disabled?: boolean
  /** Keyboard only on the website. Accepted, and changes nothing here. */
  autoHighlight?: boolean
  itemToStringLabel?: (item: TValue) => string
  isItemEqualToValue?: (item: TValue, value: TValue) => boolean
}

function MultiSelect<TValue = string>(
  props: MultiSelectProps<TValue>
): React.ReactNode
function MultiSelect({
  children,
  items = [],
  filteredItems,
  filter,
  limit,
  value,
  defaultValue = [],
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  inputValue,
  defaultInputValue = "",
  onInputValueChange,
  disabled = false,
  itemToStringLabel,
  isItemEqualToValue,
}: MultiSelectProps<unknown>) {
  const [selection = [], setSelection] = useControllableState<
    readonly unknown[]
  >({
    prop: value,
    defaultProp: defaultValue,
    onChange: (next) => onValueChange?.([...next]),
  })
  const [isOpen = false, setIsOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const [query = "", setQuery] = useControllableState({
    prop: inputValue,
    defaultProp: defaultInputValue,
    onChange: onInputValueChange,
  })

  const visibleItems = React.useMemo(() => {
    const kept =
      filteredItems ??
      filterItems(items, query, { filter, itemToString: itemToStringLabel })
    return limit === undefined ? kept : kept.slice(0, limit)
  }, [filter, filteredItems, itemToStringLabel, items, limit, query])

  const state: MultiSelectState = {
    items: visibleItems,
    isEmpty: visibleItems.length === 0,
    disabled,
    selection,
    isOpen,
    setOpen(next) {
      if (disabled) return
      setIsOpen(next)
      if (!next) setQuery("")
    },
    query,
    setQuery,
    isSelected: (item) => isItemSelected(selection, item, isItemEqualToValue),
    // Picking one of several keeps the list open for the next.
    toggle(item) {
      setSelection(
        selectItem(selection, item, {
          multiple: true,
          isEqual: isItemEqualToValue,
        })
      )
      if (query !== "") setQuery("")
    },
    remove(item) {
      setSelection(removeItem(selection, item, isItemEqualToValue))
    },
    getLabel: (item) => getItemLabel(item, itemToStringLabel),
    isInPopup: false,
  }

  return <MultiSelectContext value={state}>{children}</MultiSelectContext>
}

function MultiSelectTrigger({
  className,
  children,
  "aria-invalid": isInvalid,
  accessibilityLabel,
  disabled,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  children?: React.ReactNode
  "aria-invalid"?: boolean
}) {
  const multiSelect = useMultiSelect()
  const isDisabled = disabled ?? multiSelect.disabled
  const iconSize = parseNumber(useCSSVariable("--density-icon-16"), 16)
  const open = () => multiSelect.setOpen(true)
  return (
    // A press anywhere on the field opens it. The field itself isn't one
    // accessible element, so screen readers reach each chip's remove button;
    // the chevron is the combobox they open it with.
    <Pressable
      data-slot="multi-select-trigger"
      data-has-chips={multiSelect.selection.length > 0}
      data-invalid={Boolean(isInvalid)}
      data-open={multiSelect.isOpen}
      accessible={false}
      disabled={isDisabled}
      onPress={(event) => {
        open()
        onPress?.(event)
      }}
      className={cn(
        "cn-multi-select-trigger w-full flex-row items-center disabled:opacity-50",
        className
      )}
      {...props}
    >
      <View
        data-slot="multi-select-chips"
        className="cn-multi-select-chips min-w-0 flex-1 flex-row flex-wrap items-center"
      >
        {renderTextChildren(children)}
      </View>
      <Pressable
        data-slot="multi-select-icon"
        role="combobox"
        accessibilityLabel={accessibilityLabel}
        aria-expanded={multiSelect.isOpen}
        aria-disabled={isDisabled}
        aria-invalid={isInvalid}
        disabled={isDisabled}
        hitSlop={getTouchSlop(iconSize)}
        onPress={open}
        className="items-center"
      >
        <TextStyle className="cn-multi-select-icon">
          <ChevronsUpDownIcon aria-hidden />
        </TextStyle>
      </Pressable>
    </Pressable>
  )
}

/** A chip rises in and shrinks out on the move timing; the rest glide over. */
function useChipMotion() {
  const motion = useMotion("move")
  return React.useMemo(() => {
    if (motion.isOff) {
      return { entering: undefined, exiting: undefined, layout: undefined }
    }
    const enter = {
      duration: motion.enterMs,
      easing: motion.enterEasing,
      reduceMotion: ReduceMotion.Never,
    }
    const exit = {
      duration: motion.exitMs,
      easing: motion.exitEasing,
      reduceMotion: ReduceMotion.Never,
    }
    // Reduce Motion keeps the fade and drops the rise, the zoom and the glide.
    const rise = motion.isReduced ? 0 : 6
    const zoom = motion.isReduced ? 1 : 0.92
    return {
      entering: () => {
        "worklet"
        return {
          initialValues: {
            opacity: 0,
            transform: [{ translateY: rise }, { scale: zoom }],
          },
          animations: {
            opacity: withTiming(1, enter),
            transform: [
              { translateY: withTiming(0, enter) },
              { scale: withTiming(1, enter) },
            ],
          },
        }
      },
      exiting: () => {
        "worklet"
        return {
          initialValues: { opacity: 1, transform: [{ scale: 1 }] },
          animations: {
            opacity: withTiming(0, exit),
            transform: [{ scale: withTiming(zoom, exit) }],
          },
        }
      },
      layout: motion.isReduced
        ? undefined
        : LinearTransition.duration(motion.enterMs)
            .easing(motion.moveEasing)
            .reduceMotion(ReduceMotion.Never),
    }
  }, [motion])
}

function MultiSelectValue<TItem = string>(
  props: Omit<React.ComponentProps<typeof View>, "children"> & {
    /** What a chip shows for an item; its label by default. */
    children?: (item: TItem) => React.ReactNode
  }
): React.ReactNode
function MultiSelectValue({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  children?: (item: unknown) => React.ReactNode
}) {
  const multiSelect = useMultiSelect()
  const chipMotion = useChipMotion()
  return (
    <View
      data-slot="multi-select-value"
      data-empty={multiSelect.selection.length === 0}
      className={cn(
        "cn-multi-select-value min-w-0 flex-row flex-wrap items-center",
        className
      )}
      {...props}
    >
      {multiSelect.selection.map((item) => {
        const label = multiSelect.getLabel(item)
        return (
          <Animated.View
            key={label}
            entering={chipMotion.entering}
            exiting={chipMotion.exiting}
            layout={chipMotion.layout}
          >
            <TextStyle className="cn-multi-select-chip-text">
              <View
                data-slot="multi-select-chip"
                accessibilityLabel={label}
                className="cn-multi-select-chip flex-row items-center"
              >
                <Text
                  numberOfLines={1}
                  className="cn-multi-select-chip-label shrink"
                >
                  {children ? children(item) : label}
                </Text>
                <Button
                  data-slot="multi-select-chip-remove"
                  variant="ghost"
                  size="icon-xs"
                  accessibilityLabel={`Remove ${label}`}
                  disabled={multiSelect.disabled}
                  onPress={() => multiSelect.remove(item)}
                  className="cn-multi-select-chip-remove"
                >
                  <TextStyle className="cn-multi-select-chip-remove-icon">
                    <XIcon aria-hidden />
                  </TextStyle>
                </Button>
              </View>
            </TextStyle>
          </Animated.View>
        )
      })}
    </View>
  )
}

function MultiSelectInput({
  className,
  placeholder,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  const multiSelect = useMultiSelect()
  if (multiSelect.isInPopup) {
    return (
      <View className="cn-multi-select-search flex-row items-center">
        <TextInput
          data-slot="multi-select-input"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          placeholder={placeholder ?? "Search"}
          placeholderTextColorClassName="accent-muted-foreground"
          selectionColorClassName="accent-primary"
          value={multiSelect.query}
          onChangeText={multiSelect.setQuery}
          editable={!multiSelect.disabled}
          className={cn("cn-multi-select-input min-w-0 flex-1", className)}
          {...props}
        />
      </View>
    )
  }
  // In the field the search is a prompt; the dialog takes the typing. Once
  // something is picked, the chips say what the field is for.
  if (multiSelect.selection.length > 0) return null
  return (
    <Text
      data-slot="multi-select-input"
      numberOfLines={1}
      className={cn("cn-multi-select-placeholder min-w-16 flex-1", className)}
    >
      {placeholder}
    </Text>
  )
}

function MultiSelectContent({
  className,
  side: _side,
  sideOffset: _sideOffset,
  align: _align,
  alignOffset: _alignOffset,
  anchor: _anchor,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  align?: "start" | "center" | "end"
  alignOffset?: number
  anchor?: React.RefObject<React.ComponentRef<typeof View> | null>
}) {
  const multiSelect = useMultiSelect()
  const hasInput = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === MultiSelectInput
  )
  // The dialog portals out of the React tree: the state has to go with it.
  const state = React.useMemo(
    () => ({ ...multiSelect, isInPopup: true }),
    [multiSelect]
  )
  return (
    <Dialog open={multiSelect.isOpen} onOpenChange={multiSelect.setOpen}>
      <DialogContent
        data-slot="multi-select-content"
        showCloseButton={false}
        className={cn("cn-multi-select-content", className)}
        {...props}
      >
        <MultiSelectContext value={state}>
          {!hasInput && <MultiSelectInput />}
          {children}
        </MultiSelectContext>
      </DialogContent>
    </Dialog>
  )
}

type MultiSelectListProps<TItem> = Omit<
  React.ComponentProps<typeof ScrollView>,
  "children"
> & {
  children?: React.ReactNode | ((item: TItem, index: number) => React.ReactNode)
}

function MultiSelectList<TItem = string>(
  props: MultiSelectListProps<TItem>
): React.ReactNode
function MultiSelectList({
  className,
  children,
  onLayout,
  onContentSizeChange,
  ...props
}: MultiSelectListProps<unknown>) {
  const { items, isEmpty } = useMultiSelect()
  const [viewport, setViewport] = React.useState(0)
  const [content, setContent] = React.useState(0)
  const fluid = useFluidHover({
    track: content > viewport + 1 ? "hold" : "drag",
  })
  return (
    <ScrollView
      data-slot="multi-select-list"
      data-empty={isEmpty}
      role="list"
      keyboardShouldPersistTaps="handled"
      className={cn("cn-multi-select-list grow-0", className)}
      onLayout={(event) => {
        setViewport(event.nativeEvent.layout.height)
        onLayout?.(event)
      }}
      onContentSizeChange={(width, height) => {
        setContent(height)
        onContentSizeChange?.(width, height)
      }}
      {...props}
    >
      <FluidHoverProvider fluid={fluid}>
        <FluidHoverArea fluid={fluid}>
          <View ref={fluid.attach} className="relative">
            {/* A finger is the press: the highlight takes the pressed fill
                the website's highlight takes while a row is held. */}
            <FluidHoverHighlight
              hover={fluid.hover}
              className="cn-multi-select-highlight"
            />
            {typeof children === "function"
              ? items.map(children)
              : renderTextChildren(children)}
          </View>
        </FluidHoverArea>
      </FluidHoverProvider>
    </ScrollView>
  )
}

/** The check scales in from 0.9 on the move timing and out on its exit. */
function ItemIndicator({ isSelected }: { isSelected: boolean }) {
  const motion = useMotion("move")
  const progress = useSharedValue(isSelected ? 1 : 0)
  React.useEffect(() => {
    progress.set(
      withTiming(isSelected ? 1 : 0, {
        duration: isSelected ? motion.enterMs : motion.exitMs,
        easing: isSelected ? motion.enterEasing : motion.exitEasing,
      })
    )
  }, [isSelected, motion, progress])
  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: 0.9 + progress.get() * 0.1 }],
  }))
  return (
    <TextStyle className="cn-multi-select-item-indicator-icon">
      <Animated.View
        data-slot="multi-select-item-indicator"
        aria-hidden
        style={style}
        className="cn-multi-select-item-indicator absolute items-center justify-center"
      >
        <CheckIcon aria-hidden />
      </Animated.View>
    </TextStyle>
  )
}

function MultiSelectItem({
  className,
  children,
  value,
  disabled,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children" | "onPress"> & {
  children?: React.ReactNode
  value?: unknown
  onPress?: () => void
}) {
  const multiSelect = useMultiSelect()
  const isSelected = multiSelect.isSelected(value)
  const feedback = useFeedback()
  const pick = () => {
    feedback("pick")
    multiSelect.toggle(value)
    onPress?.()
  }
  const { isLit, rowProps } = useFluidRow({
    ...props,
    disabled,
    onActivate: pick,
  })
  return (
    <Pressable
      data-slot="multi-select-item"
      data-selected={isSelected}
      data-disabled={Boolean(disabled)}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled ?? undefined}
      disabled={disabled}
      onPress={pick}
      className={cn(
        "cn-multi-select-item relative w-full flex-row items-center disabled:opacity-50",
        className
      )}
      {...props}
      {...rowProps}
    >
      <TextStyle
        eases
        className={
          isSelected
            ? cn("cn-multi-select-item-text-selected")
            : isLit
              ? cn("cn-multi-select-item-text-lit")
              : cn("cn-multi-select-item-text")
        }
      >
        <IconProvider strokeWidth={isLit ? 2 : 1.5}>
          {renderTextChildren(children)}
        </IconProvider>
      </TextStyle>
      <ItemIndicator isSelected={isSelected} />
    </Pressable>
  )
}

const MultiSelectGroupContext = React.createContext<readonly unknown[] | null>(
  null
)

function MultiSelectGroup({
  className,
  children,
  items,
  ...props
}: React.ComponentProps<typeof View> & { items?: readonly unknown[] }) {
  return (
    <MultiSelectGroupContext value={items ?? null}>
      <View
        data-slot="multi-select-group"
        role="group"
        className={cn("cn-multi-select-group", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </MultiSelectGroupContext>
  )
}

function MultiSelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="multi-select-label"
      className={cn("cn-multi-select-label", className)}
      {...props}
    />
  )
}

function MultiSelectCollection<TItem = string>(props: {
  children: (item: TItem, index: number) => React.ReactNode
}): React.ReactNode
function MultiSelectCollection({
  children,
}: {
  children: (item: unknown, index: number) => React.ReactNode
}) {
  const { items } = useMultiSelect()
  const groupItems = React.use(MultiSelectGroupContext)
  return (
    <View data-slot="multi-select-collection">
      {(groupItems ?? items).map(children)}
    </View>
  )
}

function MultiSelectEmpty({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { isEmpty } = useMultiSelect()
  if (!isEmpty) return null
  return (
    <Text
      data-slot="multi-select-empty"
      className={cn("cn-multi-select-empty w-full", className)}
      {...props}
    />
  )
}

function MultiSelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="multi-select-separator"
      role="separator"
      className={cn("cn-multi-select-separator", className)}
      {...props}
    />
  )
}

export {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectInput,
  MultiSelectContent,
  MultiSelectList,
  MultiSelectItem,
  MultiSelectGroup,
  MultiSelectLabel,
  MultiSelectCollection,
  MultiSelectEmpty,
  MultiSelectSeparator,
}
