"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { useQueryStates } from "nuqs"

import { getComponentGroup } from "@/lib/component-groups"
import {
  BoxIcon,
  ChartColumnIcon,
  ExternalLinkIcon,
  HomeIcon,
  LayersIcon,
  MoonIcon,
  PanelLeftIcon,
  SparklesIcon,
  SunIcon,
  TextCursorInputIcon,
} from "@/lib/site-icons"
import { usePackageManager } from "@/hooks/use-package-manager"
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
import { Skeleton } from "@/styles/base-fabricator/ui/skeleton"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/styles/base-fabricator/ui/tab-strip"
import { CLI, forPackageManager } from "@/app/(app)/(create)/lib/setup"
import {
  GALLERY_ITEMS,
  type GalleryItem,
} from "@/app/(app)/(root)/_components/gallery"

import {
  COMPONENT_PATH,
  getExplorerNavGroups,
  getExplorerTabId,
  getNewTabId,
  isNewTab,
  withGlass,
  type DesktopHost,
} from "../_lib/desktop"
import {
  DEFAULT_EXPLORER_OPTIONS,
  explorerParsers,
  getHiddenExplorerOptions,
} from "../_lib/explorer-options"
import { useDesktopWindow } from "../_lib/use-desktop-window"
import { CliCommand } from "../../app-shell/_components/cli-command"
import { OptionShell } from "../../app-shell/_components/option-shell"
import { SetupCards } from "../../app-shell/_components/options-card"
import { getWindowOption } from "../../app-shell/_lib/install"
import { getTabsPlacement } from "../../app-shell/_lib/options"

const ITEMS = new Map(GALLERY_ITEMS.map((item) => [item.slug, item]))
const NEW_TAB_TITLE = "New tab"
/** Matches nothing in the navigation: a blank tab highlights no row. */
const NEW_TAB_PATH = "/new"

function getTabTitle(id: string | null) {
  if (isNewTab(id)) return NEW_TAB_TITLE
  const item = id ? ITEMS.get(id) : undefined
  return item?.title ?? "Overview"
}

const EXPLORER_COMPONENTS = GALLERY_ITEMS.map((item) => ({
  slug: item.slug,
  title: item.title,
  group: getComponentGroup(item.slug),
}))
const EXPLORER_ICONS = {
  overview: HomeIcon,
  groups: {
    Basics: BoxIcon,
    Forms: TextCursorInputIcon,
    "Overlays & Menus": LayersIcon,
    "Navigation & Layout": PanelLeftIcon,
    "Data & Feedback": ChartColumnIcon,
    "AI & Chat": SparklesIcon,
  },
}
const GROUP_ROWS = getExplorerNavGroups(
  EXPLORER_COMPONENTS,
  EXPLORER_ICONS
).flatMap((group) => group.items.filter((item) => item.children))

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

/** The component's demo on a stage; lazy demos load on first show. */
function ComponentStage({ item }: { item: GalleryItem }) {
  return (
    <div className="flex min-h-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <AppShellPageTitle>{item.title}</AppShellPageTitle>
        <p className="text-sm text-muted-foreground">
          {getComponentGroup(item.slug)}
        </p>
      </div>
      <div className="flex min-h-96 flex-1 items-center justify-center overflow-auto rounded-xl bg-muted/40 p-8">
        <React.Suspense
          fallback={<Skeleton className="h-40 w-full max-w-md" />}
        >
          {item.entry ? <item.entry.Demo /> : item.Demo && <item.Demo />}
        </React.Suspense>
      </div>
    </div>
  )
}

/** A card per component group, which opens the group's first component. */
function GroupGrid({ onOpen }: { onOpen: (slug: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {GROUP_ROWS.map((group) => {
        const first = group.children?.[0]
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => first && onOpen(first.id)}
            className="flex flex-col items-start gap-1 rounded-xl bg-muted/40 p-4 text-start transition-colors hover:bg-muted"
          >
            <span className="font-medium">{group.label}</span>
            <span className="text-sm text-foreground/70">
              {group.children?.length} components
            </span>
          </button>
        )
      })}
    </div>
  )
}

function NewTabPage({ onOpen }: { onOpen: (slug: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <AppShellPageTitle>{NEW_TAB_TITLE}</AppShellPageTitle>
        <p className="text-muted-foreground">
          Pick a component here or in the sidebar, and it opens in this tab.
        </p>
      </div>
      <GroupGrid onOpen={onOpen} />
    </div>
  )
}

function Overview({
  onOpen,
  setup,
}: {
  onOpen: (slug: string) => void
  setup: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <AppShellPageTitle>Fabricator UI</AppShellPageTitle>
        <p className="text-muted-foreground">
          Every component in a desktop window built with the App Shell. Pick one
          in the sidebar; it opens in a tab, and the panel on the right has its
          install command.
        </p>
      </div>
      {setup}
      <GroupGrid onOpen={onOpen} />
    </div>
  )
}

function InstallCommand({ slug }: { slug: string }) {
  const { packageManager } = usePackageManager()
  return (
    <CliCommand
      code={forPackageManager(`${CLI} add ${slug}`, packageManager)}
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
export function DesktopExplorer() {
  const [options, setOptions] = useQueryStates(explorerParsers)
  const { host, shellWindow } = useDesktopWindow({
    hasTitlebar: getTabsPlacement(options) === "titlebar",
  })
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["overview", "button"],
      pinned: ["overview"],
      recent: ["overview", "button"],
      preview: null,
      closed: [],
    },
  })
  const activeItem = tabs.activeId ? ITEMS.get(tabs.activeId) : undefined
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
      : "/"
  const groups = React.useMemo(
    () =>
      getExplorerNavGroups(EXPLORER_COMPONENTS, EXPLORER_ICONS, {
        reorderable: options.reorder,
      }),
    [options.reorder]
  )
  const activeId = getActiveNavItem(groups, pathname)
  const path = activeId ? getNavPath(groups, activeId) : []
  const pageTitle = getTabTitle(tabs.activeId)
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
      renderLink={(item) => (
        <a
          href={item.href}
          onClick={(event) => {
            event.preventDefault()
            const tabId = getExplorerTabId(item.href)
            if (tabId) open(tabId)
          }}
        />
      )}
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
                icon={ITEMS.has(id) || isNewTab(id) ? undefined : HomeIcon}
                preview={tabs.state.preview === id}
              >
                {getTabTitle(id)}
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
                <a
                  href={`/docs/components/base/${activeItem.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
                >
                  Read the docs
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
          <span>{GALLERY_ITEMS.length} components</span>
          <ThemeToggle />
        </>
      }
    >
      <AppShellContent size={options.contentSize}>
        {activeItem ? (
          <ComponentStage key={activeItem.slug} item={activeItem} />
        ) : isBlankTab ? (
          <NewTabPage onOpen={open} />
        ) : (
          <Overview
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
