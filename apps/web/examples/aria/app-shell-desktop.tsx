"use client"

import * as React from "react"
import {
  CalendarIcon,
  FileTextIcon,
  GitBranchIcon,
  GlobeIcon,
  HomeIcon,
  InboxIcon,
  SettingsIcon,
} from "lucide-react"

import { AppNav, type AppNavGroup } from "@/styles/aria-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
  AppShellPanelTrigger,
  AppShellStatusBar,
  type AppShellWindow,
} from "@/styles/aria-fabricator/ui/app-shell"
import { Button } from "@/styles/aria-fabricator/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/styles/aria-fabricator/ui/sidebar"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripTab,
  useTabStripState,
} from "@/styles/aria-fabricator/ui/tab-strip"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/aria-fabricator/ui/toggle-group"

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Home", href: "/", icon: HomeIcon },
      {
        id: "inbox",
        label: "Inbox",
        href: "/inbox",
        icon: InboxIcon,
        badge: 4,
      },
      {
        id: "calendar",
        label: "Calendar",
        href: "/calendar",
        icon: CalendarIcon,
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    collapsible: true,
    items: [
      { id: "docs", label: "Docs", href: "/docs", icon: FileTextIcon },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
      },
    ],
  },
]

const PAGES: Record<string, { title: string; icon: typeof GlobeIcon }> = {
  docs: { title: "Docs", icon: FileTextIcon },
  site: { title: "fabricator-ui.vercel.app", icon: GlobeIcon },
}

// A browser preview has no native window, so the demo draws what the shell
// lays out around: the desktop seen through the window's material, and the
// window controls. In Electron or Tauri they are the real ones.
function WindowMaterial() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 bg-[radial-gradient(ellipse_at_10%_15%,oklch(0.62_0.19_255),transparent_55%),radial-gradient(ellipse_at_30%_85%,oklch(0.66_0.2_330),transparent_50%),linear-gradient(oklch(0.45_0.12_265),oklch(0.3_0.1_285))]"
    >
      <div className="absolute inset-0 bg-surface-1/72 backdrop-blur-3xl backdrop-saturate-150" />
    </div>
  )
}

function WindowControls({ shellWindow }: { shellWindow: AppShellWindow }) {
  if (shellWindow.isFullscreen) return null
  if (shellWindow.controls === "macos") {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed start-4 top-[23px] z-50 flex h-3.5 items-center gap-2"
      >
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
    )
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed end-0 top-0 z-50 flex h-10 text-muted-foreground"
    >
      {["—", "☐", "✕"].map((glyph) => (
        <span key={glyph} className="flex w-11 items-center justify-center">
          {glyph}
        </span>
      ))}
    </div>
  )
}

export function AppShellDesktop() {
  const [mode, setMode] = React.useState("macos")
  const shellWindow: AppShellWindow = {
    controls: mode === "windows" ? "overlay" : "macos",
    isFullscreen: mode === "fullscreen",
    trafficLights: { x: 16, y: 23 },
    // A browser has no Window Controls Overlay to report the buttons' width.
    overlayWidth: 132,
    isTranslucent: true,
  }
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["docs", "site"],
      pinned: [],
      recent: ["docs"],
      preview: null,
      closed: [],
    },
  })

  return (
    <>
      <WindowMaterial />
      <AppShell
        storageKey="app-shell-desktop"
        storage={null}
        window={shellWindow}
      >
        <Sidebar variant="inset" collapsible="offcanvas">
          <SidebarHeader>
            <header className="flex h-8 items-center px-2 text-lg font-semibold tracking-tight">
              Fabricator
            </header>
          </SidebarHeader>
          <SidebarContent>
            <AppNav
              groups={groups}
              pathname="/"
              renderLink={(item) => (
                <a
                  href={item.href}
                  onClick={(event) => event.preventDefault()}
                />
              )}
            />
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <AppShellMain>
          <AppShellHeader>
            <TabStrip
              {...tabs.stripProps}
              onNew={() => {}}
              className="min-w-0 flex-1"
            >
              <TabStripList aria-label="Pages">
                {tabs.state.tabs.map((id) => {
                  const page = PAGES[id]
                  return page ? (
                    <TabStripTab key={id} value={id} icon={page.icon}>
                      {page.title}
                    </TabStripTab>
                  ) : null
                })}
              </TabStripList>
              <TabStripNew />
            </TabStrip>
            <AppShellPanelTrigger panel="details" />
          </AppShellHeader>
          <AppShellContent className="flex flex-col items-start gap-4 p-6">
            <p className="max-w-md text-sm text-muted-foreground">
              The sidebar toggle sits beside the traffic lights, and the tab row
              centres on them. The sidebar shows the window&apos;s material
              through it. On Windows and Linux the top rows clear the window
              buttons instead; in fullscreen both insets go away.
            </p>
            <ToggleGroup
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[mode]}
              onSelectionChange={(keys) => {
                const next = [...keys][0]
                if (typeof next === "string") setMode(next)
              }}
              variant="outline"
            >
              <ToggleGroupItem id="macos">macOS</ToggleGroupItem>
              <ToggleGroupItem id="windows">Windows</ToggleGroupItem>
              <ToggleGroupItem id="fullscreen">Fullscreen</ToggleGroupItem>
            </ToggleGroup>
          </AppShellContent>
        </AppShellMain>
        <AppShellPanel id="details" label="Details" defaultOpen>
          <AppShellPanelHeader>
            <AppShellPanelTitle>Details</AppShellPanelTitle>
            <AppShellPanelClose />
          </AppShellPanelHeader>
          <AppShellPanelContent className="p-3 text-muted-foreground">
            The panel&apos;s header shares the tab row&apos;s height.
          </AppShellPanelContent>
        </AppShellPanel>
        <AppShellStatusBar>
          <Button variant="ghost" size="sm" aria-label="Branch: main">
            <GitBranchIcon data-icon="inline-start" />
            main
          </Button>
          <span>Synced</span>
          <span className="ms-auto">{tabs.state.tabs.length} open</span>
        </AppShellStatusBar>
      </AppShell>
      <WindowControls shellWindow={shellWindow} />
    </>
  )
}
