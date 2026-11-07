"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/base-fabricator/lib/fluid-hover"
import { useDensity } from "@/registry/base-fabricator/ui/density"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream select: the popup is a fluid hover
// container, so one highlight glides between items (keyboard navigation from
// the primitive moves the same highlight) and the selected item's background
// slides when the selection changes.
//
// Its popups take the density of the nearest DensityProvider, which their
// portals would otherwise lose (registry/fabricator/density.ts).
const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex h-(--density-36) w-fit cursor-pointer items-center justify-between gap-(--density-8) rounded-lg bg-transparent py-0 pr-(--density-8) pl-(--density-10) text-(length:--density-text-13) whitespace-nowrap ring-1 ring-border transition-[color,background-color,box-shadow] duration-feedback outline-none select-none ring-inset hover:bg-muted/50 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/50 aria-invalid:hover:bg-destructive/5 data-placeholder:text-muted-foreground data-[size=sm]:density-compact *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-(--density-8) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16) hover:[&>svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <IconPlaceholder
            lucide="ChevronDownIcon"
            tabler="IconSelector"
            hugeicons="UnfoldMoreIcon"
            phosphor="CaretDownIcon"
            remixicon="RiArrowDownSLine"
            className="pointer-events-none size-(--density-icon-16) text-muted-foreground transition-colors duration-feedback"
          />
        }
      />
    </SelectPrimitive.Trigger>
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
  ref,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="option"]',
    highlighted: "[data-highlighted]",
    selected: "[data-selected]",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)
  const density = useDensity()

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-density={density}
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "cn-menu-target cn-menu-translucent relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup data-[align-trigger=true]:animate-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            className
          )}
          ref={mergedRef}
          {...fluid.props}
          {...props}
        >
          <FluidHoverSelection selection={fluid.selection} />
          <FluidHoverHighlight hover={fluid.hover} />
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
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
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex h-(--density-36) w-full cursor-pointer items-center gap-(--density-8) rounded-lg py-0 pr-[calc(var(--density-8)*2+var(--density-icon-16))] pl-(--density-8) text-(length:--density-text-13) text-muted-foreground outline-hidden transition-colors duration-feedback select-none data-fluid-hover-active:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-[selected]:bg-active data-[selected]:font-semibold data-[selected]:text-foreground in-data-[fluid-hover]:data-[selected]:bg-transparent data-checked:bg-active data-checked:font-semibold data-checked:text-foreground in-data-[fluid-hover]:data-checked:bg-transparent data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] data-fluid-hover-active:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16) *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-(--density-8)",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-(--density-8) whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-(--density-8) flex size-(--density-icon-16) items-center justify-center text-foreground" />
        }
      >
        <IconPlaceholder
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
          className="pointer-events-none"
        />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px bg-border/60",
        className
      )}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-surface-3 py-1 text-muted-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      <IconPlaceholder
        lucide="ChevronUpIcon"
        tabler="IconChevronUp"
        hugeicons="ArrowUp01Icon"
        phosphor="CaretUpIcon"
        remixicon="RiArrowUpSLine"
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-surface-3 py-1 text-muted-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      <IconPlaceholder
        lucide="ChevronDownIcon"
        tabler="IconChevronDown"
        hugeicons="ArrowDown01Icon"
        phosphor="CaretDownIcon"
        remixicon="RiArrowDownSLine"
      />
    </SelectPrimitive.ScrollDownArrow>
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
