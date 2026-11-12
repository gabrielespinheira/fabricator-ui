"use client"

// Multi Select: pick several options from a searchable list. The field holds
// a chip per option and the search; picking keeps the list open. Built on
// React Aria's ComboBox with `selectionMode="multiple"`, which owns filtering,
// the keyboard and ARIA; Backspace on an empty search removes the last chip.
// Chips pop in, wipe out and glide into place (hooks/use-chip-presence); one
// highlight glides between options (lib/fluid-hover).
import * as React from "react"
import { cn } from "cn"
import {
  Button as ButtonPrimitive,
  Collection,
  ComboBox as ComboBoxPrimitive,
  ComboBoxStateContext,
  ComboBoxValue as ComboBoxValuePrimitive,
  composeRenderProps,
  Group,
  Header as HeaderPrimitive,
  Input as InputPrimitive,
  ListBoxItem as ListBoxItemPrimitive,
  ListBox as ListBoxPrimitive,
  ListBoxSection as ListBoxSectionPrimitive,
  Popover as PopoverPrimitive,
  Separator as SeparatorPrimitive,
  type ComboBoxProps,
  type GroupProps,
  type HeaderProps,
  type InputProps,
  type Key,
  type ListBoxItemProps,
  type ListBoxProps,
  type ListBoxSectionProps,
  type SeparatorProps,
} from "react-aria-components"
import { createPortal } from "react-dom"

import { useChipPresence } from "@/registry/bases/aria/hooks/use-chip-presence"
import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/aria/lib/fluid-hover"
import { useDensity } from "@/registry/bases/aria/ui/density"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Whether the root is disabled, for the chips' remove buttons.
const MultiSelectDisabledContext = React.createContext(false)

function MultiSelect<T extends object>({
  className,
  isDisabled = false,
  inputValue,
  defaultInputValue = "",
  onInputChange,
  onChange,
  ...props
}: Omit<ComboBoxProps<T, "multiple">, "selectionMode" | "className"> & {
  className?: string
}) {
  // The root owns the search text so a pick clears it, ready for the next.
  const [uncontrolledQuery, setUncontrolledQuery] =
    React.useState(defaultInputValue)
  const query = inputValue ?? uncontrolledQuery
  const setQuery = (next: string) => {
    setUncontrolledQuery(next)
    onInputChange?.(next)
  }

  return (
    <MultiSelectDisabledContext value={isDisabled}>
      <ComboBoxPrimitive<T, "multiple">
        data-slot="multi-select"
        selectionMode="multiple"
        allowsEmptyCollection
        isDisabled={isDisabled}
        inputValue={query}
        onInputChange={setQuery}
        onChange={(value) => {
          onChange?.(value)
          if (query !== "") setQuery("")
        }}
        className={cn("group/multi-select w-full", className)}
        {...props}
      />
    </MultiSelectDisabledContext>
  )
}

function MultiSelectTrigger({
  className,
  children,
  onMouseDown,
  ...props
}: Omit<GroupProps, "children" | "className"> & {
  className?: string
  children?: React.ReactNode
}) {
  const state = React.useContext(ComboBoxStateContext)

  return (
    <Group
      data-slot="multi-select-trigger"
      className={cn(
        "cn-multi-select-trigger flex w-full items-center",
        className
      )}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        // A press on the frame, not on a chip's button, searches.
        const target = event.target
        if (
          event.defaultPrevented ||
          (target instanceof Element && target.closest("button, input"))
        ) {
          return
        }
        event.preventDefault()
        event.currentTarget.querySelector("input")?.focus()
        state?.open(null, "manual")
      }}
      {...props}
    >
      <div
        data-slot="multi-select-chips"
        className="cn-multi-select-chips relative flex min-w-0 flex-1 flex-wrap items-center"
      >
        {children}
      </div>
      <span
        data-slot="multi-select-icon"
        aria-hidden
        className="cn-multi-select-icon pointer-events-none flex shrink-0 items-center"
      >
        <IconPlaceholder
          lucide="ChevronsUpDownIcon"
          tabler="IconSelector"
          hugeicons="UnfoldMoreIcon"
          phosphor="CaretUpDownIcon"
          remixicon="RiArrowUpDownLine"
          className="pointer-events-none"
        />
      </span>
    </Group>
  )
}

type SelectedOption<T> = { key: Key; label: string; item: T | null }

type MultiSelectValueProps<T> = Omit<
  React.ComponentProps<"div">,
  "children"
> & {
  /** What a chip shows for an item; its text by default. */
  children?: (item: T) => React.ReactNode
}

function getOptionKey<T>(option: SelectedOption<T>) {
  return String(option.key)
}

function MultiSelectChipList<T>({
  options,
  onRemove,
  isDisabled,
  children,
  className,
  ...props
}: MultiSelectValueProps<T> & {
  options: readonly SelectedOption<T>[]
  onRemove: (key: Key) => void
  isDisabled: boolean
}) {
  const { chips, ref, getChipProps } = useChipPresence(options, getOptionKey)

  return (
    <div
      ref={ref}
      data-slot="multi-select-value"
      className={cn("contents", className)}
      {...props}
    >
      {chips.map((chip) => {
        const { key, item: option, isExiting } = chip
        return (
          <div
            key={key}
            data-slot="multi-select-chip"
            aria-hidden={isExiting || undefined}
            className="cn-multi-select-chip flex shrink-0 items-center outline-none data-exiting:pointer-events-none"
            {...getChipProps(chip)}
          >
            <span className="cn-multi-select-chip-label truncate">
              {children && option.item !== null
                ? children(option.item)
                : option.label}
            </span>
            <ButtonPrimitive
              data-slot="multi-select-chip-remove"
              aria-label={`Remove ${option.label}`}
              isDisabled={isDisabled || isExiting}
              excludeFromTabOrder={isExiting}
              onPress={() => onRemove(option.key)}
              className="cn-multi-select-chip-remove flex cursor-pointer items-center justify-center outline-none"
            >
              <IconPlaceholder
                lucide="XIcon"
                tabler="IconX"
                hugeicons="Cancel01Icon"
                phosphor="XIcon"
                remixicon="RiCloseLine"
                className="pointer-events-none"
              />
            </ButtonPrimitive>
          </div>
        )
      })}
    </div>
  )
}

function MultiSelectValue<T extends object>({
  className,
  ...props
}: MultiSelectValueProps<T>) {
  const isDisabled = React.use(MultiSelectDisabledContext)

  return (
    <ComboBoxValuePrimitive<T> className="contents">
      {({ state }) => (
        <MultiSelectChipList<T>
          options={state.selectedItems.map((node) => ({
            key: node.key,
            label: node.textValue,
            item: node.value,
          }))}
          isDisabled={isDisabled}
          onRemove={(key) => {
            if (Array.isArray(state.value)) {
              state.setValue(state.value.filter((value) => value !== key))
            }
          }}
          className={className}
          {...props}
        />
      )}
    </ComboBoxValuePrimitive>
  )
}

function MultiSelectInput({
  className,
  placeholder,
  onKeyDown,
  ...props
}: Omit<InputProps, "className"> & { className?: string }) {
  const state = React.useContext(ComboBoxStateContext)
  const hasSelection = (state?.selectedItems.length ?? 0) > 0

  return (
    <InputPrimitive
      data-slot="multi-select-input"
      // Once something is picked, the chips say what the field is for.
      placeholder={hasSelection ? undefined : placeholder}
      className={cn(
        "cn-multi-select-input min-w-16 flex-1 bg-transparent outline-none",
        className
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (
          event.key === "Backspace" &&
          event.currentTarget.value === "" &&
          Array.isArray(state?.value) &&
          state.value.length > 0
        ) {
          event.preventDefault()
          state.setValue(state.value.slice(0, -1))
        }
      }}
      {...props}
    />
  )
}

function MultiSelectContent({
  className,
  placement = "bottom start",
  offset = 6,
  crossOffset = 0,
  ...props
}: Omit<
  React.ComponentProps<typeof PopoverPrimitive>,
  "className" | "children"
> & {
  className?: string
  children?: React.ReactNode
}) {
  const density = useDensity()

  return (
    <PopoverPrimitive
      data-slot="multi-select-content"
      data-density={density}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        "cn-multi-select-content-aria cn-menu-target cn-menu-translucent cn-menu-translucent-aria group/multi-select-content relative isolate z-50 w-(--trigger-width) origin-(--trigger-anchor-point)",
        className
      )}
      {...props}
    />
  )
}

// The list renders a collection, so the highlight is portalled into it rather
// than passed as a child.
function MultiSelectList<T extends object>({
  className,
  ref,
  ...props
}: ListBoxProps<T> & { ref?: React.Ref<HTMLDivElement> }) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="option"]',
    highlighted: "[data-focused]",
  })
  const [list, setList] = React.useState<HTMLDivElement | null>(null)
  const mergedRef = useMergedRef(fluid.attach, setList, ref)

  return (
    <>
      <ListBoxPrimitive
        data-slot="multi-select-list"
        className={cn(
          "cn-multi-select-list relative isolate max-h-[inherit] overflow-y-auto overscroll-contain",
          className
        )}
        ref={mergedRef}
        {...fluid.props}
        {...props}
      />
      {list && createPortal(<FluidHoverHighlight hover={fluid.hover} />, list)}
    </>
  )
}

function MultiSelectItem<T extends object>({
  className,
  children,
  ...props
}: ListBoxItemProps<T>) {
  return (
    <ListBoxItemPrimitive
      data-slot="multi-select-item"
      textValue={typeof children === "string" ? children : undefined}
      className={cn(
        "cn-multi-select-item cn-multi-select-item-aria group/multi-select-item relative flex w-full items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          {/* Mounted while unpicked, so the check can scale in and out. */}
          <span
            data-slot="multi-select-item-indicator"
            aria-hidden
            className="cn-multi-select-item-indicator pointer-events-none absolute flex items-center justify-center"
          >
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
              className="pointer-events-none"
            />
          </span>
        </>
      ))}
    </ListBoxItemPrimitive>
  )
}

function MultiSelectGroup<T extends object>({
  className,
  ...props
}: ListBoxSectionProps<T>) {
  return (
    <ListBoxSectionPrimitive
      data-slot="multi-select-group"
      className={cn("cn-multi-select-group", className)}
      {...props}
    />
  )
}

function MultiSelectLabel({ className, ...props }: HeaderProps) {
  return (
    <HeaderPrimitive
      data-slot="multi-select-label"
      className={cn("cn-multi-select-label", className)}
      {...props}
    />
  )
}

function MultiSelectEmpty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="multi-select-empty"
      className={cn(
        "cn-multi-select-empty cn-multi-select-empty-aria",
        className
      )}
      {...props}
    />
  )
}

function MultiSelectSeparator({ className, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      data-slot="multi-select-separator"
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
  Collection as MultiSelectCollection,
  MultiSelectEmpty,
  MultiSelectSeparator,
}
