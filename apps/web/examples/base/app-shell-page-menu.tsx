"use client"

import * as React from "react"
import {
  ChartLineIcon,
  DownloadIcon,
  GitCompareArrowsIcon,
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

import { AppNav, type AppNavGroup } from "@/styles/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
} from "@/styles/base-fabricator/ui/app-shell"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/styles/base-fabricator/ui/sheet"
import { Sidebar, SidebarContent } from "@/styles/base-fabricator/ui/sidebar"

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Overview", href: "/", icon: HomeIcon },
      { id: "revenue", label: "Revenue", href: "/revenue", icon: ChartLineIcon },
      { id: "customers", label: "Customers", href: "/customers", icon: UsersIcon },
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
  const [isComparing, setIsComparing] = React.useState(true)
  const [showsTargets, setShowsTargets] = React.useState(false)
  const [shownCards, setShownCards] = React.useState(
    () => new Set(cards.map((card) => card.id))
  )
  const [refresh, setRefresh] = React.useState("1m")
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  function toggleCard(id: string, isShown: boolean) {
    setShownCards((current) => {
      const next = new Set(current)
      if (isShown) next.add(id)
      else next.delete(id)
      return next
    })
  }

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
                <DropdownMenuGroup>
                  <DropdownMenuLabel>View</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={isComparing}
                    onCheckedChange={setIsComparing}
                  >
                    <GitCompareArrowsIcon />
                    Compare with previous period
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showsTargets}
                    onCheckedChange={setShowsTargets}
                  >
                    <TargetIcon />
                    Show targets
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <LayoutGridIcon />
                      Cards
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuGroup>
                        {cards.map((card) => (
                          <DropdownMenuCheckboxItem
                            key={card.id}
                            checked={shownCards.has(card.id)}
                            onCheckedChange={(isShown) =>
                              toggleCard(card.id, isShown)
                            }
                          >
                            {card.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <RefreshCwIcon />
                      Auto-refresh
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={refresh}
                        onValueChange={setRefresh}
                      >
                        <DropdownMenuRadioItem value="off">Off</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1m">
                          Every minute
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="5m">
                          Every 5 minutes
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1h">
                          Every hour
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <LinkIcon />
                    Copy link
                    <DropdownMenuShortcut>⇧⌘C</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MailIcon />
                    Email a weekly report…
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DownloadIcon />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                    <SlidersHorizontalIcon />
                    Dashboard settings…
                  </DropdownMenuItem>
                  <DropdownMenuItem>
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
                .filter((card) => shownCards.has(card.id))
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
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Dashboard settings</SheetTitle>
            <SheetDescription>
              Currency, fiscal year and targets for everyone in Acme Inc.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </AppShell>
  )
}
