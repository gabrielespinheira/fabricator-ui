import * as React from "react"
import {
  HomeIcon,
  InboxIcon,
  PencilIcon,
  SettingsIcon,
} from "@fabricator-ui/icons-react-native"
import { Pressable, View } from "react-native"

import {
  AppNav,
  AppNavBottomBar,
  type AppNavGroup,
  type AppNavItem,
} from "@/registry/native/ui/app-nav"
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
} from "@/registry/native/ui/app-shell"
import { Sidebar, SidebarContent } from "@/registry/native/ui/sidebar"
import { Text } from "@/registry/native/ui/text"

// Mobile first: on phones a tab bar holds the main places, the primary action floats
// above the content, and opening a message swaps the screen to it. From tablets up,
// the same shell shows a sidebar and docks the message beside the list.

const noop = () => {}

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Home", href: "/", icon: HomeIcon, mobile: "tab" },
      {
        id: "inbox",
        label: "Inbox",
        href: "/inbox",
        icon: InboxIcon,
        badge: 3,
        mobile: "tab",
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
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
    <View role="list">
      {messages.map((item) => (
        <View key={item.id} role="listitem">
          <Pressable
            role="button"
            className="items-start gap-0.5 border-b border-border px-4 py-3 active:bg-muted/50"
            onPress={() => {
              onOpen(item.id)
              message.setOpen(true)
            }}
          >
            <Text className="font-medium">{item.from}</Text>
            <Text className="text-muted-foreground">{item.subject}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

function AppShell05({
  pathname = "/inbox",
  onNavigate = noop,
  onCompose = noop,
}: {
  pathname?: string
  onNavigate?: (item: AppNavItem) => void
  onCompose?: () => void
}) {
  const [openId, setOpenId] = React.useState("1")
  const open = messages.find((item) => item.id === openId)

  return (
    <AppShell storageKey="app-shell-05">
      <Sidebar>
        <SidebarContent>
          <AppNav groups={groups} pathname={pathname} onNavigate={onNavigate} />
        </SidebarContent>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb items={[{ label: "Inbox" }]} />
          <AppShellHeaderActions
            primaryAction={{
              id: "compose",
              label: "Compose",
              onSelect: onCompose,
              icon: PencilIcon,
            }}
          />
        </AppShellHeader>
        <AppShellContent>
          <MessageList onOpen={setOpenId} />
        </AppShellContent>
        <AppNavBottomBar
          groups={groups}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </AppShellMain>
      <AppShellPanel id="message" label="Message" defaultOpen mobile="swap">
        <AppShellPanelHeader>
          <AppShellPanelClose />
          <AppShellPanelTitle>{open?.subject}</AppShellPanelTitle>
        </AppShellPanelHeader>
        <AppShellPanelContent>
          <Text className="p-4">From {open?.from}.</Text>
        </AppShellPanelContent>
      </AppShellPanel>
    </AppShell>
  )
}

export { AppShell05 }
