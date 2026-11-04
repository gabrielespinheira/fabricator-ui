"use client"

import * as React from "react"
import { useQueryStates } from "nuqs"

import {
  ActivityIcon,
  GitBranchIcon,
  InfoIcon,
  MessageSquareIcon,
} from "@/lib/site-icons"
import {
  getActiveNavItem,
  getNavPath,
} from "@/styles/base-fabricator/lib/app-shell-model"
import {
  AppShellContent,
  AppShellPageTitle,
  AppShellPanelClose,
  AppShellPanelHeader,
  AppShellPanelTabs,
  AppShellPanelView,
  type AppShellWindow,
} from "@/styles/base-fabricator/ui/app-shell"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/styles/base-fabricator/ui/tab-strip"

import { getPlaygroundWindow, playgroundParsers } from "../_lib/options"
import { OptionShell } from "./option-shell"
import { SetupCards } from "./options-card"
import { DOCUMENTS, getNavGroups, INITIAL_TABS } from "./playground-data"

// A browser has no native window, so the playground draws what the shell
// lays out around: the desktop seen through the window's material, and the
// window controls. In Electron or Tauri they are the system's own.
function WindowMaterial({ shellWindow }: { shellWindow?: AppShellWindow }) {
  if (!shellWindow?.isTranslucent) return null
  return (
    <div
      aria-hidden
      className="fixed inset-0 bg-[radial-gradient(ellipse_at_10%_15%,oklch(0.62_0.19_255),transparent_55%),radial-gradient(ellipse_at_30%_85%,oklch(0.66_0.2_330),transparent_50%),radial-gradient(ellipse_at_85%_30%,oklch(0.75_0.15_70),transparent_45%),linear-gradient(oklch(0.45_0.12_265),oklch(0.3_0.1_285))]"
    >
      <div className="absolute inset-0 bg-surface-1/72 backdrop-blur-3xl backdrop-saturate-150" />
    </div>
  )
}

function WindowControls({ shellWindow }: { shellWindow?: AppShellWindow }) {
  if (!shellWindow || shellWindow.isFullscreen) return null
  if (shellWindow.controls === "macos") {
    // At the window's traffic light position: three 12px lights in a 52 by
    // 14px box.
    return (
      <div
        aria-hidden
        style={{
          insetInlineStart: shellWindow.trafficLights?.x,
          top: shellWindow.trafficLights?.y,
        }}
        className="pointer-events-none fixed z-50 flex h-3.5 items-center gap-2"
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
        <span
          key={glyph}
          className="flex w-[46px] items-center justify-center text-xs"
        >
          {glyph}
        </span>
      ))}
    </div>
  )
}

const HOME_HREF = "/"

export function AppShellPlayground() {
  const [options, setOptions] = useQueryStates(playgroundParsers)
  const [pathname, setPathname] = React.useState(HOME_HREF)
  const [documents, setDocuments] = React.useState(DOCUMENTS)
  const tabs = useTabStripState({ defaultState: INITIAL_TABS })

  const groups = React.useMemo(
    () => getNavGroups({ reorderable: options.reorder }),
    [options.reorder]
  )
  const activeId = getActiveNavItem(groups, pathname)
  const path = activeId ? getNavPath(groups, activeId) : []
  const pageTitle = path.at(-1)?.label ?? "Home"
  const shellWindow = getPlaygroundWindow(options)

  const renderLink = (item: { href?: string }) => (
    <a
      href={item.href}
      onClick={(event) => {
        event.preventDefault()
        setPathname(item.href ?? "/")
      }}
    />
  )

  const newDocument = () => {
    const id = `untitled-${Object.keys(documents).length}`
    setDocuments((current) => ({
      ...current,
      [id]: { title: "Untitled", icon: DOCUMENTS.plan?.icon ?? InfoIcon },
    }))
    tabs.open(id)
  }

  const tabStrip = (
    <TabStrip
      {...tabs.stripProps}
      onNew={newDocument}
      onRename={(id, title) =>
        setDocuments((current) => {
          const document = current[id]
          return document
            ? { ...current, [id]: { ...document, title } }
            : current
        })
      }
      className="min-w-0 flex-1"
    >
      <TabStripList aria-label="Open documents">
        {tabs.state.tabs.map((id) => {
          const document = documents[id]
          return document ? (
            <TabStripTab
              key={id}
              value={id}
              icon={document.icon}
              pinned={tabs.state.pinned.includes(id)}
              preview={tabs.state.preview === id}
            >
              {document.title}
            </TabStripTab>
          ) : null
        })}
      </TabStripList>
      <TabStripNew />
      <TabStripOverflow />
    </TabStrip>
  )

  return (
    <>
      <WindowMaterial shellWindow={shellWindow} />
      <OptionShell
        options={options}
        storageKey="playground"
        shellWindow={shellWindow}
        groups={groups}
        pathname={pathname}
        renderLink={renderLink}
        crumbs={[
          ...path
            .slice(0, -1)
            .map((item) => ({ label: item.label, href: item.href })),
          { label: pageTitle },
        ]}
        pageTitle={pageTitle}
        tabStrip={tabStrip}
        panelId="inspector"
        panelLabel="Inspector"
        panelViews={[
          { value: "details", label: "Details", icon: InfoIcon },
          { value: "activity", label: "Activity", icon: ActivityIcon },
          { value: "comments", label: "Comments", icon: MessageSquareIcon },
        ]}
        panel={
          <>
            <AppShellPanelHeader>
              <AppShellPanelTabs />
              <AppShellPanelClose />
            </AppShellPanelHeader>
            <AppShellPanelView
              value="details"
              className="flex flex-col gap-3 p-4"
            >
              <p className="font-medium">{pageTitle}</p>
              <p className="text-muted-foreground">
                Drag the panel&apos;s edge to resize it, or past its minimum to
                close it. Press ⌘\ to toggle it.
              </p>
            </AppShellPanelView>
            <AppShellPanelView
              value="activity"
              className="p-4 text-muted-foreground"
            >
              Nothing new today.
            </AppShellPanelView>
            <AppShellPanelView
              value="comments"
              className="p-4 text-muted-foreground"
            >
              No comments yet.
            </AppShellPanelView>
          </>
        }
        status={
          <>
            <Button variant="ghost" size="sm" aria-label="Branch: main">
              <GitBranchIcon data-icon="inline-start" />
              main
            </Button>
            <span>Synced</span>
            <span className="ms-auto">{tabs.state.tabs.length} open</span>
          </>
        }
      >
        <AppShellContent size={options.contentSize}>
          {pathname === HOME_HREF ? (
            <div className="flex flex-col gap-6 pb-28">
              <AppShellPageTitle>{pageTitle}</AppShellPageTitle>
              <p className="text-muted-foreground">
                Set up the shell and its look here. Press F6 to move between the
                sidebar, the page and the panel.
              </p>
              <SetupCards options={options} setOptions={setOptions} />
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-28">
              <AppShellPageTitle>{pageTitle}</AppShellPageTitle>
              <p className="text-muted-foreground">
                The shell&apos;s options and settings are on Home. Press F6 to
                move between the sidebar, the page and the panel.
              </p>
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  aria-hidden
                  className="h-32 rounded-xl bg-muted/50"
                />
              ))}
            </div>
          )}
        </AppShellContent>
      </OptionShell>
      <WindowControls shellWindow={shellWindow} />
    </>
  )
}
