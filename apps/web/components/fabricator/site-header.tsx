import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { source } from "@/lib/source"
import { FluidNav, FluidNavLink } from "@/components/fabricator/fluid-nav"
import { SiteSettingsMenu } from "@/components/fabricator/site-settings"
import { Icons } from "@/components/icons"
import { MobileNav } from "@/components/mobile-nav"
import { Button } from "@/styles/base-fabricator/ui/button"

/** The top bar for the homepage and the full-width pages. */
export function SiteHeader() {
  const pageTree = source.pageTree
  const navItems = siteConfig.navItems.filter((item) => item.href !== "/")

  return (
    <header
      data-slot="site-header"
      className="relative z-50 w-full bg-background group-has-data-[slot=docs-shell]/layout:hidden"
    >
      <div className="grid h-18 grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-5">
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
          <FluidNav axis="x" className="ms-4 hidden gap-1 lg:flex">
            {navItems.map((item) => (
              <FluidNavLink
                key={item.href}
                href={item.href}
                className="h-9 px-3 text-[15px] font-medium"
              >
                {item.label}
              </FluidNavLink>
            ))}
          </FluidNav>
        </div>
        <div className="flex items-center justify-end gap-2">
          <SiteSettingsMenu size="icon" />
          <Button nativeButton={false} render={<Link href="/create" />}>
            Get started
          </Button>
        </div>
      </div>
    </header>
  )
}
