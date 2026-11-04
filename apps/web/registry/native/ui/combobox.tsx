import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { Pressable, ScrollView, TextInput, View } from "react-native"

import {
  filterItems,
  getChildrenText,
  getItemLabel,
  isItemSelected,
  removeItem,
  selectItem,
  type ItemFilter,
} from "@/registry/native/lib/filter-model"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { Button } from "@/registry/native/ui/button"
import { Dialog, DialogContent } from "@/registry/native/ui/dialog"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// The website's combobox floats a list under the field. A phone has no room
// beside the keyboard, so here the field in the page opens the list in a dialog,
// where the typing happens. Filtering and selection follow Base UI's.

type ComboboxState = {
  items: readonly unknown[]
  isEmpty: boolean
  multiple: boolean
  disabled: boolean
  selection: readonly unknown[]
  isOpen: boolean
  setOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
  isSelected: (item: unknown) => boolean
  select: (item: unknown) => void
  remove: (item: unknown) => void
  clear: () => void
  getLabel: (item: unknown) => string
  /** Inside the dialog, where the field takes text. */
  isInPopup: boolean
}

const ComboboxContext = React.createContext<ComboboxState | null>(null)

function useCombobox() {
  const context = React.use(ComboboxContext)
  if (!context) {
    throw new Error("Combobox parts must be used within a <Combobox />")
  }
  return context
}

type ComboboxValueProps<TValue> =
  | {
      multiple?: false
      value?: TValue | null
      defaultValue?: TValue | null
      onValueChange?: (value: TValue | null) => void
    }
  | {
      multiple: true
      value?: readonly TValue[]
      defaultValue?: readonly TValue[]
      onValueChange?: (value: TValue[]) => void
    }

type ComboboxProps<TValue> = ComboboxValueProps<TValue> & {
  children?: React.ReactNode
  /** A flat list, or groups of `{ value, items }`. */
  items?: readonly unknown[]
  /** Skips the built-in filter, for lists that filter on a server. */
  filteredItems?: readonly unknown[]
  /** `null` keeps every item. */
  filter?: ItemFilter | null
  limit?: number
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

function toSelection(
  value: unknown,
  multiple: boolean
): readonly unknown[] | undefined {
  if (value === undefined) return undefined
  if (multiple) return Array.isArray(value) ? value : []
  return value === null ? [] : [value]
}

function Combobox<TValue = string>(
  props: ComboboxProps<TValue>
): React.ReactNode
function Combobox(props: ComboboxProps<unknown>) {
  const {
    children,
    items = [],
    filteredItems,
    filter,
    limit,
    open,
    defaultOpen = false,
    onOpenChange,
    inputValue,
    defaultInputValue = "",
    onInputValueChange,
    disabled = false,
    itemToStringLabel,
    isItemEqualToValue,
  } = props
  const multiple = props.multiple === true

  const [selection = [], setSelection] = useControllableState<
    readonly unknown[]
  >({
    prop: toSelection(props.value, multiple),
    defaultProp: toSelection(props.defaultValue, multiple) ?? [],
    onChange: (next) => {
      if (props.multiple === true) props.onValueChange?.([...next])
      else props.onValueChange?.(next[0] ?? null)
    },
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

  const state: ComboboxState = {
    items: visibleItems,
    isEmpty: visibleItems.length === 0,
    multiple,
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
    select(item) {
      setSelection(
        selectItem(selection, item, { multiple, isEqual: isItemEqualToValue })
      )
      setQuery("")
      if (!multiple) setIsOpen(false)
    },
    remove(item) {
      setSelection(removeItem(selection, item, isItemEqualToValue))
    },
    clear() {
      setSelection([])
      setQuery("")
    },
    getLabel: (item) => getItemLabel(item, itemToStringLabel),
    isInPopup: false,
  }

  return <ComboboxContext value={state}>{children}</ComboboxContext>
}

function ComboboxValue<TValue = string[]>(
  props: Omit<React.ComponentProps<typeof Text>, "children"> & {
    children?: React.ReactNode | ((value: TValue) => React.ReactNode)
    placeholder?: React.ReactNode
  }
): React.ReactNode
function ComboboxValue({
  children,
  placeholder,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Text>, "children"> & {
  children?: React.ReactNode | ((value: unknown) => React.ReactNode)
  placeholder?: React.ReactNode
}) {
  const { selection, multiple, getLabel } = useCombobox()
  if (typeof children === "function") {
    return children(multiple ? selection : (selection[0] ?? null))
  }
  const label = selection.map(getLabel).join(", ")
  return (
    <Text
      data-slot="combobox-value"
      numberOfLines={1}
      className={className}
      {...props}
    >
      {children ?? (label || placeholder)}
    </Text>
  )
}

function ComboboxTrigger({
  className,
  children,
  render,
  asChild,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const combobox = useCombobox()
  const isDisabled = props.disabled ?? combobox.disabled
  const shared = {
    "data-slot": "combobox-trigger",
    role: "combobox" as const,
    "aria-expanded": combobox.isOpen,
    "aria-disabled": isDisabled,
    hitSlop: 8,
    onPress: (event: Parameters<NonNullable<typeof onPress>>[0]) => {
      combobox.setOpen(true)
      onPress?.(event)
    },
    className: cn("cn-combobox-trigger flex-row items-center", className),
    ...props,
    disabled: isDisabled,
  }
  if (asChild) return renderSlot({ asChild }, shared, children)
  const content = (
    <>
      {renderTextChildren(children)}
      <TextStyle className="cn-combobox-trigger-icon">
        <ChevronDownIcon aria-hidden />
      </TextStyle>
    </>
  )
  return (
    renderSlot({ render }, shared, content) ?? (
      <Pressable {...shared}>{content}</Pressable>
    )
  )
}

function ComboboxClear({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const combobox = useCombobox()
  return (
    <Button
      data-slot="combobox-clear"
      variant="ghost"
      size="icon-xs"
      accessibilityLabel="Clear"
      onPress={combobox.clear}
      className={cn("cn-combobox-clear", className)}
      {...props}
    >
      <TextStyle className="cn-combobox-clear-icon">
        <XIcon aria-hidden />
      </TextStyle>
    </Button>
  )
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  placeholder,
  "aria-invalid": isInvalid,
  autoFocus,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  disabled?: boolean
  showTrigger?: boolean
  showClear?: boolean
  "aria-invalid"?: boolean
}) {
  const combobox = useCombobox()
  const isDisabled = disabled || combobox.disabled
  const hasClear = showClear && combobox.selection.length > 0

  if (combobox.isInPopup) {
    return (
      <View
        data-popup
        className={cn(
          "cn-combobox-input w-auto flex-row items-center",
          className
        )}
      >
        <TextInput
          data-slot="combobox-input"
          autoFocus={autoFocus ?? true}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          placeholder={placeholder ?? "Search"}
          placeholderTextColorClassName="accent-muted-foreground"
          selectionColorClassName="accent-primary"
          value={combobox.query}
          onChangeText={combobox.setQuery}
          editable={!isDisabled}
          className="cn-combobox-input-field min-w-0 flex-1"
          {...props}
        />
        {hasClear && <ComboboxClear disabled={isDisabled} />}
        {children}
      </View>
    )
  }

  const label = combobox.selection.map(combobox.getLabel).join(", ")
  return (
    <Pressable
      role="combobox"
      data-open={combobox.isOpen}
      data-invalid={Boolean(isInvalid)}
      aria-expanded={combobox.isOpen}
      aria-disabled={isDisabled}
      aria-invalid={isInvalid}
      disabled={isDisabled}
      onPress={() => combobox.setOpen(true)}
      className={cn(
        "cn-combobox-input w-auto flex-row items-center disabled:opacity-50",
        className
      )}
    >
      <Text
        numberOfLines={1}
        data-empty={!label}
        className="cn-combobox-input-text min-w-0 flex-1"
      >
        {label || placeholder}
      </Text>
      {showTrigger && !hasClear && (
        <ComboboxTrigger
          data-slot="input-group-button"
          disabled={isDisabled}
          accessibilityLabel="Open"
        />
      )}
      {hasClear && <ComboboxClear disabled={isDisabled} />}
      {children}
    </Pressable>
  )
}

function ComboboxContent({
  className,
  side: _side,
  sideOffset: _sideOffset,
  align: _align,
  alignOffset: _alignOffset,
  anchor,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  align?: "start" | "center" | "end"
  alignOffset?: number
  anchor?: React.RefObject<React.ComponentRef<typeof View> | null>
}) {
  const combobox = useCombobox()
  const hasInput = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === ComboboxInput
  )
  // The dialog portals out of the React tree: the state has to go with it.
  const state = React.useMemo(
    () => ({ ...combobox, isInPopup: true }),
    [combobox]
  )
  return (
    <Dialog open={combobox.isOpen} onOpenChange={combobox.setOpen}>
      <DialogContent
        data-slot="combobox-content"
        data-chips={Boolean(anchor)}
        showCloseButton={false}
        className={cn(
          "cn-combobox-content cn-combobox-content-logical",
          className
        )}
        {...props}
      >
        <ComboboxContext value={state}>
          {!hasInput && <ComboboxInput />}
          {children}
        </ComboboxContext>
      </DialogContent>
    </Dialog>
  )
}

type ComboboxListProps<TItem> = Omit<
  React.ComponentProps<typeof ScrollView>,
  "children"
> & {
  children?: React.ReactNode | ((item: TItem, index: number) => React.ReactNode)
}

function ComboboxList<TItem = string>(
  props: ComboboxListProps<TItem>
): React.ReactNode
function ComboboxList({
  className,
  children,
  ...props
}: ComboboxListProps<unknown>) {
  const { items, isEmpty } = useCombobox()
  return (
    <ScrollView
      data-slot="combobox-list"
      data-empty={isEmpty}
      role="list"
      keyboardShouldPersistTaps="handled"
      className={cn("cn-combobox-list grow-0", className)}
      {...props}
    >
      {typeof children === "function"
        ? items.map(children)
        : renderTextChildren(children)}
    </ScrollView>
  )
}

function ComboboxItem({
  className,
  children,
  value,
  disabled,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  children?: React.ReactNode
  value?: unknown
}) {
  const combobox = useCombobox()
  const isSelected = combobox.isSelected(value)
  return (
    <Pressable
      data-slot="combobox-item"
      data-selected={isSelected}
      data-disabled={Boolean(disabled)}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled ?? undefined}
      disabled={disabled}
      onPress={(event) => {
        combobox.select(value)
        onPress?.(event)
      }}
      className={cn(
        "cn-combobox-item relative w-full flex-row items-center disabled:opacity-50",
        className
      )}
      {...props}
    >
      <TextStyle
        className={
          isSelected
            ? cn("cn-combobox-item-text-selected")
            : cn("cn-combobox-item-text")
        }
      >
        {renderTextChildren(children)}
      </TextStyle>
      {isSelected && (
        <TextStyle className="cn-combobox-item-indicator-icon">
          <View className="cn-combobox-item-indicator absolute items-center justify-center">
            <CheckIcon aria-hidden />
          </View>
        </TextStyle>
      )}
    </Pressable>
  )
}

const ComboboxGroupContext = React.createContext<readonly unknown[] | null>(
  null
)

function ComboboxGroup({
  className,
  children,
  items,
  ...props
}: React.ComponentProps<typeof View> & { items?: readonly unknown[] }) {
  return (
    <ComboboxGroupContext value={items ?? null}>
      <View
        data-slot="combobox-group"
        role="group"
        className={cn("cn-combobox-group", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </ComboboxGroupContext>
  )
}

function ComboboxLabel({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="combobox-label"
      className={cn("cn-combobox-label", className)}
      {...props}
    />
  )
}

function ComboboxCollection<TItem = string>(props: {
  children: (item: TItem, index: number) => React.ReactNode
}): React.ReactNode
function ComboboxCollection({
  children,
}: {
  children: (item: unknown, index: number) => React.ReactNode
}) {
  const { items } = useCombobox()
  const groupItems = React.use(ComboboxGroupContext)
  return (
    <View data-slot="combobox-collection">
      {(groupItems ?? items).map(children)}
    </View>
  )
}

function ComboboxEmpty({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { isEmpty } = useCombobox()
  if (!isEmpty) return null
  return (
    <Text
      data-slot="combobox-empty"
      className={cn("cn-combobox-empty w-full", className)}
      {...props}
    />
  )
}

function ComboboxSeparator({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="combobox-separator"
      role="separator"
      className={cn("cn-combobox-separator", className)}
      {...props}
    />
  )
}

function ComboboxChips({
  className,
  children,
  "aria-invalid": isInvalid,
  disabled,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  children?: React.ReactNode
  "aria-invalid"?: boolean
}) {
  const combobox = useCombobox()
  const isDisabled = disabled ?? combobox.disabled
  return (
    <Pressable
      data-slot="combobox-chips"
      data-has-chips={combobox.selection.length > 0}
      data-invalid={Boolean(isInvalid)}
      data-open={combobox.isOpen}
      role="combobox"
      aria-expanded={combobox.isOpen}
      aria-disabled={isDisabled}
      aria-invalid={isInvalid}
      disabled={isDisabled}
      onPress={(event) => {
        combobox.setOpen(true)
        onPress?.(event)
      }}
      className={cn(
        "cn-combobox-chips flex-row flex-wrap items-center disabled:opacity-50",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </Pressable>
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  value,
  ...props
}: React.ComponentProps<typeof View> & {
  showRemove?: boolean
  /** The item it stands for; found from the text when left out. */
  value?: unknown
}) {
  const combobox = useCombobox()
  const remove = () => {
    if (value !== undefined) {
      combobox.remove(value)
      return
    }
    const text = getChildrenText(children)
    const item = combobox.selection.find(
      (candidate) => combobox.getLabel(candidate) === text
    )
    if (item !== undefined) combobox.remove(item)
  }
  return (
    <TextStyle className="cn-combobox-chip-text">
      <View
        data-slot="combobox-chip"
        data-removable={showRemove}
        className={cn(
          "cn-combobox-chip flex-row items-center justify-center",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
        {showRemove && (
          <Button
            data-slot="combobox-chip-remove"
            variant="ghost"
            size="icon-xs"
            accessibilityLabel={`Remove ${getChildrenText(children)}`}
            disabled={combobox.disabled}
            onPress={remove}
            className="cn-combobox-chip-remove"
          >
            <TextStyle className="cn-combobox-chip-indicator-icon">
              <XIcon aria-hidden />
            </TextStyle>
          </Button>
        )}
      </View>
    </TextStyle>
  )
}

function ComboboxChipsInput({
  className,
  placeholder,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  const combobox = useCombobox()
  if (combobox.isInPopup) {
    return (
      <TextInput
        data-slot="combobox-chip-input"
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColorClassName="accent-muted-foreground"
        selectionColorClassName="accent-primary"
        value={combobox.query}
        onChangeText={combobox.setQuery}
        className={cn("cn-combobox-chip-input min-w-16 flex-1", className)}
        {...props}
      />
    )
  }
  return (
    <Text
      data-slot="combobox-chip-input"
      numberOfLines={1}
      className={cn("cn-combobox-chip-input min-w-16 flex-1", className)}
    >
      {placeholder}
    </Text>
  )
}

function useComboboxAnchor() {
  return React.useRef<React.ComponentRef<typeof View> | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
