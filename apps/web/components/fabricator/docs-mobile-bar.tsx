import Link from "next/link"

import { siteConfig } from "@/lib/config"
import type { source } from "@/lib/source"
import { CommandMenu } from "@/components/command-menu"
import { SiteSettingsMenu } from "@/components/fabricator/site-settings"
import { Icons } from "@/components/icons"
import { MobileNav } from "@/components/mobile-nav"

/** The docs top bar below the `lg` breakpoint, where the sidebar is hidden. */
export function DocsMobileBar({ tree }: { tree: typeof source.pageTree }) {
  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-background/90 px-4 backdrop-blur-md lg:hidden">
      <MobileNav tree={tree} items={siteConfig.navItems} />
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg text-[14px] font-semibold tracking-tight outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
      >
        <span className="flex size-6 items-center justify-center rounded-[7px] bg-foreground text-background">
          <Icons.logo className="size-3.5" />
        </span>
        {siteConfig.name}
      </Link>
      <div className="ms-auto flex items-center gap-1">
        <div className="w-28">
          <CommandMenu
            tree={tree}
            navItems={siteConfig.navItems}
            trigger="sidebar"
          />
        </div>
        <SiteSettingsMenu className="size-8 rounded-lg bg-transparent hover:bg-hover" />
      </div>
    </div>
  )
}
