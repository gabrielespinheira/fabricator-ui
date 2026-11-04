"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { getComponentGroup } from "@/lib/component-groups"
import {
  BoxIcon,
  ChartColumnIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  HomeIcon,
  LayersIcon,
  MoonIcon,
  PanelLeftIcon,
  SparklesIcon,
  SunIcon,
  TextCursorInputIcon,
} from "@/lib/site-icons"
import { AppNav } from "@/styles/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPageTitle,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
  AppShellPanelTrigger,
  AppShellStatusBar,
} from "@/styles/base-fabricator/ui/app-shell"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/styles/base-fabricator/ui/sidebar"
import { Skeleton } from "@/styles/base-fabricator/ui/skeleton"
import {
  TabStrip,
  TabStripList,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/styles/base-fabricator/ui/tab-strip"
import {
  GALLERY_ITEMS,
  type GalleryItem,
} from "@/app/(app)/(root)/_components/gallery"

import {
  COMPONENT_PATH,
  getExplorerNavGroups,
  type DesktopHost,
} from "../_lib/desktop"
import { useDesktopWindow } from "../_lib/use-desktop-window"

const ITEMS = new Map(GALLERY_ITEMS.map((item) => [item.slug, item]))
const NAV_GROUPS = getExplorerNavGroups(
  GALLERY_ITEMS.map((item) => ({
    slug: item.slug,
    title: item.title,
    group: getComponentGroup(item.slug),
  })),
  {
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
)
const GROUP_ROWS = NAV_GROUPS.flatMap((group) =>
  group.items.filter((item) => item.children)
)

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
    <div className="flex min-h-full flex-col gap-6 p-6">
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

function Overview({ onOpen }: { onOpen: (slug: string) => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <AppShellPageTitle>Fabricator UI</AppShellPageTitle>
        <p className="text-muted-foreground">
          Every component in a desktop window built with the App Shell. Pick one
          in the sidebar; it opens in a tab, and the panel on the right has its
          install command.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
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
              <span className="text-sm text-muted-foreground">
                {group.children?.length} components
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InstallCommand({ slug }: { slug: string }) {
  const command = `npx fabricator-ui@latest add ${slug}`
  const [hasCopied, setHasCopied] = React.useState(false)
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted/60 py-1 ps-3 pe-1 font-mono text-xs">
      <code className="min-w-0 flex-1 truncate">{command}</code>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={hasCopied ? "Copied" : "Copy the install command"}
        onClick={async () => {
          await navigator.clipboard.writeText(command)
          setHasCopied(true)
        }}
      >
        {hasCopied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
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
  const { host, shellWindow } = useDesktopWindow()
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["overview", "button"],
      pinned: ["overview"],
      recent: ["button"],
      preview: null,
      closed: [],
    },
  })
  const activeItem = tabs.activeId ? ITEMS.get(tabs.activeId) : undefined
  const open = (slug: string) => tabs.open(slug, { preview: true })

  return (
    <AppShell storageKey="desktop-example" storage={null} window={shellWindow}>
      <Sidebar variant="inset" collapsible="offcanvas">
        <SidebarHeader className="flex-row items-center">
          <header className="flex h-8 items-center px-2 text-lg font-semibold tracking-tight">
            Fabricator UI
          </header>
          {/* A desktop window keeps the toggle in its top band instead. */}
          {!shellWindow && <SidebarTrigger className="ms-auto" />}
        </SidebarHeader>
        <SidebarContent>
          <AppNav
            aria-label="Components"
            groups={NAV_GROUPS}
            pathname={activeItem ? `${COMPONENT_PATH}${activeItem.slug}` : "/"}
            renderLink={(item) => (
              <a
                href={item.href}
                onClick={(event) => {
                  event.preventDefault()
                  open(item.id)
                }}
              />
            )}
          />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <TabStrip {...tabs.stripProps} className="min-w-0 flex-1">
            <TabStripList aria-label="Open components">
              {tabs.state.tabs.map((id) => (
                <TabStripTab
                  key={id}
                  value={id}
                  pinned={tabs.state.pinned.includes(id)}
                  icon={ITEMS.has(id) ? undefined : HomeIcon}
                  preview={tabs.state.preview === id}
                >
                  {ITEMS.get(id)?.title ?? "Overview"}
                </TabStripTab>
              ))}
            </TabStripList>
            <TabStripOverflow />
          </TabStrip>
          <AppShellPanelTrigger panel="details" />
        </AppShellHeader>
        <AppShellContent>
          {activeItem ? (
            <ComponentStage key={activeItem.slug} item={activeItem} />
          ) : (
            <Overview onOpen={open} />
          )}
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel id="details" label="Details" defaultOpen>
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
      </AppShellPanel>
      <AppShellStatusBar>
        <span>
          {RUNTIME_LABELS[host.runtime]} · {PLATFORM_LABELS[host.platform]}
        </span>
        <span>{GALLERY_ITEMS.length} components</span>
        <ThemeToggle />
      </AppShellStatusBar>
    </AppShell>
  )
}
