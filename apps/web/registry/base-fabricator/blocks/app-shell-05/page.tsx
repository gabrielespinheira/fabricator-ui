"use client"

import * as React from "react"

import {
  AppNav,
  AppNavBottomBar,
  type AppNavGroup,
} from "@/registry/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
  useShellPanel,
} from "@/registry/base-fabricator/ui/app-shell"
import { Sidebar, SidebarContent } from "@/registry/base-fabricator/ui/sidebar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Mobile first: on phones a tab bar holds the main places, the primary
// action floats above the content, and opening a message swaps the screen
// to it. From tablets up, the same shell shows a sidebar and docks the
// message beside the list.

const homeIcon = (
  <IconPlaceholder
    lucide="HomeIcon"
    tabler="IconHome"
    hugeicons="Home01Icon"
    phosphor="HouseIcon"
    remixicon="RiHomeLine"
  />
)
const inboxIcon = (
  <IconPlaceholder
    lucide="InboxIcon"
    tabler="IconInbox"
    hugeicons="InboxIcon"
    phosphor="TrayIcon"
    remixicon="RiInboxLine"
  />
)
const settingsIcon = (
  <IconPlaceholder
    lucide="SettingsIcon"
    tabler="IconSettings"
    hugeicons="SettingsIcon"
    phosphor="GearIcon"
    remixicon="RiSettingsLine"
  />
)

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Home", href: "/", icon: homeIcon, mobile: "tab" },
      {
        id: "inbox",
        label: "Inbox",
        href: "/inbox",
        icon: inboxIcon,
        badge: 3,
        mobile: "tab",
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: settingsIcon,
        mobile: "tab",
      },
    ],
  },
]

const messages = [
  { id: "1", from: "Ada", subject: "Launch checklist" },
  { id: "2", from: "Linus", subject: "Release notes draft" },
  { id: "3", from: "Grace", subject: "Design review on Friday" },
]

function MessageList({ onOpen }: { onOpen: (id: string) => void }) {
  const message = useShellPanel("message")
  return (
    <ul className="flex flex-col">
      {messages.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="flex w-full flex-col items-start gap-0.5 border-b px-4 py-3 text-start hover:bg-muted/50"
            onClick={() => {
              onOpen(item.id)
              message.setOpen(true)
            }}
          >
            <span className="font-medium">{item.from}</span>
            <span className="text-muted-foreground">{item.subject}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function Page() {
  const [openId, setOpenId] = React.useState("1")
  const open = messages.find((item) => item.id === openId)

  return (
    <AppShell storageKey="app-shell-05">
      <Sidebar>
        <SidebarContent>
          <AppNav groups={groups} pathname="/inbox" />
        </SidebarContent>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb items={[{ label: "Inbox" }]} />
          <AppShellHeaderActions
            primaryAction={{
              id: "compose",
              label: "Compose",
              onSelect: () => {},
              icon: (
                <IconPlaceholder
                  lucide="PencilIcon"
                  tabler="IconPencil"
                  hugeicons="PencilEdit01Icon"
                  phosphor="PencilSimpleIcon"
                  remixicon="RiPencilLine"
                />
              ),
            }}
          />
        </AppShellHeader>
        <AppShellContent>
          <MessageList onOpen={setOpenId} />
        </AppShellContent>
        <AppNavBottomBar groups={groups} pathname="/inbox" />
      </AppShellMain>
      <AppShellPanel id="message" label="Message" defaultOpen mobile="swap">
        <AppShellPanelHeader>
          <AppShellPanelClose />
          <AppShellPanelTitle>{open?.subject}</AppShellPanelTitle>
        </AppShellPanelHeader>
        <AppShellPanelContent className="p-4">
          From {open?.from}.
        </AppShellPanelContent>
      </AppShellPanel>
    </AppShell>
  )
}
