"use client"

import * as React from "react"

import { AppNav, type AppNavGroup } from "@/registry/bases/__base__/ui/app-nav"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/__base__/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/bases/__base__/ui/workspace-switcher"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const companies = [
  { id: "acme", name: "Acme Inc", description: "Business banking" },
  { id: "acme-labs", name: "Acme Labs Ltd", description: "UK entity" },
]

function getGroups(waitingCount: number): AppNavGroup[] {
  return [
    {
      id: "banking",
      items: [
        {
          id: "home",
          label: "Home",
          href: "/dashboard",
          icon: (
            <IconPlaceholder
              lucide="HouseIcon"
              tabler="IconHome"
              hugeicons="Home01Icon"
              phosphor="HouseIcon"
              remixicon="RiHomeLine"
            />
          ),
        },
        {
          id: "transactions",
          label: "Transactions",
          href: "/transactions",
          icon: (
            <IconPlaceholder
              lucide="ArrowLeftRightIcon"
              tabler="IconArrowsLeftRight"
              hugeicons="ArrowDataTransferHorizontalIcon"
              phosphor="ArrowsLeftRightIcon"
              remixicon="RiArrowLeftRightLine"
            />
          ),
        },
        {
          id: "payments",
          label: "Payments",
          href: "/payments",
          badge: waitingCount > 0 ? waitingCount : undefined,
          icon: (
            <IconPlaceholder
              lucide="SendIcon"
              tabler="IconSend"
              hugeicons="SentIcon"
              phosphor="PaperPlaneTiltIcon"
              remixicon="RiSendPlaneLine"
            />
          ),
        },
        {
          id: "cards",
          label: "Cards",
          href: "/cards",
          icon: (
            <IconPlaceholder
              lucide="CreditCardIcon"
              tabler="IconCreditCard"
              hugeicons="CreditCardIcon"
              phosphor="CreditCardIcon"
              remixicon="RiBankCardLine"
            />
          ),
        },
        {
          id: "accounts",
          label: "Accounts",
          href: "/accounts",
          icon: (
            <IconPlaceholder
              lucide="LandmarkIcon"
              tabler="IconBuildingBank"
              hugeicons="BankIcon"
              phosphor="BankIcon"
              remixicon="RiBankLine"
            />
          ),
        },
      ],
    },
    {
      id: "manage",
      label: "Manage",
      items: [
        {
          id: "treasury",
          label: "Treasury",
          href: "/treasury",
          icon: (
            <IconPlaceholder
              lucide="TrendingUpIcon"
              tabler="IconTrendingUp"
              hugeicons="ChartIncreaseIcon"
              phosphor="TrendUpIcon"
              remixicon="RiStockLine"
            />
          ),
        },
        {
          id: "insights",
          label: "Insights",
          href: "/insights",
          icon: (
            <IconPlaceholder
              lucide="ChartPieIcon"
              tabler="IconChartPie"
              hugeicons="PieChartIcon"
              phosphor="ChartPieIcon"
              remixicon="RiPieChartLine"
            />
          ),
        },
        {
          id: "settings",
          label: "Settings",
          href: "/settings",
          icon: (
            <IconPlaceholder
              lucide="SettingsIcon"
              tabler="IconSettings"
              hugeicons="Settings01Icon"
              phosphor="GearIcon"
              remixicon="RiSettingsLine"
            />
          ),
        },
      ],
    },
  ]
}

/** The company switcher, the banking navigation and the person's menu. */
export function FinanceSidebar({ waitingCount }: { waitingCount: number }) {
  const [company, setCompany] = React.useState("acme")
  const groups = React.useMemo(() => getGroups(waitingCount), [waitingCount])

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher
          label="Companies"
          createLabel="Add company"
          workspaces={companies}
          activeId={company}
          onSelect={setCompany}
          onCreate={() => {}}
        />
      </SidebarHeader>
      <SidebarContent>
        <AppNav groups={groups} pathname="/dashboard" />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={{ name: "Maya Chen", email: "maya@acme.com" }}>
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Notifications</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
