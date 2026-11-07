"use client"

import * as React from "react"
import { cn } from "cn"
import {
  Button as ButtonPrimitive,
  composeRenderProps,
  Header as HeaderPrimitive,
  ListBoxItem as ListBoxItemPrimitive,
  ListBox as ListBoxPrimitive,
  ListBoxSection as ListBoxSectionPrimitive,
  Popover as PopoverPrimitive,
  SearchField,
  Select as SelectPrimitive,
  SelectValue as SelectValuePrimitive,
  Separator as SeparatorPrimitive,
  type ListBoxProps,
  type SearchFieldProps,
  type ListBoxSectionProps as SelectGroupProps,
  type SelectProps,
  type SelectValueProps,
} from "react-aria-components"
import { createPortal } from "react-dom"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/aria-fabricator/lib/fluid-hover"
import { useDensity } from "@/registry/aria-fabricator/ui/density"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/aria-fabricator/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function Select<T extends object, M extends "single" | "multiple" = "single">({
  className,
  ...props
}: SelectProps<T, M>) {
  return (
    <SelectPrimitive
      data-slot="select"
      className={cn("w-fit", className)}
      {...props}
    />
  )
}

function SelectGroup<T extends object>({
  className,
  ...props
}: SelectGroupProps<T>) {
  return (
    <ListBoxSectionPrimitive
      data-slot="select-group"
      className={cn("scroll-my-1", className)}
      {...props}
    />
  )
}

function SelectValue<T extends object>({
  className,
  children,
  ...props
}: SelectValueProps<T>) {
  return (
    <SelectValuePrimitive
      data-slot="select-value"
      className={cn(
        "flex flex-1 text-left data-placeholder:text-muted-foreground",
        className
      )}
      {...props}
    >
      {typeof children === "function"
        ? children
        : ({ selectedItems, selectedText, defaultChildren }) =>
            selectedItems.length > 1 ? selectedText : defaultChildren}
    </SelectValuePrimitive>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: Omit<React.ComponentProps<typeof ButtonPrimitive>, "children"> & {
  children?: React.ReactNode
  size?: "sm" | "default"
}) {
  return (
    <ButtonPrimitive
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex h-(--density-36) w-full cursor-pointer items-center justify-between gap-(--density-8) rounded-lg bg-transparent py-0 pr-(--density-8) pl-(--density-10) text-(length:--density-text-13) whitespace-nowrap ring-1 ring-border transition-[color,background-color,box-shadow] duration-feedback outline-none select-none ring-inset hover:bg-muted/50 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/50 aria-invalid:hover:bg-destructive/5 data-placeholder:text-muted-foreground data-[size=sm]:density-compact *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-(--density-8) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16) hover:[&>svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <IconPlaceholder
        lucide="ChevronDownIcon"
        tabler="IconSelector"
        hugeicons="UnfoldMoreIcon"
        phosphor="CaretDownIcon"
        remixicon="RiArrowDownSLine"
        className="pointer-events-none size-(--density-icon-16) text-muted-foreground transition-colors duration-feedback"
      />
    </ButtonPrimitive>
  )
}

function SelectContent({
  className,
  children,
  placement = "bottom",
  offset = 4,
  crossOffset = 0,
  ...props
}: Omit<
  React.ComponentProps<typeof PopoverPrimitive>,
  "className" | "children"
> & {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <SelectPopover
      className={className}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      {...props}
    >
      <SelectList>{children}</SelectList>
    </SelectPopover>
  )
}

function SelectPopover({
  className,
  children,
  placement = "bottom start",
  offset = 4,
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
      data-slot="select-content"
      data-density={density}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        "cn-menu-target cn-menu-translucent relative isolate z-50 w-(--trigger-width) min-w-36 origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup data-entering:animate-in data-entering:fade-in-0 data-exiting:animate-out data-exiting:fade-out-0 **:data-[slot$=-item]:data-focused:not-in-data-[fluid-hover]:bg-hover",
        className
      )}
      {...props}
    >
      {children}
    </PopoverPrimitive>
  )
}

// Fabricator override: the list is a fluid hover container, so one highlight
// glides between options and the selected option's fill slides between rows.
// The list renders a collection, so the overlays are portalled into it rather
// than passed as children.
//
// Its popups take the density of the nearest DensityProvider, which their
// portals would otherwise lose (registry/fabricator/density.ts).
function SelectList<T extends object>({
  className,
  ref,
  ...props
}: ListBoxProps<T> & { ref?: React.Ref<HTMLDivElement> }) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="option"]',
    highlighted: "[data-focused]",
    selected: "[data-selected]",
  })
  const [list, setList] = React.useState<HTMLDivElement | null>(null)
  const mergedRef = useMergedRef(fluid.attach, setList, ref)

  return (
    <>
      <ListBoxPrimitive
        data-slot="select-list"
        className={cn(
          "group/select-list relative isolate max-h-[inherit] overflow-x-hidden overflow-y-auto p-0 outline-hidden",
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

function SelectInput({ className, ...props }: SearchFieldProps) {
  return (
    <SearchField
      {...props}
      autoFocus
      data-slot="select-input-wrapper"
      className={cn("p-1 pb-0", className)}
    >
      <InputGroup>
        <InputGroupInput
          data-slot="select-input"
          className="[&::-webkit-search-cancel-button]:hidden"
        />
        <InputGroupAddon>
          <IconPlaceholder
            lucide="SearchIcon"
            tabler="IconSearch"
            hugeicons="SearchIcon"
            phosphor="MagnifyingGlassIcon"
            remixicon="RiSearchLine"
            className="size-(--density-icon-16) shrink-0 stroke-[1.5] text-muted-foreground transition-[color,stroke-width] duration-feedback group-focus-within/input-group:stroke-2 group-focus-within/input-group:text-foreground"
          />
        </InputGroupAddon>
      </InputGroup>
    </SearchField>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof HeaderPrimitive>) {
  return (
    <HeaderPrimitive
      data-slot="select-label"
      className={cn(
        "px-(--density-8) py-(--density-6) text-(length:--density-text-12) text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ListBoxItemPrimitive>) {
  return (
    <ListBoxItemPrimitive
      data-slot="select-item"
      textValue={typeof children === "string" ? children : undefined}
      className={cn(
        "relative flex h-(--density-36) w-full cursor-pointer items-center gap-(--density-8) rounded-lg py-0 pr-[calc(var(--density-8)*2+var(--density-icon-16))] pl-(--density-8) text-(length:--density-text-13) text-muted-foreground outline-hidden transition-colors duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground in-data-[fluid-hover]:data-focused:bg-transparent data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-[selected]:bg-active data-[selected]:font-semibold data-[selected]:text-foreground in-data-[fluid-hover]:data-[selected]:bg-transparent data-[selected]:data-focused:bg-active in-data-[fluid-hover]:data-[selected]:data-focused:bg-transparent data-checked:bg-active data-checked:font-semibold data-checked:text-foreground in-data-[fluid-hover]:data-checked:bg-transparent data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] data-fluid-hover-active:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16) *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-(--density-8)",
        className
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span className="flex flex-1 shrink-0 gap-(--density-8) whitespace-nowrap">
            {children}
          </span>
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

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px bg-border/60",
        className
      )}
      {...props}
    />
  )
}

function SelectEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-empty"
      className={cn(
        "hidden w-full justify-center py-(--density-16) text-center text-(length:--density-text-13) text-muted-foreground group-data-empty/select-list:flex",
        className
      )}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectInput,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectPopover,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectEmpty,
}
