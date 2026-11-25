"use client"

import * as React from "react"

import {
  groupAssistantChats,
  type AssistantChat,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  ASSISTANT_USER,
  SAMPLE_NOW,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chats"
import { AppNav, type AppNavGroup } from "@/registry/bases/__base__/ui/app-nav"
import {
  useAppShell,
  useShortcutLabel,
} from "@/registry/bases/__base__/ui/app-shell"
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
  useSidebar,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The product, a new chat, the search, and the person's chats: the pinned
// ones, then the rest by recency. Chats switch in place here; give each one
// an `href` (/chat/[id]) to route instead.

export const ASSISTANT_SEARCH_SHORTCUT = "mod+k"

const NEW_CHAT_ID = "new-chat"
const SEARCH_ID = "search-chats"

const newChatIcon = (
  <IconPlaceholder
    lucide="SquarePenIcon"
    tabler="IconEdit"
    hugeicons="PencilEdit02Icon"
    phosphor="NotePencilIcon"
    remixicon="RiEditBoxLine"
  />
)

const searchIcon = (
  <IconPlaceholder
    lucide="SearchIcon"
    tabler="IconSearch"
    hugeicons="SearchIcon"
    phosphor="MagnifyingGlassIcon"
    remixicon="RiSearchLine"
  />
)

const renameIcon = (
  <IconPlaceholder
    lucide="PencilIcon"
    tabler="IconPencil"
    hugeicons="PencilEdit01Icon"
    phosphor="PencilSimpleIcon"
    remixicon="RiPencilLine"
  />
)

const pinIcon = (
  <IconPlaceholder
    lucide="PinIcon"
    tabler="IconPin"
    hugeicons="PinIcon"
    phosphor="PushPinIcon"
    remixicon="RiPushpinLine"
  />
)

const deleteIcon = (
  <IconPlaceholder
    lucide="Trash2Icon"
    tabler="IconTrash"
    hugeicons="Delete02Icon"
    phosphor="TrashIcon"
    remixicon="RiDeleteBinLine"
  />
)

export function AssistantSidebar({
  chats,
  activeId,
  onSelect,
  onNewChat,
  onSearch,
  onRename,
  onTogglePin,
  onDelete,
}: {
  chats: AssistantChat[]
  activeId: string | null
  onSelect: (chatId: string) => void
  onNewChat: () => void
  onSearch: () => void
  onRename: (chatId: string) => void
  onTogglePin: (chatId: string) => void
  onDelete: (chatId: string) => void
}) {
  const { size } = useAppShell()
  const { isMobile, setOpen } = useSidebar()
  const shortcut = useShortcutLabel({ keys: ASSISTANT_SEARCH_SHORTCUT })

  React.useEffect(() => {
    if (size === "tablet") setOpen(false)
  }, [size, setOpen])

  const groups: AppNavGroup[] = [
    {
      id: "main",
      items: [
        { id: NEW_CHAT_ID, label: "New chat", icon: newChatIcon },
        {
          id: SEARCH_ID,
          label: "Search chats",
          icon: searchIcon,
          badge: isMobile ? undefined : (shortcut ?? undefined),
        },
      ],
    },
    ...groupAssistantChats(chats, SAMPLE_NOW).map((group) => ({
      id: group.id,
      label: group.label,
      items: group.chats.map((chat) => ({
        id: chat.id,
        label: chat.title,
        actions: [
          {
            id: "rename",
            label: "Rename…",
            icon: renameIcon,
            onSelect: () => onRename(chat.id),
          },
          {
            id: "pin",
            label: chat.isPinned ? "Unpin" : "Pin",
            icon: pinIcon,
            onSelect: () => onTogglePin(chat.id),
          },
          {
            id: "delete",
            label: "Delete chat…",
            icon: deleteIcon,
            destructive: true,
            separatorBefore: true,
            onSelect: () => onDelete(chat.id),
          },
        ],
      })),
    })),
  ]

  const handleNavigate = (id: string) => {
    if (id === NEW_CHAT_ID) return onNewChat()
    if (id === SEARCH_ID) return onSearch()
    onSelect(id)
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex-row items-center">
        {/* Starts where the rows' icons start. */}
        <header className="flex min-w-0 items-center gap-(--density-4) ps-(--density-8)">
          <BotFace
            animated={false}
            style={{
              width: "var(--density-20)",
              height: "var(--density-20)",
            }}
          />
          <span className="truncate text-(length:--density-text-14) weight-semibold">
            Acme AI
          </span>
        </header>
        <SidebarTrigger className="ms-auto" />
      </SidebarHeader>
      <SidebarContent>
        <AppNav
          aria-label="Chats"
          groups={groups}
          activeId={activeId ?? NEW_CHAT_ID}
          onNavigate={(item) => handleNavigate(item.id)}
        />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu
          user={{
            name: ASSISTANT_USER.name,
            email: ASSISTANT_USER.email,
            avatarUrl: ASSISTANT_USER.avatarUrl,
          }}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <IconPlaceholder
                lucide="SettingsIcon"
                tabler="IconSettings"
                hugeicons="Settings01Icon"
                phosphor="GearIcon"
                remixicon="RiSettingsLine"
              />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconPlaceholder
                lucide="CircleHelpIcon"
                tabler="IconHelpCircle"
                hugeicons="HelpCircleIcon"
                phosphor="QuestionIcon"
                remixicon="RiQuestionLine"
              />
              Help
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <IconPlaceholder
                lucide="LogOutIcon"
                tabler="IconLogout"
                hugeicons="Logout01Icon"
                phosphor="SignOutIcon"
                remixicon="RiLogoutBoxLine"
              />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
