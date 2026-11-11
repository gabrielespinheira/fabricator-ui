"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useQueryStates } from "nuqs"

import { getGroupNavId } from "@/lib/component-explorer"
import { COMPONENT_GROUPS } from "@/lib/component-groups"
import { siteConfig } from "@/lib/config"
import { getDocsExplorerGroups, type ExplorerPage } from "@/lib/docs-explorer"
import { EXPLORER_ICONS } from "@/lib/explorer-icons"
import { getCurrentBase } from "@/lib/page-tree"
import { HomeIcon } from "@/lib/site-icons"
import type { source } from "@/lib/source"
import { CommandMenu } from "@/components/command-menu"
import { SiteSettingsMenu } from "@/components/fabricator/site-settings"
import {
  AppShellContent,
  AppShellPageTitle,
} from "@/styles/base-fabricator/ui/app-shell"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/styles/base-fabricator/ui/item"
import { OptionShell } from "@/app/(view)/app-shell/_components/option-shell"
import { SetupCards } from "@/app/(view)/app-shell/_components/options-card"
import {
  DEFAULT_DOCS_EXPLORER_OPTIONS,
  explorerParsers,
  getDocsExplorerOptions,
  getHiddenDocsExplorerOptions,
} from "@/app/(view)/desktop/_lib/explorer-options"

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
  const searchParams = useSearchParams()
  const getHref = (href: string) =>
    searchParams.size ? `${href}?${searchParams}` : href
  const [urlOptions, setOptions] = useQueryStates(explorerParsers)
  const options = getDocsExplorerOptions(urlOptions)
  const groups = React.useMemo(
    () =>
      getDocsExplorerGroups(pages, getCurrentBase(pathname)).map((group) => ({
        ...group,
        items: group.items.map((item) => {
          const componentGroup = COMPONENT_GROUPS.find(
            (name) => getGroupNavId(name) === item.id
          )
          return {
            ...item,
            icon:
              item.id === "overview"
                ? HomeIcon
                : componentGroup
                  ? EXPLORER_ICONS.groups[componentGroup]
                  : undefined,
          }
        }),
      })),
    [pages, pathname]
  )
  const title =
    pathname === "/docs"
      ? "Overview"
      : (pages.find((page) => page.url === pathname)?.title ?? "Documentation")
  const hidden = React.useMemo(() => getHiddenDocsExplorerOptions(), [])
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
        renderLink={(item) => <Link href={getHref(item.href ?? "/docs")} />}
        brand={
          <Link
            href={getHref("/docs")}
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
            <span>
              {groups[1]?.items.reduce(
                (count, group) => count + (group.children?.length ?? 0),
                0
              )}{" "}
              components
            </span>
            <div className="ms-auto">
              <SiteSettingsMenu size="icon-sm" />
            </div>
          </>
        }
      >
        <AppShellContent size={options.contentSize}>
          {pathname === "/docs" && (
            <div className="flex flex-col gap-6 pb-10">
              <div className="flex flex-col gap-2">
                <AppShellPageTitle>Fabricator UI</AppShellPageTitle>
                <p className="text-muted-foreground">
                  Explore the components, their variants and properties. Adjust
                  the settings to try the same design across web, desktop and
                  mobile.
                </p>
              </div>
              <SetupCards
                options={options}
                setOptions={setOptions}
                defaults={DEFAULT_DOCS_EXPLORER_OPTIONS}
                hidden={hidden}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups[1]?.items.map((group) => (
                  <Item
                    key={group.id}
                    variant="muted"
                    render={
                      <Link
                        href={getHref(group.children?.[0]?.href ?? "/docs")}
                      />
                    }
                  >
                    <ItemContent>
                      <ItemTitle>{group.label}</ItemTitle>
                      <ItemDescription>
                        {group.children?.length} components
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </div>
            </div>
          )}
          {children}
        </AppShellContent>
      </OptionShell>
    </div>
  )
}
