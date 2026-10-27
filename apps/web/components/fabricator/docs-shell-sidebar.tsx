"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"
import { ChevronRightIcon } from "lucide-react"

import { groupComponentPages } from "@/lib/component-groups"
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
import { SiteSettingsMenu } from "@/components/fabricator/site-settings"
import { Icons } from "@/components/icons"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/styles/base-fabricator/ui/collapsible"

const TOP_LINKS = [
  { name: "Home", href: "/", exact: true },
  { name: "Introduction", href: "/docs", exact: true },
  { name: "Installation", href: "/docs/installation", exact: false },
  { name: "Changelog", href: "/docs/changelog", exact: false },
]

// Folder order; anything not listed follows in page-tree order.
const GROUP_ORDER = ["Get Started", "Tooling", "Foundations", "Components"]
const COUNTED_GROUPS = ["Foundations"]
const EXCLUDED_SECTIONS = ["installation", "dark-mode", "changelog", "rtl"]
const EXCLUDED_PAGES = [
  "/docs",
  "/docs/changelog",
  "/docs/rtl",
  "/docs/new",
  "/docs/installation",
]

const ITEM_CLASS =
  "h-8 shrink-0 px-2 text-[14px] data-[active=true]:font-medium"

export function DocsShellSidebar({
  tree,
  className,
}: {
  tree: typeof source.pageTree
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
      .flatMap((folder) => {
        const id = folder.$id ?? String(folder.name)
        const name = String(folder.name)
        const pages = getPagesFromFolder(folder, currentBase).filter(
          (page) =>
            !EXCLUDED_PAGES.includes(page.url) &&
            (showMcpDocs || !page.url.includes("/mcp"))
        )
        // Components split into their groups (lib/component-groups.ts).
        if (id === "components") {
          return groupComponentPages(pages).map((entry) => ({
            id: `components-${entry.group}`,
            name: entry.group,
            pages: entry.pages,
            isCounted: true,
          }))
        }
        return [{ id, name, pages, isCounted: COUNTED_GROUPS.includes(name) }]
      })
      .filter((group) => group.pages.length > 0)
  }, [tree, currentBase])

  // Only the current page's group starts open. Navigating into a closed group
  // opens it too; groups the reader opened stay open.
  const activeGroupId = groups.find((group) =>
    group.pages.some((page) => page.url === pathname)
  )?.id
  const [openGroupIds, setOpenGroupIds] = React.useState(
    () => new Set(activeGroupId ? [activeGroupId] : [])
  )
  const [previousActiveGroupId, setPreviousActiveGroupId] =
    React.useState(activeGroupId)
  if (activeGroupId !== previousActiveGroupId) {
    setPreviousActiveGroupId(activeGroupId)
    if (activeGroupId) {
      setOpenGroupIds((ids) => new Set(ids).add(activeGroupId))
    }
  }

  const setGroupOpen = (id: string, isOpen: boolean) => {
    setOpenGroupIds((ids) => {
      const next = new Set(ids)
      if (isOpen) next.add(id)
      else next.delete(id)
      return next
    })
  }

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
        <SiteSettingsMenu
          align="start"
          className="size-7 rounded-lg bg-transparent text-muted-foreground hover:bg-hover hover:text-foreground data-popup-open:bg-hover [&_svg]:size-4"
        />
      </div>
      <div className="px-2">
        <CommandMenu
          tree={tree}
          navItems={siteConfig.navItems}
          trigger="sidebar"
        />
      </div>
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 scroll-fade flex-col gap-5 overflow-y-auto px-2 pt-2 pb-8"
      >
        <FluidNav className="gap-0.5">
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
        <div className="flex flex-col gap-0.5">
          {groups.map((group) => (
            <Collapsible
              key={group.id}
              open={openGroupIds.has(group.id)}
              onOpenChange={(isOpen) => setGroupOpen(group.id, isOpen)}
              render={<section />}
            >
              <h3>
                <CollapsibleTrigger className="group/group-trigger flex h-8 w-full items-center gap-2 rounded-lg px-2 text-start text-[12px] font-medium text-muted-foreground transition-colors duration-fast outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring">
                  <span className="flex-1 truncate">{group.name}</span>
                  {group.isCounted && (
                    <span className="tabular-nums">{group.pages.length}</span>
                  )}
                  <ChevronRightIcon className="size-4 shrink-0 stroke-[1.5] transition-transform duration-fast ease-spring group-aria-expanded/group-trigger:rotate-90 motion-reduce:transition-none" />
                </CollapsibleTrigger>
              </h3>
              {/* Closed groups stay in the page, so find-in-page opens them
                  and crawlers still see every link. */}
              <CollapsibleContent hiddenUntilFound>
                <FluidNav className="gap-0.5 pt-1 pb-3">
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
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </aside>
  )
}
