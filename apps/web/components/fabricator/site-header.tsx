import * as React from "react"
import Link from "next/link"

import { getColors } from "@/lib/colors"
import { siteConfig } from "@/lib/config"
import { source } from "@/lib/source"
import { CommandMenu } from "@/components/command-menu"
import { DesignerActions } from "@/components/designer-actions"
import { FluidNav, FluidNavLink } from "@/components/fabricator/fluid-nav"
import { SiteSettingsMenu } from "@/components/fabricator/site-settings"
import { StarsCount } from "@/components/github-link"
import { Icons } from "@/components/icons"
import { MobileNav } from "@/components/mobile-nav"

/** The top bar for the homepage and the full-width pages. */
export function SiteHeader() {
  const colors = getColors()
  const pageTree = source.pageTree
  const navItems = siteConfig.navItems.filter((item) => item.href !== "/")

  return (
    <header
      data-slot="site-header"
      className="relative z-50 w-full bg-background group-has-data-[slot=docs-shell]/layout:hidden"
    >
      <div className="grid h-18 grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-5 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-3">
          <MobileNav
            tree={pageTree}
            items={siteConfig.navItems}
            className="flex lg:hidden"
          />
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg text-[15px] font-semibold tracking-tight outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-foreground text-background">
              <Icons.logo className="size-4.5" />
            </span>
            <span className="hidden whitespace-nowrap sm:inline lg:hidden xl:inline">
              {siteConfig.name}
            </span>
          </Link>
          <FluidNav axis="x" className="ms-4 hidden lg:flex">
            {navItems.map((item) => (
              <FluidNavLink
                key={item.href}
                href={item.href}
                match={item.href.startsWith("/charts") ? "/charts" : undefined}
                className="h-9 px-3 text-[15px] font-medium"
              >
                {item.label}
              </FluidNavLink>
            ))}
          </FluidNav>
        </div>
        <div className="hidden justify-center lg:flex">
          <CommandMenu
            tree={pageTree}
            colors={colors}
            navItems={siteConfig.navItems}
            trigger="pill"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <div className="hidden w-32 sm:block lg:hidden">
            <CommandMenu
              tree={pageTree}
              colors={colors}
              navItems={siteConfig.navItems}
              trigger="sidebar"
            />
          </div>
          <Link
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer"
            className="hidden h-10 items-center gap-1.5 rounded-full bg-muted px-3.5 text-[13px] font-medium text-foreground transition-colors duration-80 ease-spring outline-none hover:bg-active focus-visible:ring-1 focus-visible:ring-focus-ring sm:flex"
          >
            <Icons.gitHub className="size-4" />
            <span className="sr-only">GitHub</span>
            <React.Suspense fallback={null}>
              <StarsCount />
            </React.Suspense>
          </Link>
          <SiteSettingsMenu />
          <DesignerActions />
          <Link
            href="/docs/installation"
            className="flex h-10 items-center rounded-full bg-foreground px-4.5 text-[15px] font-medium text-background transition-[opacity,scale] duration-80 ease-spring outline-none group-has-data-[slot=designer]/layout:hidden hover:opacity-90 focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
