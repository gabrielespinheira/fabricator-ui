"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/radix-fabricator/lib/fluid-hover"
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
  className,
  children,
  viewport = true,
  ref,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean
}) {
  const strip = useStripFluidHover(ref)

  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative isolate flex max-w-max flex-1 items-center justify-center data-[viewport]:z-50",
        className
      )}
      {...strip.props}
      {...props}
    >
      <FluidHoverHighlight hover={strip.hover} />
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
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
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
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
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
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
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: CONTENT_LINKS,
    axis: "xy",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "relative top-0 left-0 isolate w-full p-1 duration-popup ease-enter group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-xl group-data-[viewport=false]/navigation-menu:bg-surface-3 group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow-surface-3 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none md:absolute md:w-auto group-data-[viewport=false]/navigation-menu:data-open:animate-in group-data-[viewport=false]/navigation-menu:data-open:fade-in-0 group-data-[viewport=false]/navigation-menu:data-open:zoom-in-(--motion-popup-scale) group-data-[viewport=false]/navigation-menu:data-closed:animate-out group-data-[viewport=false]/navigation-menu:data-closed:duration-popup-exit group-data-[viewport=false]/navigation-menu:data-closed:ease-exit group-data-[viewport=false]/navigation-menu:data-closed:fade-out-0 group-data-[viewport=false]/navigation-menu:data-closed:zoom-out-(--motion-popup-scale)",
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

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div
      className={cn(
        "absolute top-full left-0 isolate z-50 flex justify-center"
      )}
    >
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "origin-top-center relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full overflow-hidden rounded-xl bg-surface-3 text-popover-foreground shadow-surface-3 motion-popup md:w-(--radix-navigation-menu-viewport-width) data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          className
        )}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
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
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in",
        className
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
    </NavigationMenuPrimitive.Indicator>
  )
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
