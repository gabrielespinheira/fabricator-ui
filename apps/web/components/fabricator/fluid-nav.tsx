"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/styles/base-fabricator/lib/fluid-hover"

const ITEM = "[data-nav-item]"

/**
 * A list of links that share one gliding hover highlight, with a sliding
 * background behind the active link. The site's navigation uses it the same
 * way the components do.
 */
export function FluidNav({
  axis = "y",
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<"nav"> & { axis?: "x" | "y" }) {
  const fluid = useFluidHover<HTMLElement>({
    items: ITEM,
    selected: `${ITEM}[data-active="true"]`,
    axis,
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <nav
      ref={mergedRef}
      className={cn(
        "relative isolate flex",
        axis === "y" ? "flex-col" : "items-center",
        className
      )}
      {...fluid.props}
      {...props}
    >
      <FluidHoverSelection selection={fluid.selection} />
      <FluidHoverHighlight hover={fluid.hover} />
      {children}
    </nav>
  )
}

export function FluidNavLink({
  href,
  active,
  exact = false,
  match,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  href: string
  /** Overrides the pathname match. */
  active?: boolean
  /** Match the pathname exactly instead of by prefix. */
  exact?: boolean
  /** The path prefix that marks the link active, when it differs from href. */
  match?: string
}) {
  const pathname = usePathname()
  const isActive =
    active ??
    (exact || href === "/"
      ? pathname === href
      : pathname.startsWith(match ?? href))

  return (
    <Link
      href={href}
      data-nav-item=""
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2 rounded-lg text-muted-foreground outline-none select-none focus-visible:ring-1 focus-visible:ring-focus-ring data-[active=true]:text-foreground data-[fluid-hover-active]:text-foreground",
        "transition-colors duration-fast ease-spring",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  )
}
