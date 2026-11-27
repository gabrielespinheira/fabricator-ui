"use client"

// Bottom Nav: a phone app's tab bar. The current tab opens to show its name
// on a pill that slides between tabs, the others close to their icons, and
// the icon pops as it is picked. Names stay in the page for screen readers when closed. Tabs are
// links (BottomNavLink) or buttons (BottomNavItem); mark the current one with
// `active`.
import * as React from "react"
import { cn } from "cn"

import {
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/__base__/lib/fluid-hover"

const ITEM = '[data-slot="bottom-nav-item"]'

// One pill slides under the current tab on the selection springs, and
// follows its width as the name opens.
function BottomNav({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<"nav">) {
  const fluid = useFluidHover<HTMLElement>({
    items: ITEM,
    selected: `${ITEM}[data-active]`,
    axis: "x",
    gapClick: false,
  })
  const mergedRef = useMergedRef(fluid.attach, ref)
  return (
    <nav
      ref={mergedRef}
      data-slot="bottom-nav"
      className={cn(
        "cn-bottom-nav relative isolate flex items-center",
        className
      )}
      {...fluid.props}
      {...props}
    >
      <FluidHoverSelection
        selection={fluid.selection}
        className="cn-bottom-nav-selection"
      />
      {children}
    </nav>
  )
}

type BottomNavItemContent = {
  /** The current tab: it opens to show its name. */
  active?: boolean
  icon: React.ReactNode
  /** The tab's name, shown when active and always read out. */
  label: string
}

function BottomNavItemContent({
  icon,
  label,
}: Omit<BottomNavItemContent, "active">) {
  return (
    <>
      <span
        data-slot="bottom-nav-icon"
        aria-hidden
        className="cn-bottom-nav-icon flex shrink-0 items-center justify-center"
      >
        {icon}
      </span>
      <span
        data-slot="bottom-nav-label-frame"
        className="cn-bottom-nav-label-frame grid min-w-0"
      >
        <span className="cn-bottom-nav-label overflow-hidden whitespace-nowrap">
          {label}
        </span>
      </span>
    </>
  )
}

/** A tab that acts in place, such as switching a view. */
function BottomNavItem({
  active = false,
  icon,
  label,
  className,
  ...props
}: BottomNavItemContent & Omit<React.ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      data-slot="bottom-nav-item"
      data-active={active ? "" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "cn-bottom-nav-item group/bottom-nav-item flex items-center outline-none",
        className
      )}
      {...props}
    >
      <BottomNavItemContent icon={icon} label={label} />
    </button>
  )
}

/** A tab that goes to a page. */
function BottomNavLink({
  active = false,
  icon,
  label,
  className,
  ...props
}: BottomNavItemContent & Omit<React.ComponentProps<"a">, "children">) {
  return (
    <a
      data-slot="bottom-nav-item"
      data-active={active ? "" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "cn-bottom-nav-item group/bottom-nav-item flex items-center outline-none",
        className
      )}
      {...props}
    >
      <BottomNavItemContent icon={icon} label={label} />
    </a>
  )
}

export { BottomNav, BottomNavItem, BottomNavLink }
