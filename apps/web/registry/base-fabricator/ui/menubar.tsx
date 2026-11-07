"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/base-fabricator/lib/fluid-hover"
import { useDensity } from "@/registry/base-fabricator/ui/density"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/base-fabricator/ui/dropdown-menu"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream menubar: the bar is a fluid hover
// strip, so one highlight glides between its triggers. The menus come from
// the dropdown menu, which is a fluid hover container itself.
//
// Its popups take the density of the nearest DensityProvider, which their
// portals would otherwise lose (registry/fabricator/density.ts).
const MENUBAR_TRIGGERS = '[data-slot="menubar-trigger"]'

// The menus are the bar's React children, rendered in portals, so their
// pointer and click events bubble to the bar. Only handle the bar's own.
function isFromBar(event: React.SyntheticEvent<HTMLElement>) {
  return event.currentTarget.contains(event.target as Node)
}

function Menubar({
  className,
  children,
  ref,
  ...props
}: MenubarPrimitive.Props) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: MENUBAR_TRIGGERS,
    axis: "x",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)
  const { onPointerMove, onClick, ...fluidProps } = fluid.props

  return (
    <MenubarPrimitive
      data-slot="menubar"
      className={cn(
        "relative isolate flex h-(--density-36) items-center gap-0.5 rounded-xl bg-card p-(--density-4) shadow-surface-2",
        className
      )}
      ref={mergedRef}
      {...fluidProps}
      onPointerMove={(event) => isFromBar(event) && onPointerMove(event)}
      onClick={(event) => isFromBar(event) && onClick(event)}
      {...props}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {children}
    </MenubarPrimitive>
  )
}

function MenubarMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
  return <DropdownMenu data-slot="menubar-menu" {...props} />
}

function MenubarGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuGroup>) {
  return <DropdownMenuGroup data-slot="menubar-group" {...props} />
}

function MenubarPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPortal>) {
  return <DropdownMenuPortal data-slot="menubar-portal" {...props} />
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
  return (
    <DropdownMenuTrigger
      data-slot="menubar-trigger"
      className={cn(
        "flex h-(--density-28) cursor-pointer items-center rounded-lg px-(--density-10) text-(length:--density-text-13) font-normal text-muted-foreground outline-hidden transition-colors duration-feedback select-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring in-data-[fluid-hover]:hover:bg-transparent aria-expanded:text-foreground not-data-fluid-hover-active:aria-expanded:bg-hover data-fluid-hover-active:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  const density = useDensity()

  return (
    <DropdownMenuContent
      data-slot="menubar-content"
      data-density={density}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(
        "cn-menu-target cn-menu-translucent relative isolate w-auto min-w-36 rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/menubar-item h-(--density-36) cursor-pointer gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground transition-colors duration-feedback data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-[variant=destructive]:text-destructive-text! data-disabled:opacity-50 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] data-fluid-hover-active:[&_svg]:stroke-2 data-highlighted:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16) data-[variant=destructive]:*:[svg]:text-destructive!",
        className
      )}
      {...props}
    />
  )
}

function MenubarCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg py-0 pr-(--density-8) pl-[calc(var(--density-8)*2+var(--density-icon-16))] text-(length:--density-text-13) text-muted-foreground outline-hidden transition-[color,background-color] duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-checked:font-semibold data-checked:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-(--density-8) flex size-(--density-icon-16) items-center justify-center text-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)">
        <MenuPrimitive.CheckboxItemIndicator>
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
          />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup>) {
  return <DropdownMenuRadioGroup data-slot="menubar-radio-group" {...props} />
}

function MenubarRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menubar-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg py-0 pr-(--density-8) pl-[calc(var(--density-8)*2+var(--density-icon-16))] text-(length:--density-text-13) text-muted-foreground outline-hidden transition-[color,background-color] duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-checked:font-semibold data-checked:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-(--density-8) flex size-(--density-icon-16) items-center justify-center text-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)">
        <MenuPrimitive.RadioItemIndicator>
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
          />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuLabel
      data-slot="menubar-label"
      data-inset={inset}
      className={cn(
        "px-(--density-8) py-(--density-6) text-(length:--density-text-12) font-normal text-muted-foreground data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))]",
        className
      )}
      {...props}
    />
  )
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return (
    <DropdownMenuSeparator
      data-slot="menubar-separator"
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuShortcut>) {
  return (
    <DropdownMenuShortcut
      data-slot="menubar-shortcut"
      className={cn(
        "ml-auto text-(length:--density-text-11) tracking-normal text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function MenubarSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuSub>) {
  return <DropdownMenuSub data-slot="menubar-sub" {...props} />
}

function MenubarSubTrigger({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuSubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "h-(--density-36) cursor-pointer gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground transition-colors duration-feedback data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-popup-open:text-foreground not-data-fluid-hover-active:data-popup-open:bg-hover data-open:text-foreground not-data-fluid-hover-active:data-open:bg-hover [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    />
  )
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubContent>) {
  const density = useDensity()

  return (
    <DropdownMenuSubContent
      data-slot="menubar-sub-content"
      data-density={density}
      className={cn(
        "cn-menu-target cn-menu-translucent relative isolate min-w-32 rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
}
