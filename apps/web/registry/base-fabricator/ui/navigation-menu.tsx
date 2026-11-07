"use client"

import * as React from "react"
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu"
import { cva } from "class-variance-authority"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/base-fabricator/lib/fluid-hover"
import { useDensity } from "@/registry/base-fabricator/ui/density"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream navigation menu: the menu is a fluid
// hover strip, so one highlight glides between the top-level triggers and
// links, and each content panel is a fluid hover container for its links.
//
// The popup takes the density of the nearest DensityProvider, which its
// portal would otherwise lose (registry/fabricator/density.ts).
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
        "group/navigation-menu relative isolate flex max-w-max flex-1 items-center justify-center data-[viewport]:z-50",
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
        "group flex flex-1 list-none items-center justify-center gap-0.5",
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
      className={cn("relative", className)}
      {...props}
    />
  )
}

const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger inline-flex h-9 w-max cursor-pointer items-center justify-center rounded-lg px-(--density-12) text-(length:--density-text-13) font-normal text-muted-foreground transition-colors duration-feedback outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 in-data-[fluid-hover]:hover:bg-transparent data-fluid-hover-active:text-foreground data-popup-open:text-foreground not-data-fluid-hover-active:data-popup-open:bg-hover data-open:text-foreground not-data-fluid-hover-active:data-open:bg-hover"
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
        className="ms-(--density-4) -me-(--density-4) size-(--density-icon-14) transition duration-popup ease-enter group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180"
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
        "data-ending-style:data-activation-direction=left:translate-x-[50%] data-ending-style:data-activation-direction=right:translate-x-[-50%] data-starting-style:data-activation-direction=left:translate-x-[-50%] data-starting-style:data-activation-direction=right:translate-x-[50%] relative isolate h-full w-auto p-1 transition-[opacity,transform,translate] duration-popup ease-enter group-data-[viewport=false]/navigation-menu:rounded-xl group-data-[viewport=false]/navigation-menu:bg-surface-3 group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow-surface-3 data-ending-style:opacity-0 data-starting-style:opacity-0 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none group-data-[viewport=false]/navigation-menu:data-open:animate-in group-data-[viewport=false]/navigation-menu:data-open:fade-in-0 group-data-[viewport=false]/navigation-menu:data-open:zoom-in-(--motion-popup-scale) group-data-[viewport=false]/navigation-menu:data-closed:animate-out group-data-[viewport=false]/navigation-menu:data-closed:duration-popup-exit group-data-[viewport=false]/navigation-menu:data-closed:ease-exit group-data-[viewport=false]/navigation-menu:data-closed:fade-out-0 group-data-[viewport=false]/navigation-menu:data-closed:zoom-out-(--motion-popup-scale)",
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
  const density = useDensity()

  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        data-density={density}
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          "isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-move ease-move data-instant:transition-none data-[side=bottom]:before:top-[-10px] data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0",
          className
        )}
        {...props}
      >
        <NavigationMenuPrimitive.Popup className="data-[ending-style]:easing-[ease] xs:w-(--popup-width) relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) rounded-xl bg-surface-3 text-popover-foreground shadow-surface-3 transition-[opacity,transform,width,height,scale,translate] motion-popup outline-none data-ending-style:scale-(--motion-popup-scale) data-ending-style:opacity-0 data-starting-style:scale-(--motion-popup-scale) data-starting-style:opacity-0">
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
      className={cn(
        "flex cursor-pointer items-center gap-(--density-8) rounded-lg p-(--density-8) text-(length:--density-text-13) transition-colors duration-feedback outline-none hover:bg-hover focus-visible:bg-hover in-data-[fluid-hover]:hover:bg-transparent data-active:bg-active data-active:text-foreground [&_svg]:stroke-[1.5] data-fluid-hover-active:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
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
        "top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in",
        className
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
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
