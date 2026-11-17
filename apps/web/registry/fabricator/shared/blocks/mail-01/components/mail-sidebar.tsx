"use client"

import * as React from "react"

import {
  MAIL_CONTACTS,
  MAIL_LABELS,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-data"
import {
  findContact,
  ME,
  type MailFolder,
  type MailView,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
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

const account = findContact(MAIL_CONTACTS, ME)
const me = {
  name: account?.name ?? "",
  email: account?.email,
  avatarUrl: account?.avatar,
}

const accounts = [
  { id: "work", name: "ada@acme.com", description: "Acme Inc" },
  { id: "personal", name: "ada@lovelace.dev", description: "Personal" },
]

export const MAIL_FOLDERS: {
  id: MailFolder
  label: string
  icon: React.ReactElement
}[] = [
  {
    id: "inbox",
    label: "Inbox",
    icon: (
      <IconPlaceholder
        lucide="InboxIcon"
        tabler="IconInbox"
        hugeicons="InboxIcon"
        phosphor="TrayIcon"
        remixicon="RiInboxLine"
      />
    ),
  },
  {
    id: "starred",
    label: "Starred",
    icon: (
      <IconPlaceholder
        lucide="StarIcon"
        tabler="IconStar"
        hugeicons="StarIcon"
        phosphor="StarIcon"
        remixicon="RiStarLine"
      />
    ),
  },
  {
    id: "snoozed",
    label: "Snoozed",
    icon: (
      <IconPlaceholder
        lucide="AlarmClockIcon"
        tabler="IconAlarm"
        hugeicons="AlarmClockIcon"
        phosphor="AlarmIcon"
        remixicon="RiAlarmLine"
      />
    ),
  },
  {
    id: "sent",
    label: "Sent",
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
    id: "drafts",
    label: "Drafts",
    icon: (
      <IconPlaceholder
        lucide="FilePenIcon"
        tabler="IconFilePencil"
        hugeicons="FileEditIcon"
        phosphor="NotePencilIcon"
        remixicon="RiDraftLine"
      />
    ),
  },
  {
    id: "archive",
    label: "Archive",
    icon: (
      <IconPlaceholder
        lucide="ArchiveIcon"
        tabler="IconArchive"
        hugeicons="Archive02Icon"
        phosphor="ArchiveIcon"
        remixicon="RiArchiveLine"
      />
    ),
  },
  {
    id: "spam",
    label: "Spam",
    icon: (
      <IconPlaceholder
        lucide="OctagonAlertIcon"
        tabler="IconAlertOctagon"
        hugeicons="Alert02Icon"
        phosphor="WarningOctagonIcon"
        remixicon="RiSpam2Line"
      />
    ),
  },
  {
    id: "trash",
    label: "Trash",
    icon: (
      <IconPlaceholder
        lucide="Trash2Icon"
        tabler="IconTrash"
        hugeicons="Delete02Icon"
        phosphor="TrashIcon"
        remixicon="RiDeleteBinLine"
      />
    ),
  },
]

/** The id AppNav knows a view by: the folder's id, or "label:<id>". */
export function getMailViewId(view: MailView) {
  return view.kind === "folder" ? view.folder : `label:${view.label}`
}

function getGroups(counts: {
  inbox: number
  drafts: number
  spam: number
}): AppNavGroup[] {
  const badges: Partial<Record<MailFolder, number>> = counts
  return [
    {
      id: "folders",
      // No hrefs: the folders switch the list in place. Give each one an
      // href (/mail/[folder]) to route instead.
      items: MAIL_FOLDERS.map(({ id, label, icon }) => {
        const badge = badges[id]
        return { id, label, icon, badge: badge || undefined }
      }),
    },
    {
      id: "labels",
      label: "Labels",
      items: MAIL_LABELS.map(({ id, name, dot }) => ({
        id: `label:${id}`,
        label: name,
        // The dot is the label's colour; its name is always beside it.
        icon: (
          <span
            aria-hidden
            className="flex size-(--density-icon-16) items-center justify-center"
          >
            <span className={`size-2 rounded-full ${dot}`} />
          </span>
        ),
      })),
    },
  ]
}

/** Accounts, folders with their counts, labels and the person's menu. */
export function MailSidebar({
  view,
  counts,
  onViewChange,
}: {
  view: MailView
  counts: { inbox: number; drafts: number; spam: number }
  onViewChange: (view: MailView) => void
}) {
  const [account, setAccount] = React.useState("work")
  const groups = React.useMemo(() => getGroups(counts), [counts])

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher
          label="Accounts"
          createLabel="Add account"
          workspaces={accounts}
          activeId={account}
          onSelect={setAccount}
          onCreate={() => {}}
        />
      </SidebarHeader>
      <SidebarContent>
        <AppNav
          aria-label="Mail"
          groups={groups}
          activeId={getMailViewId(view)}
          onNavigate={(item) => {
            const label = MAIL_LABELS.find(
              ({ id }) => `label:${id}` === item.id
            )
            if (label) {
              onViewChange({ kind: "label", label: label.id })
              return
            }
            const folder = MAIL_FOLDERS.find(({ id }) => id === item.id)
            if (folder) onViewChange({ kind: "folder", folder: folder.id })
          }}
        />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={me}>
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Mail settings</DropdownMenuItem>
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
