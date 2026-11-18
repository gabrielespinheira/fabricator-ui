"use client"

import * as React from "react"
import {
  ChartLineIcon,
  DownloadIcon,
  HistoryIcon,
  HomeIcon,
  LayoutGridIcon,
  LinkIcon,
  MailIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShareIcon,
  SlidersHorizontalIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react"
import type { Selection } from "react-aria-components"

import { AppNav, type AppNavGroup } from "@/styles/aria-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
} from "@/styles/aria-fabricator/ui/app-shell"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/styles/aria-fabricator/ui/dropdown-menu"
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/styles/aria-fabricator/ui/sheet"
import { Sidebar, SidebarContent } from "@/styles/aria-fabricator/ui/sidebar"

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Overview", href: "/", icon: HomeIcon },
      {
        id: "revenue",
        label: "Revenue",
        href: "/revenue",
        icon: ChartLineIcon,
      },
      {
        id: "customers",
        label: "Customers",
        href: "/customers",
        icon: UsersIcon,
      },
    ],
  },
]

const cards = [
  { id: "kpis", label: "Headline numbers" },
  { id: "revenue", label: "Revenue" },
  { id: "attention", label: "Needs attention" },
  { id: "customers", label: "Top customers" },
  { id: "plans", label: "Revenue by plan" },
]

export function AppShellPageMenu() {
  const [viewOptions, setViewOptions] = React.useState<Selection>(
    new Set(["compare"])
  )
  const [shownCards, setShownCards] = React.useState<Selection>(
    new Set(cards.map((card) => card.id))
  )
  const [refresh, setRefresh] = React.useState<Selection>(new Set(["1m"]))
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  const isComparing = viewOptions === "all" || viewOptions.has("compare")
  const isCardShown = (id: string) => shownCards === "all" || shownCards.has(id)

  return (
    <AppShell storageKey="app-shell-page-menu" storage={null}>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarContent>
          <AppNav groups={groups} pathname="/" />
        </SidebarContent>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb
            items={[{ label: "Acme Inc", href: "/" }, { label: "Overview" }]}
            renderLink={(item) => (
              <a href={item.href} onClick={(event) => event.preventDefault()} />
            )}
          />
          <AppShellHeaderActions
            actions={[
              {
                id: "share",
                label: "Share",
                icon: ShareIcon,
                onSelect: () => {},
              },
            ]}
            menuLabel="Dashboard options"
            menu={
              <>
                <DropdownMenuGroup
                  selectionMode="multiple"
                  selectedKeys={viewOptions}
                  onSelectionChange={setViewOptions}
                >
                  <DropdownMenuLabel>View</DropdownMenuLabel>
                  <DropdownMenuItem
                    id="compare"
                    textValue="Compare with previous period"
                  >
                    <HistoryIcon />
                    Compare with previous period
                  </DropdownMenuItem>
                  <DropdownMenuItem id="targets" textValue="Show targets">
                    <TargetIcon />
                    Show targets
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger textValue="Cards">
                      <LayoutGridIcon />
                      Cards
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                      selectionMode="multiple"
                      selectedKeys={shownCards}
                      onSelectionChange={setShownCards}
                    >
                      {cards.map((card) => (
                        <DropdownMenuItem
                          key={card.id}
                          id={card.id}
                          textValue={card.label}
                        >
                          {card.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger textValue="Auto-refresh">
                      <RefreshCwIcon />
                      Auto-refresh
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                      selectionMode="single"
                      disallowEmptySelection
                      selectedKeys={refresh}
                      onSelectionChange={setRefresh}
                    >
                      <DropdownMenuItem id="off">Off</DropdownMenuItem>
                      <DropdownMenuItem id="1m">Every minute</DropdownMenuItem>
                      <DropdownMenuItem id="5m">
                        Every 5 minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem id="1h">Every hour</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem textValue="Copy link">
                    <LinkIcon />
                    Copy link
                    <DropdownMenuShortcut>⇧⌘C</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem textValue="Email a weekly report">
                    <MailIcon />
                    Email a weekly report…
                  </DropdownMenuItem>
                  <DropdownMenuItem textValue="Export as CSV">
                    <DownloadIcon />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    textValue="Dashboard settings"
                    onAction={() => setIsSettingsOpen(true)}
                  >
                    <SlidersHorizontalIcon />
                    Dashboard settings…
                  </DropdownMenuItem>
                  <DropdownMenuItem textValue="Reset layout">
                    <RotateCcwIcon />
                    Reset layout
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            }
          />
        </AppShellHeader>
        <AppShellContent size="lg">
          <div className="@container flex flex-col gap-(--density-24)">
            <div className="flex flex-col gap-(--density-4)">
              <AppShellPageTitle>Overview</AppShellPageTitle>
              <p className="text-[15px] text-pretty text-muted-foreground">
                {isComparing
                  ? "Revenue and customers, compared with the previous 30 days."
                  : "Revenue and customers for the last 30 days."}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-(--density-16) @4xl:grid-cols-12">
              {cards
                .filter((card) => isCardShown(card.id))
                .map((card, index) => (
                  <div
                    key={card.id}
                    aria-hidden
                    className={
                      index < 2
                        ? "h-32 rounded-xl bg-muted/50 @4xl:col-span-12"
                        : "h-32 rounded-xl bg-muted/50 @4xl:col-span-6"
                    }
                  />
                ))}
            </div>
          </div>
        </AppShellContent>
      </AppShellMain>
      <SheetContent isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetHeader>
          <SheetTitle>Dashboard settings</SheetTitle>
          <SheetDescription>
            Currency, fiscal year and targets for everyone in Acme Inc.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </AppShell>
  )
}
