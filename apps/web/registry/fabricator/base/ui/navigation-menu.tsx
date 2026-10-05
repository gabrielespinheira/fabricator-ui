"use client"

import * as React from "react"
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu"
import { cva } from "class-variance-authority"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/base/lib/fluid-hover"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream navigation menu: the menu is a fluid
// hover strip, so one highlight glides between the top-level triggers and
// links, and each content panel is a fluid hover container for its links.
const CONTENT = '[data-slot="navigation-menu-content"]'
const STRIP_ITEMS = `[data-slot="navigation-menu-trigger"], [data-slot="navigation-menu-link"]:not(${CONTENT} *)`
const CONTENT_LINKS = '[data-slot="navigation-menu-link"]'

// Content panels are the menu's React children (rendered in a portal or a
// viewport), so their pointer and click events reach the strip too. Only
// handle the strip's own.
function isFromStrip(event: React.SyntheticEvent<HTMLElement>) {
  const target = event.target as Element
  return event.currentTarget.contains(target) && !target.closest(CONTENT)
}

function useStripFluidHover(ref: React.Ref<HTMLElement> | undefined) {
  const fluid = useFluidHover<HTMLElement>({ items: STRIP_ITEMS, axis: "x" })
  const mergedRef = useMergedRef(fluid.attach, ref)
  const { onPointerMove, onClick, ...props } = fluid.props
  return {
    hover: fluid.hover,
    props: {
      ...props,
      ref: mergedRef,
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        if (isFromStrip(event)) onPointerMove(event)
      },
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        if (isFromStrip(event)) onClick(event)
      },
    },
  }
}

function NavigationMenu({
  align = "start",
  className,
  children,
  ref,
  ...props
}: NavigationMenuPrimitive.Root.Props &
  Pick<NavigationMenuPrimitive.Positioner.Props, "align">) {
  const strip = useStripFluidHover(ref)

  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn(
        "cn-navigation-menu group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...strip.props}
      {...props}
    >
      <FluidHoverHighlight hover={strip.hover} />
      {children}
      <NavigationMenuPositioner align={align} />
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn(
        "cn-navigation-menu-list group flex flex-1 list-none items-center justify-center",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("cn-navigation-menu-item relative", className)}
      {...props}
    />
  )
}

const navigationMenuTriggerStyle = cva(
  "cn-navigation-menu-trigger group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center outline-none disabled:pointer-events-none"
)

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <IconPlaceholder
        lucide="ChevronDownIcon"
        tabler="IconChevronDown"
        hugeicons="ArrowDown01Icon"
        phosphor="CaretDownIcon"
        remixicon="RiArrowDownSLine"
        className="cn-navigation-menu-trigger-icon"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  children,
  ref,
  ...props
}: NavigationMenuPrimitive.Content.Props) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: CONTENT_LINKS,
    axis: "xy",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "cn-navigation-menu-content data-ending-style:data-activation-direction=left:translate-x-[50%] data-ending-style:data-activation-direction=right:translate-x-[-50%] data-starting-style:data-activation-direction=left:translate-x-[-50%] data-starting-style:data-activation-direction=right:translate-x-[50%] h-full w-auto transition-[opacity,transform,translate] duration-[0.35s] data-ending-style:opacity-0 data-starting-style:opacity-0 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
        className
      )}
      ref={mergedRef}
      {...fluid.props}
      {...props}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {children}
    </NavigationMenuPrimitive.Content>
  )
}

function NavigationMenuPositioner({
  className,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  ...props
}: NavigationMenuPrimitive.Positioner.Props) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          "cn-navigation-menu-positioner isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-[0.35s] data-instant:transition-none",
          className
        )}
        {...props}
      >
        <NavigationMenuPrimitive.Popup className="cn-navigation-menu-popup data-[ending-style]:easing-[ease] xs:w-(--popup-width) relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) transition-[opacity,transform,width,height,scale,translate] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)]">
          <NavigationMenuPrimitive.Viewport className="relative size-full overflow-hidden" />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  )
}

function NavigationMenuLink({
  className,
  ...props
}: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn("cn-navigation-menu-link", className)}
      {...props}
    />
  )
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Icon>) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot="navigation-menu-indicator"
      className={cn(
        "cn-navigation-menu-indicator top-full z-1 flex h-1.5 items-end justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="cn-navigation-menu-indicator-arrow relative top-[60%] h-2 w-2 rotate-45" />
    </NavigationMenuPrimitive.Icon>
  )
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuPositioner,
}
