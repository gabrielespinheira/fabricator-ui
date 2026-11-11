"use client"

import * as React from "react"

import {
  BellIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  ShareIcon,
  UserIcon,
} from "@/lib/site-icons"
import {
  EMPTY_NAV_PREFERENCES,
  type NavPreferences,
} from "@/styles/base-fabricator/lib/app-shell-model"
import {
  AppNav,
  AppNavBottomBar,
  AppNavCustomize,
  type AppNavGroup,
} from "@/styles/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPanel,
  AppShellPanelTrigger,
  AppShellStatusBar,
  AppShellTitlebar,
  useDragRegionProps,
  type AppShellWindow,
} from "@/styles/base-fabricator/ui/app-shell"
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
import { UserMenu } from "@/styles/base-fabricator/ui/user-menu"
import { WorkspaceSwitcher } from "@/styles/base-fabricator/ui/workspace-switcher"

import { getTabsPlacement, type PlaygroundOptions } from "../_lib/options"
import { USER, WORKSPACES } from "./playground-data"

type Crumb = { label: React.ReactNode; href?: string }

/**
 * The tab strip as the main column's top row, which moves the window. It runs
 * the column's full width on the strip's own inset. It lines up with the panel's
 * header and ends where the main header does, so the panel's toggle keeps its
 * spot on screen and the strip's last control lines up with the header's.
 */
function TabRow({ children }: { children: React.ReactNode }) {
  const dragRegion = useDragRegionProps()
  return (
    <div
      {...dragRegion}
      className="flex h-(--density-48) shrink-0 items-center gap-(--density-8) pe-(--app-shell-control-inset) [&>[data-slot=tab-strip]]:-me-(--density-6)"
    >
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

/**
 * An App Shell put together from the option cards' choices, so the playground
 * and the desktop example honour every option the same way. They bring the
 * navigation, the tab strip, the panel, the status bar and the page.
 */
export function OptionShell({
  options,
  storageKey,
  shellWindow,
  workspaces = WORKSPACES,
  user = USER,
  groups,
  navLabel,
  sidebarTools,
  pathname,
  renderLink,
  brand,
  rootCrumb,
  bottomNavClassName,
  crumbs,
  pageTitle,
  tabStrip,
  panelId,
  panelLabel,
  panelViews,
  isPanelOpenByDefault = true,
  panel,
  status,
  children,
}: {
  options: PlaygroundOptions
  storageKey: string
  shellWindow?: AppShellWindow
  workspaces?: React.ComponentProps<typeof WorkspaceSwitcher>["workspaces"]
  user?: React.ComponentProps<typeof UserMenu>["user"]
  groups: AppNavGroup[]
  navLabel?: string
  sidebarTools?: React.ReactNode
  pathname: string
  renderLink: (item: { id?: string; href?: string }) => React.ReactElement
  /** Stands in the sidebar's header without a workspace switcher. */
  brand?: React.ReactNode
  /** The trail's first crumb. Default: the workspace. */
  rootCrumb?: string
  bottomNavClassName?: string
  /** The trail after the first crumb, the current page last. */
  crumbs: Crumb[]
  pageTitle: React.ReactNode
  tabStrip: React.ReactNode
  panelId: string
  panelLabel: string
  panelViews?: React.ComponentProps<typeof AppShellPanel>["views"]
  isPanelOpenByDefault?: boolean
  panel: React.ReactNode
  status: React.ReactNode
  children: React.ReactNode
}) {
  const [workspace, setWorkspace] = React.useState(workspaces[0]?.id)
  const [preferences, setPreferences] = React.useState<NavPreferences>(
    EMPTY_NAV_PREFERENCES
  )
  const tabsPlacement = getTabsPlacement(options)
  const workspaceName = workspaces.find((entry) => entry.id === workspace)?.name
  // Always in the main column's top row: it pins over the panel's header.
  const panelTrigger = options.panel && <AppShellPanelTrigger panel={panelId} />

  return (
    <AppShell
      storageKey={storageKey}
      storage={null}
      peek={options.peek}
      mobileSidebar={options.mobileSidebar}
      window={shellWindow}
      titlebar={
        tabsPlacement === "titlebar" ? (
          <AppShellTitlebar>{tabStrip}</AppShellTitlebar>
        ) : undefined
      }
    >
      <Sidebar variant={options.variant} collapsible={options.collapse}>
        <SidebarHeader className="flex-row items-center">
          {options.account === "header" && (
            <UserMenu variant="mark" align="start" user={user}>
              <UserMenuItems />
            </UserMenu>
          )}
          {options.switcher === "none" ? (
            brand
          ) : (
            <div className="min-w-0 flex-1">
              <WorkspaceSwitcher
                variant={options.switcher}
                size={options.account === "header" ? "mark" : "row"}
                workspaces={workspaces}
                activeId={workspace}
                onSelect={setWorkspace}
                onCreate={() => {}}
                onManage={() => {}}
              />
            </div>
          )}
          {/* Desktop windows keep the toggle in their top band instead. */}
          {!shellWindow && options.collapse !== "none" && (
            <SidebarTrigger className="ms-auto group-data-[collapsible=icon]:hidden" />
          )}
        </SidebarHeader>
        {sidebarTools && <div className="px-2 pb-2">{sidebarTools}</div>}
        <SidebarContent>
          <AppNav
            aria-label={navLabel}
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
              <UserMenu user={user}>
                <UserMenuItems />
              </UserMenu>
            )}
          </SidebarFooter>
        )}
        {options.collapse !== "none" && <SidebarRail />}
      </Sidebar>
      <AppShellMain>
        {tabsPlacement === "row" && (
          <TabRow>
            {tabStrip}
            {panelTrigger}
          </TabRow>
        )}
        <AppShellHeader>
          {tabsPlacement === "header" ? (
            tabStrip
          ) : options.breadcrumb ? (
            <AppShellBreadcrumb
              renderLink={renderLink}
              items={[
                { label: rootCrumb ?? workspaceName, href: "/" },
                ...crumbs,
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
          {tabsPlacement !== "row" && panelTrigger}
        </AppShellHeader>
        {children}
        {options.bottomNav && (
          <AppNavBottomBar
            groups={groups}
            pathname={pathname}
            renderLink={renderLink}
            className={bottomNavClassName}
          />
        )}
      </AppShellMain>
      {options.panel && (
        <AppShellPanel
          id={panelId}
          label={panelLabel}
          defaultOpen={isPanelOpenByDefault}
          mobile={options.panelMobile}
          views={panelViews}
        >
          {panel}
        </AppShellPanel>
      )}
      {options.status && <AppShellStatusBar>{status}</AppShellStatusBar>}
    </AppShell>
  )
}
