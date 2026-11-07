"use client"

import * as React from "react"
import { cn } from "cn"
import { Select as SelectPrimitive } from "radix-ui"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/radix-fabricator/lib/fluid-hover"
import { useDensity } from "@/registry/radix-fabricator/ui/density"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream select: the viewport (the scrolling
// list) is a fluid hover container, so one highlight glides between items
// (keyboard navigation from the primitive moves the same highlight) and the
// selected item's background slides when the selection changes.
//
// Its popups take the density of the nearest DensityProvider, which their
// portals would otherwise lose (registry/fabricator/density.ts).
function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
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
      <SelectPrimitive.Icon asChild>
        <IconPlaceholder
          lucide="ChevronDownIcon"
          tabler="IconSelector"
          hugeicons="UnfoldMoreIcon"
          phosphor="CaretDownIcon"
          remixicon="RiArrowDownSLine"
          className="pointer-events-none size-(--density-icon-16) text-muted-foreground transition-colors duration-feedback"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="option"]',
    highlighted: "[data-highlighted]",
    selected: '[data-state="checked"]',
  })
  const containerRef = useMergedRef(fluid.attach)
  const density = useDensity()

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-density={density}
        data-align-trigger={position === "item-aligned"}
        className={cn(
          "cn-menu-target cn-menu-translucent relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup data-[align-trigger=true]:animate-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          ref={containerRef}
          {...fluid.props}
          data-position={position}
          className={cn(
            "relative isolate data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)",
            position === "popper" && ""
          )}
        >
          <FluidHoverSelection selection={fluid.selection} />
          <FluidHoverHighlight hover={fluid.hover} />
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
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
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex h-(--density-36) w-full cursor-pointer items-center gap-(--density-8) rounded-lg py-0 pr-[calc(var(--density-8)*2+var(--density-icon-16))] pl-(--density-8) text-(length:--density-text-13) text-muted-foreground outline-hidden transition-colors duration-feedback select-none data-fluid-hover-active:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-[selected]:bg-active data-[selected]:font-semibold data-[selected]:text-foreground in-data-[fluid-hover]:data-[selected]:bg-transparent data-checked:bg-active data-checked:font-semibold data-checked:text-foreground in-data-[fluid-hover]:data-checked:bg-transparent data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] data-fluid-hover-active:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16) *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-(--density-8)",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-(--density-8) flex size-(--density-icon-16) items-center justify-center text-foreground">
        <SelectPrimitive.ItemIndicator>
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="pointer-events-none"
          />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
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
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-surface-3 py-1 text-muted-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
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
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-surface-3 py-1 text-muted-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
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
    </SelectPrimitive.ScrollDownButton>
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
