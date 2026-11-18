"use client"

import { groupChatsByRecency } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import { type AssistantChat } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chats"
import { AppNav, type AppNavGroup } from "@/registry/bases/__base__/ui/app-nav"
import { BotFace } from "@/registry/bases/__base__/ui/bot-face"
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
  SidebarTrigger,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The product, a new chat, and the person's chats by recency. Chats switch in
// place here; give each one an `href` (/chat/[id]) to route instead.

const NEW_CHAT_ID = "new-chat"

export function AssistantSidebar({
  chats,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: {
  chats: AssistantChat[]
  activeId: string | null
  onSelect: (chatId: string) => void
  onNewChat: () => void
  onRename: (chatId: string) => void
  onDelete: (chatId: string) => void
}) {
  const groups: AppNavGroup[] = [
    {
      id: "main",
      items: [
        {
          id: NEW_CHAT_ID,
          label: "New chat",
          icon: (
            <IconPlaceholder
              lucide="SquarePenIcon"
              tabler="IconEdit"
              hugeicons="PencilEdit02Icon"
              phosphor="NotePencilIcon"
              remixicon="RiEditBoxLine"
            />
          ),
        },
      ],
    },
    ...groupChatsByRecency(chats, new Date()).map((group) => ({
      id: group.id,
      label: group.label,
      items: group.chats.map((chat) => ({
        id: chat.id,
        label: chat.title,
        actions: [
          {
            id: "rename",
            label: "Rename…",
            onSelect: () => onRename(chat.id),
          },
          {
            id: "delete",
            label: "Delete…",
            destructive: true,
            separatorBefore: true,
            onSelect: () => onDelete(chat.id),
          },
        ],
      })),
    })),
  ]

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex-row items-center gap-(--density-8)">
        <BotFace animated={false} style={{ width: 24, height: 24 }} />
        <span className="truncate text-(length:--density-text-14) font-semibold">
          Acme AI
        </span>
        <SidebarTrigger className="ms-auto" />
      </SidebarHeader>
      <SidebarContent>
        <AppNav
          aria-label="Chats"
          groups={groups}
          activeId={activeId}
          onNavigate={(item) =>
            item.id === NEW_CHAT_ID ? onNewChat() : onSelect(item.id)
          }
        />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={{ name: "Ada Lovelace", email: "ada@acme.com" }}>
          <DropdownMenuGroup>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
