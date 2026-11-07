"use client"

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
  TagGroup as TagGroupPrimitive,
  TagList as TagListPrimitive,
  Tag as TagPrimitive,
  type ButtonProps,
  type ComboBoxValueProps,
  type GroupProps,
  type HeaderProps,
  type InputProps,
  type ListBoxItemProps,
  type ListBoxProps,
  type ListBoxSectionProps,
  type SeparatorProps,
  type TagListProps,
  type TagProps,
} from "react-aria-components"
import { createPortal } from "react-dom"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/aria-fabricator/lib/fluid-hover"
import { Button } from "@/registry/aria-fabricator/ui/button"
import { useDensity } from "@/registry/aria-fabricator/ui/density"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/aria-fabricator/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function ComboboxValue<T>({ ...props }: ComboBoxValueProps<T>) {
  return <ComboBoxValuePrimitive data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: Omit<ButtonProps, "children"> & {
  children?: React.ReactNode
}) {
  return (
    <ButtonPrimitive
      data-slot="combobox-trigger"
      className={cn(
        "cursor-pointer [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      {children}
      <IconPlaceholder
        lucide="ChevronDownIcon"
        tabler="IconChevronDown"
        hugeicons="ArrowDown01Icon"
        phosphor="CaretDownIcon"
        remixicon="RiArrowDownSLine"
        className="pointer-events-none size-(--density-icon-16) text-muted-foreground transition-colors duration-feedback"
      />
    </ButtonPrimitive>
  )
}

function ComboboxClear({
  className,
  ...props
}: React.ComponentProps<typeof InputGroupButton>) {
  const state = React.useContext(ComboBoxStateContext)
  if (state?.inputValue === "") {
    return null
  }

  return (
    <InputGroupButton
      data-slot="combobox-clear"
      variant="ghost"
      size="icon-xs"
      aria-label="Clear"
      className={cn(className)}
      onPress={() => {
        state?.setValue(null)
      }}
      slot={null}
      {...props}
    >
      <IconPlaceholder
        lucide="XIcon"
        tabler="IconX"
        hugeicons="Cancel01Icon"
        phosphor="XIcon"
        remixicon="RiCloseLine"
        className="pointer-events-none"
      />
    </InputGroupButton>
  )
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: React.ComponentProps<"input"> & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <InputGroupInput disabled={disabled} {...props} />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            data-slot="combobox-trigger"
            className="cursor-pointer group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent [&_svg:not([class*='size-'])]:size-(--density-icon-16)"
            isDisabled={disabled}
          >
            <IconPlaceholder
              lucide="ChevronDownIcon"
              tabler="IconChevronDown"
              hugeicons="ArrowDown01Icon"
              phosphor="CaretDownIcon"
              remixicon="RiArrowDownSLine"
              className="pointer-events-none size-(--density-icon-16) text-muted-foreground transition-colors duration-feedback"
            />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear isDisabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

function ComboboxContent({
  className,
  placement = "bottom",
  offset = 6,
  crossOffset = 0,
  anchor,
  ...props
}: Omit<
  React.ComponentProps<typeof PopoverPrimitive>,
  "className" | "children"
> & {
  className?: string
  children?: React.ReactNode
  anchor?: React.RefObject<HTMLDivElement | null>
}) {
  const density = useDensity()

  return (
    <PopoverPrimitive
      data-slot="combobox-content"
      data-density={density}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      triggerRef={anchor}
      className={cn(
        "cn-menu-target cn-menu-translucent relative isolate z-50 max-h-72 w-(--trigger-width) min-w-36 origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-surface-3 text-popover-foreground shadow-surface-3 motion-popup data-entering:animate-in data-entering:fade-in-0 data-exiting:animate-out data-exiting:fade-out-0 **:data-[slot$=-item]:data-focused:not-in-data-[fluid-hover]:bg-hover *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-(--density-36) *:data-[slot=input-group]:shadow-none",
        className
      )}
      {...props}
    />
  )
}

// Fabricator override: the list is a fluid hover container, so one highlight
// glides between options; in single selection the selected option's fill
// slides between rows. The list renders a collection, so the overlays are
// portalled into it rather than passed as children.
//
// Its popups take the density of the nearest DensityProvider, which their
// portals would otherwise lose (registry/fabricator/density.ts).
const COMBOBOX_SELECTED =
  '[data-slot="combobox-list"]:not([aria-multiselectable="true"]) [data-selected]'

function ComboboxList<T extends object>({
  className,
  ref,
  ...props
}: ListBoxProps<T> & { ref?: React.Ref<HTMLDivElement> }) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="option"]',
    highlighted: "[data-focused]",
    selected: COMBOBOX_SELECTED,
  })
  const [list, setList] = React.useState<HTMLDivElement | null>(null)
  const mergedRef = useMergedRef(fluid.attach, setList, ref)

  return (
    <>
      <ListBoxPrimitive
        data-slot="combobox-list"
        className={cn(
          "group/combobox-content relative isolate no-scrollbar max-h-[inherit] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
          className
        )}
        ref={mergedRef}
        {...fluid.props}
        {...props}
      />
      {list &&
        createPortal(
          <>
            <FluidHoverSelection selection={fluid.selection} />
            <FluidHoverHighlight hover={fluid.hover} />
          </>,
          list
        )}
    </>
  )
}

function ComboboxItem<T extends object>({
  className,
  children,
  ...props
}: ListBoxItemProps<T>) {
  return (
    <ListBoxItemPrimitive
      data-slot="combobox-item"
      textValue={typeof children === "string" ? children : undefined}
      className={cn(
        "relative flex h-(--density-36) w-full cursor-pointer items-center gap-(--density-8) rounded-lg py-0 pr-[calc(var(--density-8)*2+var(--density-icon-16))] pl-(--density-8) text-(length:--density-text-13) text-muted-foreground outline-hidden transition-colors duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground in-data-[fluid-hover]:data-focused:bg-transparent data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-[selected]:bg-active data-[selected]:font-semibold data-[selected]:text-foreground in-data-[fluid-hover]:data-[selected]:bg-transparent data-[selected]:data-focused:bg-active in-data-[fluid-hover]:data-[selected]:data-focused:bg-transparent data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] data-fluid-hover-active:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          {children}
          <span className="pointer-events-none absolute right-(--density-8) flex size-(--density-icon-16) items-center justify-center text-foreground">
            {isSelected ? (
              <IconPlaceholder
                lucide="CheckIcon"
                tabler="IconCheck"
                hugeicons="Tick02Icon"
                phosphor="CheckIcon"
                remixicon="RiCheckLine"
                className="pointer-events-none"
              />
            ) : null}
          </span>
        </>
      ))}
    </ListBoxItemPrimitive>
  )
}

function ComboboxGroup<T extends object>({
  className,
  ...props
}: ListBoxSectionProps<T>) {
  return (
    <ListBoxSectionPrimitive
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  )
}

function ComboboxLabel({ className, ...props }: HeaderProps) {
  return (
    <HeaderPrimitive
      data-slot="combobox-label"
      className={cn(
        "px-(--density-8) py-(--density-6) text-(length:--density-text-12) text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ComboboxEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-(--density-16) text-center text-(length:--density-text-13) text-muted-foreground group-data-empty/combobox-content:flex",
        className
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({ className, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      data-slot="combobox-separator"
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function ComboboxChips({ children, className, ...props }: GroupProps) {
  return (
    <Group
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-(--density-36) cursor-text flex-wrap items-center gap-1 rounded-lg bg-transparent px-(--density-10) py-1 text-(length:--density-text-13) ring-1 ring-border transition-[color,background-color,box-shadow] duration-feedback ring-inset focus-within:bg-card hover:bg-muted/50 has-aria-invalid:ring-destructive/50 has-aria-invalid:hover:bg-destructive/5 has-data-[slot=combobox-chip]:px-1",
        className
      )}
      {...props}
    >
      {children}
    </Group>
  )
}

function ComboboxChipList<T extends object>({
  className,
  ...props
}: Omit<TagListProps<T>, "className" | "items"> & {
  className?: string
}) {
  return (
    <ComboBoxValuePrimitive<T> className="contents">
      {({ selectedItems, state }) => (
        <TagGroupPrimitive
          data-slot="combobox-chip-list"
          className={cn("contents", className)}
          onRemove={(keys) => {
            if (Array.isArray(state.value)) {
              state.setValue(state.value.filter((k) => !keys.has(k)))
            }
          }}
        >
          <TagListPrimitive
            className="contents"
            items={selectedItems.filter((item) => item != null)}
            {...props}
          />
        </TagGroupPrimitive>
      )}
    </ComboBoxValuePrimitive>
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: Omit<TagProps, "children"> & {
  showRemove?: boolean
  children?: React.ReactNode
}) {
  return (
    <TagPrimitive
      data-slot="combobox-chip"
      className={cn(
        "flex h-(--density-24) w-fit items-center justify-center gap-1 rounded-md bg-active px-(--density-8) text-(length:--density-text-12) font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <Button
          slot="remove"
          variant="ghost"
          size="icon-xs"
          className="-ml-1 cursor-pointer opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
            className="pointer-events-none"
          />
        </Button>
      )}
    </TagPrimitive>
  )
}

function ComboboxChipsInput({ className, ...props }: InputProps) {
  const state = React.useContext(ComboBoxStateContext)
  return (
    <InputPrimitive
      data-slot="combobox-chip-input"
      className={cn("min-w-16 flex-1 outline-none", className)}
      onKeyDown={(e) => {
        if (
          e.key === "Backspace" &&
          e.currentTarget.value === "" &&
          Array.isArray(state?.value) &&
          state.value.length > 0
        ) {
          e.preventDefault()
          state.setValue(state.value.slice(0, -1))
        }
      }}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  ComboBoxPrimitive as Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  Collection as ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipList,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
