"use client"

import * as React from "react"
import { cn } from "cn"
import { Menubar as MenubarPrimitive } from "radix-ui"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/radix/lib/fluid-hover"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream menubar: the bar is a fluid hover
// strip, so one highlight glides between its triggers, and the menus are
// fluid hover containers (keyboard navigation from the primitive moves the
// same highlight).
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
      className={cn("cn-menubar flex items-center", className)}
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
        "cn-menubar-trigger flex items-center outline-hidden select-none",
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

  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "cn-menubar-content cn-menu-target cn-menu-translucent z-50 origin-(--radix-menubar-content-transform-origin) overflow-hidden",
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
        "cn-menubar-item group/menubar-item relative flex items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
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
        "cn-menubar-checkbox-item relative flex items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="cn-menubar-checkbox-item-indicator pointer-events-none absolute flex items-center justify-center">
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
        "cn-menubar-radio-item relative flex items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <span className="cn-menubar-radio-item-indicator pointer-events-none absolute flex items-center justify-center">
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
      className={cn("cn-menubar-label", className)}
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
      className={cn("cn-menubar-separator -mx-1 my-1 h-px", className)}
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
      className={cn("cn-menubar-shortcut ml-auto", className)}
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
        "cn-menubar-sub-trigger flex items-center outline-none select-none",
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

  return (
    <MenubarPrimitive.SubContent
      data-slot="menubar-sub-content"
      className={cn(
        "cn-menubar-sub-content cn-menu-target cn-menu-translucent z-50 origin-(--radix-menubar-content-transform-origin) overflow-hidden",
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
