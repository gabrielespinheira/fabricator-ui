"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { useQueryStates } from "nuqs"

import {
  COMPONENT_PATH,
  getExplorerInstallNames,
  getExplorerNavGroups,
  getExplorerTabId,
  getNewTabId,
  isNewTab,
  type ExplorerComponent,
} from "@/lib/component-explorer"
import { getComponentGroup } from "@/lib/component-groups"
import { EXPLORER_ICONS } from "@/lib/explorer-icons"
import {
  ExternalLinkIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
} from "@/lib/site-icons"
import { usePackageManager } from "@/hooks/use-package-manager"
import { useDesktopWindow } from "@/registry/fabricator/shared/hooks/use-desktop-window"
import {
  getActiveNavItem,
  getNavPath,
} from "@/styles/base-fabricator/lib/app-shell-model"
import {
  AppShellContent,
  AppShellPageTitle,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
} from "@/styles/base-fabricator/ui/app-shell"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/styles/base-fabricator/ui/item"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
} from "@/styles/base-fabricator/ui/tab-strip"
import { CLI, forPackageManager } from "@/app/(app)/(create)/lib/setup"
import { IconsBrowser } from "@/app/(app)/icons/_components/icons-browser"

import { withGlass, type DesktopHost } from "../_lib/desktop"
import {
  DEFAULT_EXPLORER_OPTIONS,
  explorerParsers,
  getHiddenExplorerOptions,
} from "../_lib/explorer-options"
import { getDesktopHref } from "../_lib/navigation"
import { CliCommand } from "../../app-shell/_components/cli-command"
import { OptionShell } from "../../app-shell/_components/option-shell"
import { SetupCards } from "../../app-shell/_components/options-card"
import { getWindowOption } from "../../app-shell/_lib/install"
import { getTabsPlacement } from "../../app-shell/_lib/options"
import { useDesktopTabs } from "./use-desktop-tabs"

const NEW_TAB_TITLE = "New tab"
/** Matches nothing in the navigation: a blank tab highlights no row. */
const NEW_TAB_PATH = "/new"

function getTabTitle(id: string | null, items: Map<string, ExplorerComponent>) {
  if (isNewTab(id)) return NEW_TAB_TITLE
  if (id === "icons") return "Icons"
  const item = id ? items.get(id) : undefined
  return item?.title ?? "Overview"
}

const RUNTIME_LABELS: Record<DesktopHost["runtime"], string> = {
  electron: "Electron",
  tauri: "Tauri",
  browser: "Browser",
}
const PLATFORM_LABELS: Record<DesktopHost["platform"], string> = {
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
}

/** A card per component group, which opens the group's first component. */
function GroupGrid({
  onOpen,
  components,
}: {
  onOpen: (slug: string) => void
  components: ExplorerComponent[]
}) {
  const groupRows = getExplorerNavGroups(components, EXPLORER_ICONS).flatMap(
    (group) => group.items.filter((item) => item.children)
  )
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groupRows.map((group) => {
        const first = group.children?.[0]
        return (
          <Item
            key={group.id}
            variant="muted"
            render={
              <button type="button" onClick={() => first && onOpen(first.id)} />
            }
          >
            <ItemContent>
              <ItemTitle>{group.label}</ItemTitle>
              <ItemDescription>
                {group.children?.length} components
              </ItemDescription>
            </ItemContent>
          </Item>
        )
      })}
    </div>
  )
}

function NewTabPage({
  onOpen,
  components,
}: {
  onOpen: (slug: string) => void
  components: ExplorerComponent[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <AppShellPageTitle>{NEW_TAB_TITLE}</AppShellPageTitle>
        <p className="text-muted-foreground">
          Pick a component here or in the sidebar, and it opens in this tab.
        </p>
      </div>
      <GroupGrid onOpen={onOpen} components={components} />
    </div>
  )
}

function Overview({
  onOpen,
  setup,
  components,
}: {
  onOpen: (slug: string) => void
  setup: React.ReactNode
  components: ExplorerComponent[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <AppShellPageTitle>Fabricator UI</AppShellPageTitle>
        <p className="text-muted-foreground">
          Every component and its documentation in a desktop window. Pick one in
          the sidebar to explore its examples, variants, source and API. The
          panel on the right has its install command and page sections.
        </p>
      </div>
      {setup}
      <GroupGrid onOpen={onOpen} components={components} />
    </div>
  )
}

function InstallCommand({ slug }: { slug: string }) {
  const { packageManager } = usePackageManager()
  const names = getExplorerInstallNames(slug, false)
  if (!names.length)
    return (
      <p className="text-muted-foreground">
        Use the typography utilities shown in the documentation.
      </p>
    )
  return (
    <CliCommand
      code={forPackageManager(`${CLI} add ${names.join(" ")}`, packageManager)}
    />
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <Button
      variant="ghost"
      size="sm"
      className="ms-auto"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <SunIcon data-icon="inline-start" />
      ) : (
        <MoonIcon data-icon="inline-start" />
      )}
      {isDark ? "Light" : "Dark"}
    </Button>
  )
}

/** The desktop example: a component explorer in the App Shell. */
export function DesktopExplorer({
  components,
  children,
}: {
  components: (ExplorerComponent & {
    toc: { title: React.ReactNode; url: string; depth: number }[]
  })[]
  children: React.ReactNode
}) {
  const items = React.useMemo(
    () => new Map(components.map((item) => [item.slug, item])),
    [components]
  )
  const [options, setOptions] = useQueryStates(explorerParsers)
  const { host, shellWindow } = useDesktopWindow({
    hasTitlebar: getTabsPlacement(options) === "titlebar",
  })
  const tabs = useDesktopTabs()
  const search = useSearchParams()
  const activeItem = tabs.activeId ? items.get(tabs.activeId) : undefined
  const isBlankTab = isNewTab(tabs.activeId)
  const open = (slug: string) =>
    tabs.open(slug, {
      preview: true,
      replace: isBlankTab && tabs.activeId ? tabs.activeId : undefined,
    })
  const openNewTab = () =>
    tabs.open(getNewTabId([...tabs.state.tabs, ...tabs.state.closed]))
  const pathname = activeItem
    ? `${COMPONENT_PATH}${activeItem.slug}`
    : isBlankTab
      ? NEW_TAB_PATH
      : tabs.activeId === "icons"
        ? "/icons"
        : "/"
  const groups = React.useMemo(
    () =>
      getExplorerNavGroups(components, EXPLORER_ICONS, {
        reorderable: options.reorder,
        pages: [
          {
            id: "icons",
            label: "Icons",
            href: "/icons",
            icon: SparklesIcon,
            mobile: "tab",
          },
        ],
      }),
    [options.reorder, components]
  )
  const activeId = getActiveNavItem(groups, pathname)
  const path = activeId ? getNavPath(groups, activeId) : []
  const pageTitle = getTabTitle(tabs.activeId, items)
  const hidden = React.useMemo(
    () =>
      getHiddenExplorerOptions({
        hasGlass: Boolean(shellWindow?.isTranslucent),
      }),
    [shellWindow?.isTranslucent]
  )

  return (
    <OptionShell
      options={options}
      storageKey="desktop-example"
      shellWindow={withGlass(shellWindow, options.glass)}
      groups={groups}
      navLabel="Components"
      pathname={pathname}
      renderLink={(item) => {
        const tabId = getExplorerTabId(item.href)
        return (
          <Link
            href={tabId ? getDesktopHref(tabId, search.toString()) : "/desktop"}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              event.preventDefault()
              if (tabId) open(tabId)
            }}
          />
        )
      }}
      brand={
        <button
          type="button"
          onClick={() => open("overview")}
          className="flex h-8 items-center rounded-lg px-2 text-lg font-semibold tracking-tight"
        >
          Fabricator UI
        </button>
      }
      rootCrumb={options.switcher === "none" ? "Fabricator UI" : undefined}
      crumbs={[
        ...path
          .slice(0, -1)
          .map((item) => ({ label: item.label, href: item.href })),
        { label: pageTitle },
      ]}
      pageTitle={pageTitle}
      tabStrip={
        <TabStrip
          {...tabs.stripProps}
          onNew={openNewTab}
          className="min-w-0 flex-1"
        >
          <TabStripList aria-label="Open components">
            {tabs.state.tabs.map((id) => (
              <TabStripTab
                key={id}
                value={id}
                pinned={tabs.state.pinned.includes(id)}
                icon={id === "icons" ? SparklesIcon : undefined}
                preview={tabs.state.preview === id}
              >
                {getTabTitle(id, items)}
              </TabStripTab>
            ))}
          </TabStripList>
          <TabStripNew />
          <TabStripOverflow />
        </TabStrip>
      }
      panelId="details"
      panelLabel="Details"
      panel={
        <>
          <AppShellPanelHeader>
            <AppShellPanelTitle>Details</AppShellPanelTitle>
            <AppShellPanelClose />
          </AppShellPanelHeader>
          <AppShellPanelContent className="flex flex-col gap-4 p-4">
            {activeItem ? (
              <>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{activeItem.title}</p>
                  <p className="text-muted-foreground">
                    {getComponentGroup(activeItem.slug)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground">Install</p>
                  <InstallCommand slug={activeItem.slug} />
                </div>
                {activeItem.toc.length > 0 && (
                  <nav
                    aria-label="On this page"
                    className="flex flex-col gap-2"
                  >
                    <p className="font-medium">On this page</p>
                    <ul className="flex flex-col gap-1">
                      {activeItem.toc.map((entry) => (
                        <li key={entry.url}>
                          <Link
                            href={entry.url}
                            data-depth={entry.depth}
                            className="block rounded-md px-2 py-1 text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring data-[depth=3]:ps-4"
                          >
                            {entry.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                <a
                  href={`/docs/components/base/${activeItem.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
                >
                  Open website docs
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </>
            ) : (
              <p className="text-muted-foreground">
                Open a component to see how to install it.
              </p>
            )}
          </AppShellPanelContent>
        </>
      }
      status={
        <>
          <span>
            {RUNTIME_LABELS[host.runtime]} · {PLATFORM_LABELS[host.platform]}
          </span>
          <span>{components.length} components</span>
          <ThemeToggle />
        </>
      }
    >
      <AppShellContent key={tabs.activeId} size={options.contentSize}>
        {tabs.activeId !== "overview" &&
        tabs.activeId !== "icons" &&
        !isBlankTab ? (
          children
        ) : tabs.activeId === "icons" ? (
          <div className="flex flex-col gap-6">
            <AppShellPageTitle>Fabricator UI Icons</AppShellPageTitle>
            <React.Suspense>
              <IconsBrowser />
            </React.Suspense>
          </div>
        ) : isBlankTab ? (
          <NewTabPage onOpen={open} components={components} />
        ) : (
          <Overview
            components={components}
            onOpen={open}
            setup={
              <SetupCards
                options={options}
                setOptions={setOptions}
                defaults={DEFAULT_EXPLORER_OPTIONS}
                hidden={hidden}
                installOptions={{
                  ...options,
                  window: getWindowOption(shellWindow),
                }}
              />
            }
          />
        )}
      </AppShellContent>
    </OptionShell>
  )
}
