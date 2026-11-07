"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  composeRenderProps,
  Header as HeaderPrimitive,
  MenuItem as MenuItemPrimitive,
  Menu as MenuPrimitive,
  MenuSection as MenuSectionPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  Popover as PopoverPrimitive,
  Separator as SeparatorPrimitive,
  SubmenuTrigger as SubmenuTriggerPrimitive,
  type MenuItemProps as MenuItemPrimitiveProps,
  type MenuSectionProps as MenuSectionPrimitiveProps,
} from "react-aria-components"
import { createPortal } from "react-dom"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/aria-fabricator/lib/fluid-hover"
import { useDensity } from "@/registry/aria-fabricator/ui/density"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream dropdown menu: the menu is a fluid
// hover container, so one highlight glides between items (keyboard
// navigation moves the same highlight). The menu renders a collection, so the
// highlight is portalled into it rather than passed as a child.
//
// Its popups take the density of the nearest DensityProvider, which their
// portals would otherwise lose (registry/fabricator/density.ts).
const MENU_ITEMS =
  '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof MenuTriggerPrimitive>) {
  return <MenuTriggerPrimitive data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenu({
  "data-slot": dataSlot = "dropdown-menu-content",
  placement = "bottom start",
  offset = 4,
  crossOffset = 0,
  className,
  children,
  ref,
  ...props
}: Omit<
  React.ComponentProps<typeof MenuPrimitive<object>>,
  "children" | "className"
> &
  Pick<
    React.ComponentProps<typeof PopoverPrimitive>,
    "placement" | "offset" | "crossOffset"
  > & {
    "data-slot"?: string
    className?: string
    children?: React.ReactNode
  }) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: MENU_ITEMS,
    highlighted: "[data-focused]",
  })
  const [menu, setMenu] = React.useState<HTMLDivElement | null>(null)
  const mergedRef = useMergedRef(fluid.attach, setMenu, ref)
  const density = useDensity()

  return (
    <PopoverPrimitive
      data-slot={dataSlot}
      data-density={density}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        "cn-menu-target cn-menu-translucent relative isolate z-50 w-(--trigger-width) min-w-32 origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup outline-none data-entering:animate-in data-entering:fade-in-0 data-exiting:animate-out data-exiting:overflow-hidden data-exiting:fade-out-0 **:data-[slot$=-item]:data-focused:not-in-data-[fluid-hover]:bg-hover",
        className
      )}
    >
      <MenuPrimitive
        className="relative isolate max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden"
        ref={mergedRef}
        {...fluid.props}
        {...props}
      >
        {children}
      </MenuPrimitive>
      {menu && createPortal(<FluidHoverHighlight hover={fluid.hover} />, menu)}
    </PopoverPrimitive>
  )
}

function DropdownMenuGroup({
  ...props
}: Omit<MenuSectionPrimitiveProps<object>, "children"> & {
  children?: React.ReactNode
}) {
  return <MenuSectionPrimitive data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof HeaderPrimitive> & {
  inset?: boolean
}) {
  return (
    <HeaderPrimitive
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-(--density-8) py-(--density-6) text-(length:--density-text-12) font-normal text-muted-foreground data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))]",
        className
      )}
      {...props}
    />
  )
}

const dropdownMenuItemVariants = cva(
  "group/dropdown-menu-item relative flex items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      selectionMode: {
        none: "relative h-(--density-36) cursor-pointer gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground transition-colors duration-feedback data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground in-data-[fluid-hover]:data-focused:bg-transparent data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-[variant=destructive]:text-destructive-text! [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] data-fluid-hover-active:[&_svg]:stroke-2 data-focused:[&_svg]:stroke-2 data-highlighted:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16) data-[variant=destructive]:*:[svg]:text-destructive",
        single:
          "relative h-(--density-36) cursor-pointer gap-(--density-8) rounded-lg py-0 pr-[calc(var(--density-8)*2+var(--density-icon-16))] pl-(--density-8) text-(length:--density-text-13) text-muted-foreground transition-[color,background-color] duration-feedback data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground in-data-[fluid-hover]:data-focused:bg-transparent data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-checked:font-semibold data-checked:text-foreground data-selected:font-semibold data-selected:text-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        multiple:
          "relative h-(--density-36) cursor-pointer gap-(--density-8) rounded-lg py-0 pr-[calc(var(--density-8)*2+var(--density-icon-16))] pl-(--density-8) text-(length:--density-text-13) text-muted-foreground transition-[color,background-color] duration-feedback data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground in-data-[fluid-hover]:data-focused:bg-transparent data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-checked:font-semibold data-checked:text-foreground data-selected:font-semibold data-selected:text-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
      },
    },
  }
)

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  children,
  ...props
}: MenuItemPrimitiveProps<object> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuItemPrimitive
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      textValue={typeof children === "string" ? children : props.textValue}
      className={composeRenderProps(className, (className, { selectionMode }) =>
        cn(dropdownMenuItemVariants({ selectionMode }), className)
      )}
      {...props}
    >
      {composeRenderProps(
        children,
        (children, { isSelected, selectionMode }) => (
          <>
            {selectionMode !== "none" ? (
              <span
                className="pointer-events-none absolute right-(--density-8) flex items-center justify-center text-foreground"
                data-slot={
                  selectionMode === "single"
                    ? "dropdown-menu-radio-item-indicator"
                    : "dropdown-menu-checkbox-item-indicator"
                }
              >
                {isSelected ? (
                  <IconPlaceholder
                    lucide="CheckIcon"
                    tabler="IconCheck"
                    hugeicons="Tick02Icon"
                    phosphor="CheckIcon"
                    remixicon="RiCheckLine"
                  />
                ) : null}
              </span>
            ) : null}
            {children}
          </>
        )
      )}
    </MenuItemPrimitive>
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof SubmenuTriggerPrimitive>) {
  return <SubmenuTriggerPrimitive data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuItemPrimitiveProps<object> & {
  inset?: boolean
}) {
  return (
    <MenuItemPrimitive
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      textValue={typeof children === "string" ? children : props.textValue}
      className={cn(
        "relative flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground outline-hidden transition-colors duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground in-data-[fluid-hover]:data-focused:bg-transparent data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent data-inset:pl-[calc(var(--density-8)*2+var(--density-icon-16))] data-popup-open:text-foreground not-data-fluid-hover-active:data-popup-open:bg-hover data-open:text-foreground not-data-fluid-hover-active:data-open:bg-hover [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <IconPlaceholder
            lucide="ChevronRightIcon"
            tabler="IconChevronRight"
            hugeicons="ArrowRight01Icon"
            phosphor="CaretRightIcon"
            remixicon="RiArrowRightSLine"
            className="cn-rtl-flip ml-auto"
          />
        </>
      ))}
    </MenuItemPrimitive>
  )
}

function DropdownMenuSubContent({
  placement = "end top",
  crossOffset = -3,
  offset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenu>) {
  return (
    <DropdownMenu
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "cn-menu-target cn-menu-translucent relative isolate w-auto min-w-[96px] rounded-xl bg-surface-3 p-1 text-popover-foreground shadow-surface-3 motion-popup",
        className
      )}
      placement={placement}
      crossOffset={crossOffset}
      offset={offset}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-(length:--density-text-11) tracking-normal text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
