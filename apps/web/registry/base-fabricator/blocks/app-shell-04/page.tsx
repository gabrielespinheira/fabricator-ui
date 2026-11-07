"use client"

import * as React from "react"

import { AppNav, type AppNavGroup } from "@/registry/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  createLocalStorage,
  type AppShellWindow,
} from "@/registry/base-fabricator/ui/app-shell"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/registry/base-fabricator/ui/sidebar"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripTab,
  useTabStripState,
} from "@/registry/base-fabricator/ui/tab-strip"

// A desktop app (Electron or Tauri): the sidebar toggle beside the traffic
// lights, tabs in the main card's top row, a translucent sidebar over the
// window's material, drag regions that move the window, and the layout saved
// in localStorage.
//
// Create the window without a title bar, with its native controls and a
// material behind a transparent page:
//   Electron: new BrowserWindow({ titleBarStyle: "hiddenInset",
//     trafficLightPosition: { x: 16, y: 23 }, vibrancy: "sidebar",
//     visualEffectState: "followWindow", backgroundColor: "#00000000",
//     ...(process.platform !== "darwin"
//       ? { titleBarOverlay: true, backgroundMaterial: "mica" } : {}) })
//   Tauri: "titleBarStyle": "Overlay", "trafficLightPosition", "transparent":
//     true and "windowEffects": { "effects": ["sidebar"] } in the window
//     config, plus the core:window:allow-start-dragging permission.
// Then make html and body transparent so the material shows through.

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "library", label: "Library", href: "/" },
      { id: "recent", label: "Recent", href: "/recent" },
      { id: "shared", label: "Shared", href: "/shared", badge: 2 },
    ],
  },
]

const pages: Record<string, string> = {
  welcome: "Welcome",
  notes: "Meeting notes",
}

/**
 * Where the native controls are. Read the platform and fullscreen state
 * from your preload bridge (Electron) or the window API (Tauri).
 */
function useDesktopWindow(): AppShellWindow {
  const [isMac] = React.useState(() =>
    typeof navigator === "undefined" ? true : /Mac/.test(navigator.platform)
  )
  return {
    controls: isMac ? "macos" : "overlay",
    isFullscreen: false,
    trafficLights: { x: 16, y: 23 },
    isTranslucent: true,
  }
}

export default function Page() {
  const desktopWindow = useDesktopWindow()
  const [storage] = React.useState(() =>
    typeof window === "undefined" ? null : createLocalStorage()
  )
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["welcome", "notes"],
      pinned: [],
      recent: ["welcome"],
      preview: null,
      closed: [],
    },
  })

  return (
    <AppShell
      storageKey="app-shell-04"
      storage={storage}
      window={desktopWindow}
    >
      <Sidebar variant="inset" collapsible="offcanvas">
        <SidebarHeader>
          <header className="flex h-8 items-center px-2 text-lg font-semibold tracking-tight">
            Library
          </header>
        </SidebarHeader>
        <SidebarContent>
          <AppNav groups={groups} pathname="/" />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <TabStrip
            {...tabs.stripProps}
            onNew={() => tabs.reopen()}
            className="min-w-0 flex-1"
          >
            <TabStripList aria-label="Pages">
              {tabs.state.tabs.map((id) => (
                <TabStripTab key={id} value={id}>
                  {pages[id] ?? id}
                </TabStripTab>
              ))}
            </TabStripList>
            <TabStripNew />
          </TabStrip>
        </AppShellHeader>
        <AppShellContent className="p-6">
          {tabs.activeId ? pages[tabs.activeId] : "No open pages"}. Drag the tab
          row or the sidebar&apos;s top to move the window.
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
