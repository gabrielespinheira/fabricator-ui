"use client"

import * as React from "react"
import { useQueryStates } from "nuqs"

import {
  ActivityIcon,
  BellIcon,
  GitBranchIcon,
  InfoIcon,
  LogOutIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  ShareIcon,
  UserIcon,
} from "@/lib/site-icons"
import { SiteSettingsFields } from "@/components/fabricator/site-settings"
import {
  EMPTY_NAV_PREFERENCES,
  getActiveNavItem,
  getNavPath,
  type NavPreferences,
} from "@/styles/base-fabricator/lib/app-shell-model"
import {
  AppNav,
  AppNavBottomBar,
  AppNavCustomize,
} from "@/styles/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelHeader,
  AppShellPanelTabs,
  AppShellPanelTrigger,
  AppShellPanelView,
  AppShellStatusBar,
  AppShellTitlebar,
  useDragRegionProps,
  type AppShellWindow,
} from "@/styles/base-fabricator/ui/app-shell"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/styles/base-fabricator/ui/sidebar"
import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
} from "@/styles/base-fabricator/ui/tab-strip"
import { UserMenu } from "@/styles/base-fabricator/ui/user-menu"
import { WorkspaceSwitcher } from "@/styles/base-fabricator/ui/workspace-switcher"

import { getPlaygroundWindow, playgroundParsers } from "../_lib/options"
import { OptionsCard } from "./options-card"
import {
  DOCUMENTS,
  getNavGroups,
  INITIAL_TABS,
  USER,
  WORKSPACES,
} from "./playground-data"

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
    // trafficLightPosition { x: 16, y: 23 }: three 12px lights in a 52 by
    // 14px box.
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

/** The tab strip as the main column's top row, which moves the window. */
function TabRow({ children }: { children: React.ReactNode }) {
  const dragRegion = useDragRegionProps()
  return (
    <div {...dragRegion} className="flex shrink-0 items-center px-1.5">
      {children}
    </div>
  )
}

function UserMenuItems() {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <UserIcon />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <BellIcon />
          Notifications
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}

const HOME_HREF = "/"

export function AppShellPlayground() {
  const [options, setOptions] = useQueryStates(playgroundParsers)
  const [pathname, setPathname] = React.useState(HOME_HREF)
  const [workspace, setWorkspace] = React.useState("acme")
  const [preferences, setPreferences] = React.useState<NavPreferences>(
    EMPTY_NAV_PREFERENCES
  )
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

  const switcher =
    options.switcher === "none" ? null : (
      <WorkspaceSwitcher
        variant={options.switcher}
        size={options.account === "header" ? "mark" : "row"}
        workspaces={WORKSPACES}
        activeId={workspace}
        onSelect={setWorkspace}
        onCreate={() => {}}
        onManage={() => {}}
      />
    )

  return (
    <>
      <WindowMaterial shellWindow={shellWindow} />
      <AppShell
        storageKey="playground"
        storage={null}
        peek={options.peek}
        mobileSidebar={options.mobileSidebar}
        window={shellWindow}
        titlebar={
          options.tabs === "titlebar" ? (
            <AppShellTitlebar>{tabStrip}</AppShellTitlebar>
          ) : undefined
        }
      >
        <Sidebar variant={options.variant} collapsible={options.collapse}>
          <SidebarHeader className="flex-row items-center">
            {options.account === "header" && (
              <UserMenu variant="mark" align="start" user={USER}>
                <UserMenuItems />
              </UserMenu>
            )}
            {switcher && <div className="min-w-0 flex-1">{switcher}</div>}
            {/* Desktop windows keep the toggle in their top band instead. */}
            {options.window === "web" && options.collapse !== "none" && (
              <SidebarTrigger className="ms-auto group-data-[collapsible=icon]:hidden" />
            )}
          </SidebarHeader>
          <SidebarContent>
            <AppNav
              groups={groups}
              pathname={pathname}
              renderLink={renderLink}
              preferences={preferences}
              onPreferencesChange={setPreferences}
              customizable={options.customize}
            />
          </SidebarContent>
          {(options.account === "footer" || options.customize) && (
            <SidebarFooter>
              {options.customize && (
                <AppNavCustomize
                  groups={groups}
                  preferences={preferences}
                  onPreferencesChange={setPreferences}
                />
              )}
              {options.account === "footer" && (
                <UserMenu user={USER}>
                  <UserMenuItems />
                </UserMenu>
              )}
            </SidebarFooter>
          )}
          {options.collapse !== "none" && <SidebarRail />}
        </Sidebar>
        <AppShellMain>
          {options.tabs === "main" && <TabRow>{tabStrip}</TabRow>}
          <AppShellHeader>
            {options.breadcrumb ? (
              <AppShellBreadcrumb
                renderLink={renderLink}
                items={[
                  {
                    label: WORKSPACES.find((entry) => entry.id === workspace)
                      ?.name,
                    href: "/",
                  },
                  ...path
                    .slice(0, -1)
                    .map((item) => ({ label: item.label, href: item.href })),
                  { label: pageTitle },
                ]}
              />
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {pageTitle}
              </span>
            )}
            {options.actions && (
              <AppShellHeaderActions
                actions={[
                  {
                    id: "search",
                    label: "Search",
                    icon: SearchIcon,
                    onSelect: () => {},
                  },
                  {
                    id: "share",
                    label: "Share",
                    icon: ShareIcon,
                    onSelect: () => {},
                  },
                ]}
                primaryAction={{
                  id: "new",
                  label: "New task",
                  icon: PlusIcon,
                  shortcut: "c",
                  onSelect: () => {},
                }}
              />
            )}
            {options.panel && <AppShellPanelTrigger panel="inspector" />}
          </AppShellHeader>
          <AppShellContent>
            {pathname === HOME_HREF ? (
              <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 pb-28">
                <AppShellPageTitle>{pageTitle}</AppShellPageTitle>
                <p className="text-muted-foreground">
                  Set up the shell and its look here. Press F6 to move between
                  the sidebar, the page and the panel.
                </p>
                <div className="flex flex-wrap items-start gap-6">
                  <Card className="min-w-0 flex-[1_1_18rem] md:max-w-xs">
                    <CardHeader>
                      <CardTitle>Settings</CardTitle>
                      <CardDescription>
                        The same settings as the website; the whole page follows
                        them.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SiteSettingsFields />
                    </CardContent>
                  </Card>
                  <OptionsCard
                    options={options}
                    setOptions={setOptions}
                    className="min-w-0 flex-[1_1_22rem]"
                  />
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 pb-28">
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
          {options.bottomNav && (
            <AppNavBottomBar
              groups={groups}
              pathname={pathname}
              renderLink={renderLink}
            />
          )}
        </AppShellMain>
        {options.panel && (
          <AppShellPanel
            id="inspector"
            label="Inspector"
            defaultOpen
            mobile={options.panelMobile}
            views={[
              { value: "details", label: "Details", icon: InfoIcon },
              { value: "activity", label: "Activity", icon: ActivityIcon },
              { value: "comments", label: "Comments", icon: MessageSquareIcon },
            ]}
          >
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
          </AppShellPanel>
        )}
        {options.status && (
          <AppShellStatusBar>
            <Button variant="ghost" size="sm" aria-label="Branch: main">
              <GitBranchIcon data-icon="inline-start" />
              main
            </Button>
            <span>Synced</span>
            <span className="ms-auto">{tabs.state.tabs.length} open</span>
          </AppShellStatusBar>
        )}
      </AppShell>
      <WindowControls shellWindow={shellWindow} />
    </>
  )
}
