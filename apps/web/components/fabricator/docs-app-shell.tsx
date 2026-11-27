"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useQueryStates } from "nuqs"

import { getGroupNavId } from "@/lib/component-explorer"
import { COMPONENT_GROUPS } from "@/lib/component-groups"
import { siteConfig } from "@/lib/config"
import {
  ADVANCED_REFERENCE_PATH,
  APP_SHELL_NAV_ID,
  getDocsExplorerGroups,
  type ExplorerPage,
} from "@/lib/docs-explorer"
import { getDocsOverviewGroups, getLatestRelease } from "@/lib/docs-overview"
import { isWideDocsPage } from "@/lib/docs-wide-pages"
import { EXPLORER_ICONS } from "@/lib/explorer-icons"
import { getCurrentBase } from "@/lib/page-tree"
import { getReleaseBadgeFromLabel } from "@/lib/release-badges"
import { AppWindowIcon, HomeIcon } from "@/lib/site-icons"
import type { source } from "@/lib/source"
import { CommandMenu } from "@/components/command-menu"
import { DocsOverview } from "@/components/fabricator/docs-overview"
import { SiteSettingsMenu } from "@/components/fabricator/site-settings"
import { AppShellContent } from "@/styles/base-fabricator/ui/app-shell"
import { OptionShell } from "@/app/(view)/app-shell/_components/option-shell"
import {
  explorerParsers,
  getDocsExplorerOptions,
} from "@/app/(view)/desktop/_lib/explorer-options"

const COMPONENT_GROUP_ICONS = new Map([
  ...COMPONENT_GROUPS.map(
    (group) => [getGroupNavId(group), EXPLORER_ICONS.groups[group]] as const
  ),
  [APP_SHELL_NAV_ID, AppWindowIcon],
])

export function DocsAppShell({
  pages,
  tree,
  children,
}: {
  pages: ExplorerPage[]
  tree: typeof source.pageTree
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentBase = getCurrentBase(pathname)
  const isAppShellOverview =
    pathname === `/docs/components/${currentBase}/app-shell`
  const searchParams = useSearchParams()
  const getHref = (href: string) =>
    searchParams.size ? `${href}?${searchParams}` : href
  const [urlOptions] = useQueryStates(explorerParsers)
  const options = getDocsExplorerOptions(urlOptions)
  const groups = React.useMemo(
    () =>
      getDocsExplorerGroups(pages, currentBase).map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          icon:
            item.id === "overview"
              ? HomeIcon
              : COMPONENT_GROUP_ICONS.get(item.id),
          defaultOpen: item.id === APP_SHELL_NAV_ID && isAppShellOverview,
        })),
      })),
    [pages, currentBase, isAppShellOverview]
  )
  const componentGroups =
    groups.find((group) => group.id === "components")?.items ?? []
  const componentPageCount = componentGroups.reduce(
    (count, group) =>
      count + (group.href ? 1 : 0) + (group.children?.length ?? 0),
    0
  )
  const title =
    pathname === "/docs"
      ? "Overview"
      : (pages.find((page) => page.url === pathname)?.title ?? "Documentation")
  return (
    <div data-slot="docs-shell" className="w-full">
      <OptionShell
        options={options}
        storageKey="docs-explorer"
        groups={groups}
        navLabel="Documentation"
        sidebarTools={
          <CommandMenu
            tree={tree}
            navItems={siteConfig.navItems}
            trigger="sidebar"
          />
        }
        pathname={pathname}
        renderLink={(item) => {
          const href = item.href ?? "/docs"
          const isAdvancedReference = href.startsWith(ADVANCED_REFERENCE_PATH)
          return (
            <Link
              href={getHref(href)}
              data-release={getReleaseBadgeFromLabel(item.badge)}
              prefetch={isAdvancedReference ? false : null}
              className={
                isAdvancedReference
                  ? "data-[sidebar=menu-sub-button]:ps-[calc(var(--density-20)+(var(--density-icon-16)+var(--density-8))*var(--sidebar-menu-depth,1))]"
                  : undefined
              }
            />
          )
        }}
        brand={
          <Link
            href="/"
            className="flex h-8 items-center rounded-lg px-2 text-lg font-semibold tracking-tight"
          >
            Fabricator UI
          </Link>
        }
        rootCrumb="Fabricator UI"
        crumbs={[{ label: title }]}
        pageTitle={title}
        tabStrip={null}
        panelId="details"
        panelLabel="Details"
        panel={null}
        status={
          <>
            <span>Website · Documentation</span>
            <span>{componentPageCount} component pages</span>
            <div className="ms-auto">
              <SiteSettingsMenu size="icon-sm" />
            </div>
          </>
        }
      >
        <AppShellContent
          size={isWideDocsPage(pathname) ? "lg" : options.contentSize}
        >
          {pathname === "/docs" && (
            <DocsOverview
              groups={getDocsOverviewGroups(componentGroups)}
              pageCount={componentPageCount}
              latestRelease={getLatestRelease(pages)}
              getHref={getHref}
            />
          )}
          {children}
        </AppShellContent>
      </OptionShell>
    </div>
  )
}
