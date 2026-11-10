"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQueryStates } from "nuqs"

import { getGroupNavId } from "@/lib/component-explorer"
import { COMPONENT_GROUPS, getComponentGroup } from "@/lib/component-groups"
import { siteConfig } from "@/lib/config"
import { getDocsExplorerGroups, type ExplorerPage } from "@/lib/docs-explorer"
import { EXPLORER_ICONS } from "@/lib/explorer-icons"
import { getCurrentBase } from "@/lib/page-tree"
import { HomeIcon, LayersIcon } from "@/lib/site-icons"
import type { source } from "@/lib/source"
import { CommandMenu } from "@/components/command-menu"
import { ExplorerLibrary } from "@/components/fabricator/explorer-library"
import { SiteSettingsMenu } from "@/components/fabricator/site-settings"
import {
  AppShellContent,
  AppShellPageTitle,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
} from "@/styles/base-fabricator/ui/app-shell"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/styles/base-fabricator/ui/item"
import {
  TabStrip,
  TabStripList,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/styles/base-fabricator/ui/tab-strip"
import { OptionShell } from "@/app/(view)/app-shell/_components/option-shell"
import { SetupCards } from "@/app/(view)/app-shell/_components/options-card"
import {
  DEFAULT_EXPLORER_OPTIONS,
  explorerParsers,
  getHiddenExplorerOptions,
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const getHref = (href: string) =>
    searchParams.size ? `${href}?${searchParams}` : href
  const [options, setOptions] = useQueryStates(explorerParsers)
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
                : item.id === "library"
                  ? LayersIcon
                  : componentGroup
                    ? EXPLORER_ICONS.groups[componentGroup]
                    : undefined,
          }
        }),
      })),
    [pages, pathname]
  )
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["/docs"],
      pinned: ["/docs"],
      recent: ["/docs"],
      preview: null,
      closed: [],
    },
  })
  const openTab = tabs.open
  React.useEffect(() => {
    openTab(pathname, { preview: true })
  }, [pathname, openTab])
  const title =
    pathname === "/docs"
      ? "Overview"
      : pathname === "/docs/components"
        ? "Library"
        : (pages.find((page) => page.url === pathname)?.title ??
          "Documentation")
  const hidden = React.useMemo(
    () => getHiddenExplorerOptions({ hasGlass: false }),
    []
  )
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
        tabStrip={
          <TabStrip
            {...tabs.stripProps}
            value={pathname}
            onValueChange={(href) => router.push(getHref(href))}
            onClose={(hrefs) => {
              tabs.close(hrefs)
              if (hrefs.includes(pathname)) router.push(getHref("/docs"))
            }}
            onReopen={() => {
              const href = tabs.state.closed[0]
              if (href) {
                tabs.reopen()
                router.push(getHref(href))
              }
            }}
            className="min-w-0 flex-1"
          >
            <TabStripList aria-label="Open documentation">
              {tabs.state.tabs.map((href) => (
                <TabStripTab
                  key={href}
                  value={href}
                  pinned={tabs.state.pinned.includes(href)}
                  icon={href === "/docs" ? HomeIcon : undefined}
                  preview={tabs.state.preview === href}
                >
                  {href === "/docs"
                    ? "Overview"
                    : href === "/docs/components"
                      ? "Library"
                      : (pages.find((page) => page.url === href)?.title ??
                        "Documentation")}
                </TabStripTab>
              ))}
            </TabStripList>
            <TabStripOverflow />
          </TabStrip>
        }
        panelId="details"
        panelLabel="Details"
        isPanelOpenByDefault={false}
        panel={
          <>
            <AppShellPanelHeader>
              <AppShellPanelTitle>Details</AppShellPanelTitle>
              <AppShellPanelClose />
            </AppShellPanelHeader>
            <AppShellPanelContent className="flex flex-col gap-4 p-4">
              <CommandMenu
                tree={tree}
                navItems={siteConfig.navItems}
                trigger="sidebar"
              />
              <Link href="/desktop">Desktop example</Link>
              <Link href="/docs/installation/react-native">
                React Native setup
              </Link>
              <Link href="/">Website home</Link>
            </AppShellPanelContent>
          </>
        }
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
                defaults={DEFAULT_EXPLORER_OPTIONS}
                hidden={hidden}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups[1]?.items.map((group) => (
                  <Item
                    key={group.id}
                    variant="muted"
                    render={
                      <Link
                        href={getHref(
                          group.children?.[0]?.href ?? "/docs/components"
                        )}
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
          {pathname === "/docs/components" ? (
            <ExplorerLibrary
              components={pages
                .filter((page) => page.url.startsWith("/docs/components/base/"))
                .map((page) => {
                  const slug = page.url.split("/").at(-1) ?? ""
                  return {
                    slug,
                    title: page.title,
                    group: getComponentGroup(slug),
                  }
                })}
              renderLink={(component) => (
                <Link
                  href={getHref(`/docs/components/base/${component.slug}`)}
                />
              )}
            />
          ) : (
            children
          )}
        </AppShellContent>
      </OptionShell>
    </div>
  )
}
