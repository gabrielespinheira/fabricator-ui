"use client"

// Multi Select: pick several options from a searchable list. The field holds
// a chip per option and the search; picking keeps the list open. Built on
// Base UI's Combobox in `multiple` mode, which owns filtering, the keyboard
// (arrows, Enter, Backspace on an empty search, Left Arrow into the chips) and
// ARIA. Chips pop in, wipe out and glide into place (hooks/use-chip-presence);
// one highlight glides between options (lib/fluid-hover).
import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { cn } from "cn"

import { useChipPresence } from "@/registry/bases/base/hooks/use-chip-presence"
import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/base/lib/fluid-hover"
import {
  getMultiSelectItemKey,
  getMultiSelectItemLabel,
} from "@/registry/bases/base/lib/multi-select-model"
import { useDensity } from "@/registry/bases/base/ui/density"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type MultiSelectProps<Value, Item = Value> = Omit<
  ComboboxPrimitive.Root.Props<Value, true, Item>,
  "multiple"
>

function MultiSelect<Value, Item = Value>({
  autoHighlight = true,
  inputValue,
  defaultInputValue = "",
  onInputValueChange,
  onOpenChange,
  ...props
}: MultiSelectProps<Value, Item>) {
  // The root owns the search text so a pick can clear it while the list stays
  // open; Base UI only clears it on close.
  const [uncontrolledQuery, setUncontrolledQuery] = React.useState(
    String(defaultInputValue)
  )
  const query = inputValue ?? uncontrolledQuery

  return (
    <ComboboxPrimitive.Root<Value, true, Item>
      multiple
      autoHighlight={autoHighlight}
      inputValue={query}
      onInputValueChange={(next, eventDetails) => {
        setUncontrolledQuery(next)
        onInputValueChange?.(next, eventDetails)
      }}
      onOpenChange={(open, eventDetails) => {
        // Picking one of several keeps the list open for the next, with the
        // search cleared as a close would have.
        if (!open && eventDetails.reason === "item-press") {
          eventDetails.cancel()
          if (query !== "") {
            setUncontrolledQuery("")
            onInputValueChange?.("", eventDetails)
          }
          return
        }
        onOpenChange?.(open, eventDetails)
      }}
      {...props}
    />
  )
}

function MultiSelectTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.InputGroup.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="multi-select-trigger"
      className={cn(
        "cn-multi-select-trigger flex w-full items-center",
        className
      )}
      {...props}
    >
      <ComboboxPrimitive.Chips
        data-slot="multi-select-chips"
        className="cn-multi-select-chips relative flex min-w-0 flex-1 flex-wrap items-center"
      >
        {children}
      </ComboboxPrimitive.Chips>
      <ComboboxPrimitive.Icon
        data-slot="multi-select-icon"
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
      </ComboboxPrimitive.Icon>
    </ComboboxPrimitive.InputGroup>
  )
}

type MultiSelectValueProps<Item> = Omit<
  React.ComponentProps<"div">,
  "children"
> & {
  /** What a chip shows for an item; its label by default. */
  children?: (item: Item) => React.ReactNode
}

function MultiSelectChipList<Item>({
  items,
  children,
  className,
  ...props
}: MultiSelectValueProps<Item> & { items: readonly Item[] }) {
  const { chips, ref, getChipProps } = useChipPresence(
    items,
    getMultiSelectItemKey
  )

  return (
    <div
      ref={ref}
      data-slot="multi-select-value"
      className={cn("contents", className)}
      {...props}
    >
      {chips.map((chip) => {
        const { key, item, isExiting } = chip
        const label = getMultiSelectItemLabel(item)
        const content = children ? children(item) : label
        if (isExiting) {
          return (
            <div
              key={key}
              data-slot="multi-select-chip"
              aria-hidden
              className="cn-multi-select-chip pointer-events-none flex shrink-0 items-center"
              {...getChipProps(chip)}
            >
              <span className="cn-multi-select-chip-label truncate">
                {content}
              </span>
              <span className="cn-multi-select-chip-remove flex items-center justify-center">
                <IconPlaceholder
                  lucide="XIcon"
                  tabler="IconX"
                  hugeicons="Cancel01Icon"
                  phosphor="XIcon"
                  remixicon="RiCloseLine"
                  className="pointer-events-none"
                />
              </span>
            </div>
          )
        }
        return (
          <ComboboxPrimitive.Chip
            key={key}
            data-slot="multi-select-chip"
            aria-label={label}
            className="cn-multi-select-chip flex shrink-0 items-center outline-none has-disabled:pointer-events-none has-disabled:opacity-50"
            {...getChipProps(chip)}
          >
            <span className="cn-multi-select-chip-label truncate">
              {content}
            </span>
            <ComboboxPrimitive.ChipRemove
              data-slot="multi-select-chip-remove"
              aria-label={`Remove ${label}`}
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
            </ComboboxPrimitive.ChipRemove>
          </ComboboxPrimitive.Chip>
        )
      })}
    </div>
  )
}

function MultiSelectValue<Item = unknown>(props: MultiSelectValueProps<Item>) {
  return (
    <ComboboxPrimitive.Value>
      {(items: readonly Item[]) => (
        <MultiSelectChipList items={items} {...props} />
      )}
    </ComboboxPrimitive.Value>
  )
}

function MultiSelectInput({
  className,
  placeholder,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Value>
      {(items: readonly unknown[]) => (
        <ComboboxPrimitive.Input
          data-slot="multi-select-input"
          // Once something is picked, the chips say what the field is for.
          placeholder={items.length > 0 ? undefined : placeholder}
          className={cn(
            "cn-multi-select-input min-w-16 flex-1 bg-transparent outline-none",
            className
          )}
          {...props}
        />
      )}
    </ComboboxPrimitive.Value>
  )
}

function MultiSelectContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  const density = useDensity()

  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="multi-select-content"
          data-density={density}
          className={cn(
            "cn-multi-select-content cn-menu-target cn-menu-translucent group/multi-select-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin)",
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function MultiSelectList({
  className,
  children,
  ref,
  ...props
}: ComboboxPrimitive.List.Props) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="option"]',
    highlighted: "[data-highlighted]",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)
  // The list wraps a render function in a collection itself; with the
  // highlight beside it, that has to happen here.
  const items = React.useMemo(
    () =>
      typeof children === "function" ? (
        <ComboboxPrimitive.Collection>{children}</ComboboxPrimitive.Collection>
      ) : (
        children
      ),
    [children]
  )

  return (
    <ComboboxPrimitive.List
      data-slot="multi-select-list"
      className={cn(
        "cn-multi-select-list relative isolate overflow-y-auto overscroll-contain",
        className
      )}
      ref={mergedRef}
      {...fluid.props}
      {...props}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {items}
    </ComboboxPrimitive.List>
  )
}

function MultiSelectItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="multi-select-item"
      className={cn(
        "cn-multi-select-item group/multi-select-item relative flex w-full items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
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
    </ComboboxPrimitive.Item>
  )
}

function MultiSelectGroup({
  className,
  ...props
}: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="multi-select-group"
      className={cn("cn-multi-select-group", className)}
      {...props}
    />
  )
}

function MultiSelectLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="multi-select-label"
      className={cn("cn-multi-select-label", className)}
      {...props}
    />
  )
}

function MultiSelectCollection({
  ...props
}: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection
      data-slot="multi-select-collection"
      {...props}
    />
  )
}

function MultiSelectEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="multi-select-empty"
      className={cn("cn-multi-select-empty", className)}
      {...props}
    />
  )
}

function MultiSelectSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
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
  MultiSelectCollection,
  MultiSelectEmpty,
  MultiSelectSeparator,
}
