"use client"

import * as React from "react"
import { cn } from "cn"
import { Menubar as MenubarPrimitive } from "radix-ui"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/radix-fabricator/lib/fluid-hover"
import { useDensity } from "@/registry/radix-fabricator/ui/density"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream menubar: the bar is a fluid hover
// strip, so one highlight glides between its triggers, and the menus are
// fluid hover containers (keyboard navigation from the primitive moves the
// same highlight).
//
// Its popups take the density of the nearest DensityProvider, which their
// portals would otherwise lose (registry/fabricator/density.ts).
const MENUBAR_TRIGGERS = '[data-slot="menubar-trigger"]'
const MENU_ITEMS =
  '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'

// The menus are the bar's React children, rendered in portals, so their
// pointer and click events bubble to the bar. Only handle the bar's own.
function isFromBar(event: React.SyntheticEvent<HTMLElement>) {
  return event.currentTarget.contains(event.target as Node)
}

function useMenuFluidHover(ref: React.Ref<HTMLDivElement> | undefined) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: MENU_ITEMS,
    highlighted: "[data-highlighted]",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)
  return { fluid, mergedRef }
}

function Menubar({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: MENUBAR_TRIGGERS,
    axis: "x",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)
  const { onPointerMove, onClick, ...fluidProps } = fluid.props

  return (
    <MenubarPrimitive.Root
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
    </MenubarPrimitive.Root>
  )
}

function MenubarMenu({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />
}

function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />
}

function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />
}

function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return (
    <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
  )
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
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
  children,
  ref,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  const { fluid, mergedRef } = useMenuFluidHover(ref)
  const density = useDensity()

  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        data-density={density}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "cn-menu-target cn-menu-translucent relative isolate z-50 w-auto min-w-36 origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          className
        )}
        ref={mergedRef}
        {...fluid.props}
        {...props}
      >
        <FluidHoverHighlight hover={fluid.hover} />
        {children}
      </MenubarPrimitive.Content>
    </MenubarPortal>
  )
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/menubar-item relative flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground outline-hidden transition-colors duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-[variant=destructive]:text-destructive-text! data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] data-fluid-hover-active:[&_svg]:stroke-2 data-highlighted:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16) data-[variant=destructive]:*:[svg]:text-destructive!",
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
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem> & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg py-0 pr-(--density-8) pl-[calc(var(--density-8)*2+var(--density-icon-16))] text-(length:--density-text-13) text-muted-foreground outline-hidden transition-[color,background-color] duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-checked:font-semibold data-checked:text-foreground data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-(--density-8) flex size-(--density-icon-16) items-center justify-center text-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)">
        <MenubarPrimitive.ItemIndicator>
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
          />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
}

function MenubarRadioItem({
  className,
  children,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem> & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg py-0 pr-(--density-8) pl-[calc(var(--density-8)*2+var(--density-icon-16))] text-(length:--density-text-13) text-muted-foreground outline-hidden transition-[color,background-color] duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-checked:font-semibold data-checked:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-(--density-8) flex size-(--density-icon-16) items-center justify-center text-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)">
        <MenubarPrimitive.ItemIndicator>
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
          />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  )
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.Label
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
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
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
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground transition-colors duration-feedback outline-none select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-popup-open:text-foreground not-data-fluid-hover-active:data-popup-open:bg-hover data-open:text-foreground not-data-fluid-hover-active:data-open:bg-hover [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      {children}
      <IconPlaceholder
        lucide="ChevronRightIcon"
        tabler="IconChevronRight"
        hugeicons="ArrowRight01Icon"
        phosphor="CaretRightIcon"
        remixicon="RiArrowRightSLine"
        className="cn-rtl-flip ml-auto size-4"
      />
    </MenubarPrimitive.SubTrigger>
  )
}

function MenubarSubContent({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  const { fluid, mergedRef } = useMenuFluidHover(ref)
  const density = useDensity()

  return (
    <MenubarPrimitive.SubContent
      data-slot="menubar-sub-content"
      data-density={density}
      className={cn(
        "cn-menu-target cn-menu-translucent relative isolate z-50 min-w-32 origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      ref={mergedRef}
      {...fluid.props}
      {...props}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {children}
    </MenubarPrimitive.SubContent>
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
