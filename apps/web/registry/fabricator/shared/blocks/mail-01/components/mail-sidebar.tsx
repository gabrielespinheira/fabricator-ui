"use client"

import * as React from "react"

import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import {
  MAIL_ACCOUNTS,
  MAIL_CONTACTS,
  MAIL_LABELS,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-data"
import {
  findContact,
  ME,
  type MailAccountId,
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
  SidebarTrigger,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/bases/__base__/ui/workspace-switcher"

const FOLDERS: { id: MailFolder; label: string; icon: React.ReactElement }[] = [
  { id: "inbox", label: "Inbox", icon: mailIcons.inbox },
  { id: "starred", label: "Starred", icon: mailIcons.star },
  { id: "snoozed", label: "Snoozed", icon: mailIcons.snooze },
  { id: "sent", label: "Sent", icon: mailIcons.sent },
  { id: "drafts", label: "Drafts", icon: mailIcons.draft },
  { id: "archive", label: "Archive", icon: mailIcons.archive },
  { id: "spam", label: "Spam", icon: mailIcons.spam },
  { id: "trash", label: "Trash", icon: mailIcons.trash },
]

/** The name of what the list shows: a folder's or a label's. */
export function getMailViewLabel(view: MailView) {
  return view.kind === "folder"
    ? (FOLDERS.find(({ id }) => id === view.folder)?.label ?? "Mail")
    : (MAIL_LABELS.find(({ id }) => id === view.label)?.name ?? "Mail")
}

/** The id AppNav knows a view by: the folder's id, or "label:<id>". */
function getViewId(view: MailView) {
  return view.kind === "folder" ? view.folder : `label:${view.label}`
}

type MailCounts = { inbox: number; drafts: number; spam: number }

function getGroups(counts: MailCounts): AppNavGroup[] {
  const badges: Partial<Record<MailFolder, number>> = counts
  return [
    {
      id: "folders",
      // No hrefs: the folders switch the list in place. Give each one an
      // href (/mail/[folder]) to route instead.
      items: FOLDERS.map(({ id, label, icon }) => ({
        id,
        label,
        icon,
        badge: badges[id] || undefined,
      })),
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
  accountId,
  view,
  counts,
  onAccountChange,
  onViewChange,
}: {
  accountId: MailAccountId
  view: MailView
  counts: MailCounts
  onAccountChange: (id: MailAccountId) => void
  onViewChange: (view: MailView) => void
}) {
  const groups = React.useMemo(() => getGroups(counts), [counts])
  const me = findContact(MAIL_CONTACTS, ME)

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-(--density-4)">
          <WorkspaceSwitcher
            label="Accounts"
            createLabel="Add account"
            workspaces={MAIL_ACCOUNTS.map(({ id, name, email }) => ({
              id,
              name,
              description: email,
            }))}
            activeId={accountId}
            onSelect={(id) => {
              const account = MAIL_ACCOUNTS.find((entry) => entry.id === id)
              if (account) onAccountChange(account.id)
            }}
            onCreate={() => {}}
          />
          <SidebarTrigger className="ms-auto shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <AppNav
          aria-label="Mail"
          groups={groups}
          activeId={getViewId(view)}
          onNavigate={(item) => {
            const label = MAIL_LABELS.find(
              ({ id }) => `label:${id}` === item.id
            )
            if (label) {
              onViewChange({ kind: "label", label: label.id })
              return
            }
            const folder = FOLDERS.find(({ id }) => id === item.id)
            if (folder) onViewChange({ kind: "folder", folder: folder.id })
          }}
        />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu
          // The address is the account's, at the top.
          user={{ name: me?.name ?? "", avatarUrl: me?.avatar }}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem>
              {mailIcons.profile}
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              {mailIcons.settings}
              Mail settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              {mailIcons.signOut}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
