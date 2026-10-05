"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { type ColorPalette } from "@/lib/colors"
import { siteConfig } from "@/lib/config"
import { PAGES_NEW } from "@/lib/docs"
import { showMcpDocs } from "@/lib/flags"
import {
  getCurrentBase,
  getPagesFromFolder,
  type PageTreeFolder,
} from "@/lib/page-tree"
import type { source } from "@/lib/source"
import { CommandMenu } from "@/components/command-menu"
import { FluidNav, FluidNavLink } from "@/components/fabricator/fluid-nav"
import { Icons } from "@/components/icons"
import { ModeSwitcher } from "@/components/mode-switcher"

const TOP_LINKS = [
  { name: "Home", href: "/", exact: true },
  { name: "Introduction", href: "/docs", exact: true },
  { name: "Installation", href: "/docs/installation", exact: false },
  { name: "Changelog", href: "/docs/changelog", exact: false },
]

// Folder order; anything not listed follows in page-tree order.
const GROUP_ORDER = ["Get Started", "Foundations", "Components"]
const COUNTED_GROUPS = ["Foundations", "Components"]
const EXCLUDED_SECTIONS = ["installation", "dark-mode", "changelog", "rtl"]
const EXCLUDED_PAGES = [
  "/docs",
  "/docs/changelog",
  "/docs/rtl",
  "/docs/new",
  "/docs/installation",
]

const SITE_LINKS = [
  { name: "Blocks", href: "/blocks", match: "/blocks" },
  { name: "Charts", href: "/charts/area", match: "/charts" },
  { name: "Colors", href: "/colors", match: "/colors" },
  { name: "Create", href: "/create", match: "/create" },
]

const ITEM_CLASS =
  "h-8 shrink-0 px-2 text-[14px] data-[active=true]:font-medium"

export function DocsShellSidebar({
  tree,
  colors,
  className,
}: {
  tree: typeof source.pageTree
  colors: ColorPalette[]
  className?: string
}) {
  const pathname = usePathname()
  const currentBase = getCurrentBase(pathname)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const groups = React.useMemo(() => {
    const folders = tree.children.filter(
      (item): item is PageTreeFolder =>
        item.type === "folder" && !EXCLUDED_SECTIONS.includes(item.$id ?? "")
    )
    const rank = (folder: PageTreeFolder) => {
      const index = GROUP_ORDER.indexOf(String(folder.name))
      return index === -1 ? GROUP_ORDER.length : index
    }
    return [...folders]
      .sort((a, b) => rank(a) - rank(b))
      .map((folder) => ({
        id: folder.$id ?? String(folder.name),
        name: String(folder.name),
        pages: getPagesFromFolder(folder, currentBase).filter(
          (page) =>
            !EXCLUDED_PAGES.includes(page.url) &&
            (showMcpDocs || !page.url.includes("/mcp"))
        ),
      }))
      .filter((group) => group.pages.length > 0)
  }, [tree, currentBase])

  // Bring the active page into view on first load. The layout persists across
  // navigations, so the scroll position is kept after that.
  React.useEffect(() => {
    const container = scrollRef.current
    const active = container?.querySelector<HTMLElement>(
      '[data-nav-item][data-active="true"]:not([href="/"])'
    )
    if (!container || !active) return
    const top = active.offsetTop - container.clientHeight / 2
    if (
      active.offsetTop < container.scrollTop ||
      active.offsetTop > container.scrollTop + container.clientHeight - 40
    ) {
      container.scrollTop = Math.max(0, top)
    }
    // Only on mount.
  }, [])

  return (
    <aside
      data-slot="docs-shell-sidebar"
      className={cn(
        "sticky top-0 flex h-svh w-66 shrink-0 flex-col gap-1 py-3",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 pt-1 pb-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg text-[14px] font-semibold tracking-tight outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
        >
          <span className="flex size-6 items-center justify-center rounded-[7px] bg-foreground text-background">
            <Icons.logo className="size-3.5" />
          </span>
          {siteConfig.name}
        </Link>
        <ModeSwitcher className="size-7 rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground dark:hover:bg-hover [&_svg]:size-4" />
      </div>
      <div className="px-2">
        <CommandMenu
          tree={tree}
          colors={colors}
          navItems={siteConfig.navItems}
          trigger="sidebar"
        />
      </div>
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 scroll-fade flex-col gap-5 overflow-y-auto px-2 pt-2 pb-8"
      >
        <FluidNav>
          {TOP_LINKS.map((link) => (
            <FluidNavLink
              key={link.href}
              href={link.href}
              exact={link.exact}
              className={ITEM_CLASS}
            >
              {link.name}
            </FluidNavLink>
          ))}
        </FluidNav>
        {groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-1">
            <h3 className="flex h-7 items-center justify-between px-2 text-[12px] font-medium text-muted-foreground">
              {group.name}
              {COUNTED_GROUPS.includes(group.name) && (
                <span className="tabular-nums">{group.pages.length}</span>
              )}
            </h3>
            <FluidNav>
              {group.pages.map((page) => (
                <FluidNavLink
                  key={page.url}
                  href={page.url}
                  exact
                  className={ITEM_CLASS}
                >
                  {page.name}
                  {PAGES_NEW.includes(page.url) && (
                    <span
                      className="size-1.5 rounded-full bg-focus-ring"
                      title="New"
                    />
                  )}
                </FluidNavLink>
              ))}
            </FluidNav>
          </section>
        ))}
        <section className="flex flex-col gap-1">
          <h3 className="flex h-7 items-center px-2 text-[12px] font-medium text-muted-foreground">
            More
          </h3>
          <FluidNav>
            {SITE_LINKS.map((link) => (
              <FluidNavLink
                key={link.href}
                href={link.href}
                match={link.match}
                className={ITEM_CLASS}
              >
                {link.name}
              </FluidNavLink>
            ))}
          </FluidNav>
        </section>
      </div>
    </aside>
  )
}
