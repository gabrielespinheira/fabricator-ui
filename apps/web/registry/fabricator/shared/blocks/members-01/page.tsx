"use client"

import * as React from "react"

import {
  MembersButton,
  MembersMenuItems,
  MembersViewPanel,
  MembersViewTabs,
  notifyMembers,
  type MembersMenuItem,
} from "@/registry/bases/__base__/blocks/members-01/components/members-controls"
import { MembersDetail } from "@/registry/bases/__base__/blocks/members-01/components/members-detail"
import {
  MembersDemoteDialog,
  MembersFixAddressDialog,
  MembersOnlyOwnerDialog,
  MembersRemoveDialog,
} from "@/registry/bases/__base__/blocks/members-01/components/members-dialogs"
import { MembersInviteDialog } from "@/registry/bases/__base__/blocks/members-01/components/members-invite-dialog"
import { MembersSidebar } from "@/registry/bases/__base__/blocks/members-01/components/members-sidebar"
import { MembersTable } from "@/registry/bases/__base__/blocks/members-01/components/members-table"
import {
  MembersSelectionBar,
  MembersToolbar,
} from "@/registry/bases/__base__/blocks/members-01/components/members-toolbar"
import { useMembers } from "@/registry/bases/__base__/blocks/members-01/hooks/use-members"
import { getDemoState } from "@/registry/bases/__base__/blocks/members-01/lib/members-api"
import {
  ME_ID,
  SAMPLE_NOW,
  SAMPLE_ROWS,
  SEATS,
  SIGN_IN_DOMAINS,
  WORKSPACE,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-data"
import {
  filterRows,
  getPeople,
  getRemovalBlock,
  getRoleChange,
  getTeamSummary,
  isProblem,
  sortRows,
  type Invitation,
  type MemberRole,
  type MembersFilter,
  type TeamRow,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
  AppShellPanelTrigger,
  useAppShell,
  useShellPanel,
} from "@/registry/bases/__base__/ui/app-shell"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { Skeleton } from "@/registry/bases/__base__/ui/skeleton"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// An admin sees who is in, changes a role, and invites people without typing
// much. Open the page with ?state=loading or ?state=error to see those; keep
// the filter in the URL (with your router or nuqs) so a link opens the same
// list.

const EMPTY_FILTER: MembersFilter = { view: "all", query: "", roles: [] }
const SKELETON_ROWS = 10

type DialogState =
  | { kind: "invite" }
  | { kind: "remove"; ids: string[] }
  | { kind: "demote"; role: MemberRole }
  | { kind: "only-owner" }
  | { kind: "fix"; id: string }

export default function MembersPage() {
  return (
    <AppShell storageKey="members-01">
      <MembersScreen />
    </AppShell>
  )
}

const subscribeToNothing = () => () => {}

function MembersScreen() {
  const { size } = useAppShell()
  const panel = useShellPanel("member")
  const urlState = React.useSyncExternalStore(
    subscribeToNothing,
    () => getDemoState(window.location.search),
    () => "ready" as const
  )
  const [hasRetried, setRetried] = React.useState(false)
  const status = hasRetried ? "ready" : urlState

  const me = getPeople(SAMPLE_ROWS).find(({ id }) => id === ME_ID)
  const members = useMembers({
    rows: SAMPLE_ROWS,
    seats: SEATS,
    now: SAMPLE_NOW,
    invitedBy: me?.name ?? "",
  })
  const { rows } = members
  const people = getPeople(rows)

  const [filter, setFilter] = React.useState(EMPTY_FILTER)
  const [selection, setSelection] = React.useState<ReadonlySet<string>>(
    new Set()
  )
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [dialog, setDialog] = React.useState<DialogState | null>(null)
  // A closing dialog keeps what it says until it is gone.
  const [lastDialog, setLastDialog] = React.useState<DialogState | null>(null)
  if (dialog && dialog !== lastDialog) setLastDialog(dialog)
  const shown = dialog ?? lastDialog

  const visible = filterRows(sortRows(rows), filter)
  const selected = visible.filter(({ id }) => selection.has(id))
  const openRow = rows.find(({ id }) => id === openId) ?? null
  const isFiltered = filter.query.trim() !== "" || filter.roles.length > 0

  const clearSelection = () => setSelection(new Set())
  const closeDialog = (isOpen: boolean) => {
    if (!isOpen) setDialog(null)
  }

  const open = (id: string) => {
    setOpenId(id)
    panel.setOpen(true)
  }

  const select = (id: string, isSelected: boolean) =>
    setSelection((current) => {
      const next = new Set(current)
      if (isSelected) next.add(id)
      else next.delete(id)
      return next
    })

  const getRoleNote = (row: TeamRow) => {
    if (row.kind !== "person") return null
    const change = getRoleChange(
      people,
      row,
      row.role === "member" ? "viewer" : "member",
      ME_ID
    )
    return change.kind === "blocked" ? change.reason : null
  }

  const changeRole = (row: TeamRow, role: MemberRole) => {
    if (row.kind === "invitation") {
      members.changeRole([row.id], role)
      return
    }
    const change = getRoleChange(people, row, role, ME_ID)
    if (change.kind === "blocked") notifyMembers(change.reason)
    else if (change.kind === "confirm-self") setDialog({ kind: "demote", role })
    else members.changeRole([row.id], role)
  }

  const requestRemove = (ids: string[]) => {
    const going = rows.filter(({ id }) => ids.includes(id))
    const [only] = going
    if (going.length === 1 && only?.kind === "person") {
      if (getRemovalBlock(people, only, ME_ID)) {
        setDialog({ kind: "only-owner" })
        return
      }
      // Nothing to hand over: do it, and offer the way back.
      if (only.id !== ME_ID && only.owns.projects + only.owns.reports === 0) {
        members.remove(ids)
        return
      }
    }
    setDialog({ kind: "remove", ids })
  }

  const resend = (invitation: Invitation) => {
    if (invitation.status === "undelivered") {
      setDialog({ kind: "fix", id: invitation.id })
    } else {
      members.resend(invitation.id)
    }
  }

  const getMenu = (row: TeamRow): MembersMenuItem[][] => {
    const first: MembersMenuItem[] = [
      {
        id: "open",
        label: "View details",
        icon: (
          <IconPlaceholder
            lucide="UserIcon"
            tabler="IconUser"
            hugeicons="UserIcon"
            phosphor="UserIcon"
            remixicon="RiUserLine"
          />
        ),
        onSelect: () => open(row.id),
      },
      {
        id: "copy",
        label: "Copy email",
        icon: (
          <IconPlaceholder
            lucide="CopyIcon"
            tabler="IconCopy"
            hugeicons="Copy01Icon"
            phosphor="CopyIcon"
            remixicon="RiFileCopyLine"
          />
        ),
        onSelect: () => {
          void navigator.clipboard?.writeText(row.email)
          notifyMembers("Email copied")
        },
      },
      {
        id: "select",
        label: "Select",
        icon: (
          <IconPlaceholder
            lucide="CircleCheckIcon"
            tabler="IconCircleCheckFilled"
            hugeicons="CheckmarkCircle01Icon"
            phosphor="CheckCircleIcon"
            remixicon="RiCheckboxCircleFill"
          />
        ),
        onSelect: () => select(row.id, true),
      },
    ]
    if (row.kind === "invitation") {
      return [
        [
          {
            id: "resend",
            label:
              row.status === "undelivered"
                ? "Fix address…"
                : "Resend invitation",
            icon:
              row.status === "undelivered" ? (
                <IconPlaceholder
                  lucide="PencilIcon"
                  tabler="IconPencil"
                  hugeicons="EditIcon"
                  phosphor="PencilIcon"
                  remixicon="RiPencilLine"
                />
              ) : (
                <IconPlaceholder
                  lucide="SendIcon"
                  tabler="IconSend"
                  hugeicons="SentIcon"
                  phosphor="PaperPlaneTiltIcon"
                  remixicon="RiSendPlaneLine"
                />
              ),
            onSelect: () => resend(row),
          },
          ...first,
        ],
        [
          {
            id: "revoke",
            label: "Revoke invitation",
            icon: (
              <IconPlaceholder
                lucide="BanIcon"
                tabler="IconBan"
                hugeicons="UnavailableIcon"
                phosphor="ProhibitIcon"
                remixicon="RiForbidLine"
              />
            ),
            isDestructive: true,
            onSelect: () => members.revoke(row.id),
          },
        ],
      ]
    }
    return [
      first,
      [
        row.id === ME_ID
          ? {
              id: "leave",
              label: "Leave workspace…",
              icon: (
                <IconPlaceholder
                  lucide="LogOutIcon"
                  tabler="IconLogout"
                  hugeicons="Logout01Icon"
                  phosphor="SignOutIcon"
                  remixicon="RiLogoutBoxLine"
                />
              ),
              isDestructive: true,
              onSelect: () => requestRemove([row.id]),
            }
          : {
              id: "remove",
              label:
                row.owns.projects + row.owns.reports > 0
                  ? "Remove from workspace…"
                  : "Remove from workspace",
              icon: (
                <IconPlaceholder
                  lucide="UserRoundXIcon"
                  tabler="IconUserX"
                  hugeicons="UserRemove01Icon"
                  phosphor="UserMinusIcon"
                  remixicon="RiUserUnfollowLine"
                />
              ),
              isDestructive: true,
              onSelect: () => requestRemove([row.id]),
            },
      ],
    ]
  }

  const removableRows = (ids: string[]) =>
    rows.filter(
      (row) =>
        ids.includes(row.id) &&
        (row.kind === "invitation" || !getRemovalBlock(people, row, ME_ID))
    )

  return (
    <>
      <MembersSidebar
        user={{
          name: me?.name ?? "",
          email: me?.email,
          avatarUrl: me?.photo,
        }}
        problemCount={rows.filter(isProblem).length}
      />
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb
            items={[
              { label: "Settings", href: "/settings" },
              { label: "Members" },
            ]}
          />
          <AppShellHeaderActions
            primaryAction={{
              id: "invite",
              label: "Invite people",
              icon: (
                <IconPlaceholder
                  lucide="PlusIcon"
                  tabler="IconPlus"
                  hugeicons="Add01Icon"
                  phosphor="PlusIcon"
                  remixicon="RiAddLine"
                />
              ),
              onSelect: () => setDialog({ kind: "invite" }),
            }}
            menuLabel="Members options"
            menu={
              <MembersMenuItems
                groups={[
                  [
                    {
                      id: "export",
                      label: "Export as CSV",
                      icon: (
                        <IconPlaceholder
                          lucide="DownloadIcon"
                          tabler="IconDownload"
                          hugeicons="DownloadIcon"
                          phosphor="DownloadIcon"
                          remixicon="RiDownloadLine"
                        />
                      ),
                      onSelect: () =>
                        notifyMembers("acme-members.csv downloaded"),
                    },
                  ],
                  [
                    {
                      id: "link",
                      label: "Copy invite link",
                      icon: (
                        <IconPlaceholder
                          lucide="LinkIcon"
                          tabler="IconLink"
                          hugeicons="LinkIcon"
                          phosphor="LinkIcon"
                          remixicon="RiLinksLine"
                        />
                      ),
                      onSelect: () => notifyMembers("Invite link copied"),
                    },
                  ],
                ]}
              />
            }
          />
          <AppShellPanelTrigger panel="member" />
        </AppShellHeader>
        {/* Focus stops above the phone's floating primary. */}
        <AppShellContent
          size="lg"
          className="in-data-[size=phone]:scroll-pb-24"
        >
          <div className="@container/members flex flex-col gap-(--density-24) in-data-[size=phone]:pb-20">
            <div className="flex flex-col gap-(--density-4)">
              <AppShellPageTitle>Members</AppShellPageTitle>
              <p className="text-[15px] text-pretty text-muted-foreground tabular-nums">
                {getTeamSummary(rows, members.seats)}
              </p>
            </div>
            <MembersViewTabs
              value={filter.view}
              onValueChange={(view) => setFilter({ ...filter, view })}
            >
              <div hidden={selected.length > 0}>
                <MembersToolbar
                  filter={filter}
                  count={visible.length}
                  total={rows.length}
                  hasRows={status === "ready" && visible.length > 0}
                  onFilterChange={setFilter}
                  onClear={() =>
                    setFilter({ ...EMPTY_FILTER, view: filter.view })
                  }
                />
              </div>
              {selected.length > 0 ? (
                <MembersSelectionBar
                  count={selected.length}
                  total={visible.length}
                  onRoleChange={(role) => {
                    const ids = selected
                      .filter((row) => getRoleNote(row) === null)
                      .map(({ id }) => id)
                    members.changeRole(ids, role)
                    clearSelection()
                  }}
                  onRemove={() => requestRemove(selected.map(({ id }) => id))}
                  onSelectAll={() =>
                    setSelection(new Set(visible.map(({ id }) => id)))
                  }
                  onClear={clearSelection}
                />
              ) : null}
              <MembersViewPanel value={filter.view}>
                {status === "loading" ? (
                  <MembersSkeleton />
                ) : status === "error" ? (
                  <Alert variant="error">
                    <IconPlaceholder
                      lucide="CircleAlertIcon"
                      tabler="IconExclamationCircle"
                      hugeicons="AlertCircleIcon"
                      phosphor="WarningCircleIcon"
                      remixicon="RiErrorWarningLine"
                    />
                    <AlertTitle>Members didn&apos;t load</AlertTitle>
                    <AlertDescription>
                      The server took too long to answer. Your filters are kept.
                    </AlertDescription>
                    <AlertAction>
                      <MembersButton
                        variant="outline"
                        size="sm"
                        onClick={() => setRetried(true)}
                      >
                        Retry
                      </MembersButton>
                    </AlertAction>
                  </Alert>
                ) : visible.length === 0 ? (
                  <MembersEmpty
                    filter={filter}
                    isFiltered={isFiltered}
                    onClear={() => setFilter(EMPTY_FILTER)}
                    onInvite={() => setDialog({ kind: "invite" })}
                  />
                ) : (
                  <MembersTable
                    rows={visible}
                    now={SAMPLE_NOW}
                    meId={ME_ID}
                    selectedIds={new Set(selected.map(({ id }) => id))}
                    openId={panel.open ? openId : null}
                    getRoleNote={getRoleNote}
                    getMenu={getMenu}
                    onSelect={select}
                    onOpen={open}
                    onRoleChange={changeRole}
                    onResend={resend}
                    onFixAddress={resend}
                  />
                )}
              </MembersViewPanel>
            </MembersViewTabs>
          </div>
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel id="member" label="Member details" defaultWidth={340}>
        <AppShellPanelHeader>
          <AppShellPanelTitle>Details</AppShellPanelTitle>
          <AppShellPanelClose />
        </AppShellPanelHeader>
        <AppShellPanelContent>
          <MembersDetail
            row={openRow}
            now={SAMPLE_NOW}
            roleNote={openRow ? getRoleNote(openRow) : null}
            onRoleChange={changeRole}
            onResend={resend}
            onRevoke={(invitation) => members.revoke(invitation.id)}
          />
        </AppShellPanelContent>
      </AppShellPanel>

      <MembersInviteDialog
        open={dialog?.kind === "invite"}
        onOpenChange={closeDialog}
        isPhone={size === "phone"}
        rows={rows}
        seats={members.seats}
        domains={SIGN_IN_DOMAINS}
        now={SAMPLE_NOW}
        onInvite={members.invite}
        onAddSeats={members.addSeats}
      />
      <MembersOnlyOwnerDialog
        open={dialog?.kind === "only-owner"}
        onOpenChange={closeDialog}
        workspace={WORKSPACE}
        people={people}
        meId={ME_ID}
        onMakeOwner={(person) => members.changeRole([person.id], "owner")}
      />
      {shown?.kind === "remove" && (
        <MembersRemoveDialog
          open={dialog?.kind === "remove"}
          onOpenChange={closeDialog}
          rows={removableRows(shown.ids)}
          people={people}
          onRemove={(heirId) => {
            members.remove(
              removableRows(shown.ids).map(({ id }) => id),
              heirId
            )
            clearSelection()
          }}
        />
      )}
      {shown?.kind === "demote" && (
        <MembersDemoteDialog
          open={dialog?.kind === "demote"}
          onOpenChange={closeDialog}
          role={shown.role}
          onConfirm={() => members.changeRole([ME_ID], shown.role)}
        />
      )}
      {shown?.kind === "fix" && (
        <FixAddress
          key={shown.id}
          id={shown.id}
          rows={rows}
          open={dialog?.kind === "fix"}
          onOpenChange={closeDialog}
          onSend={(email) => members.resend(shown.id, email)}
        />
      )}
    </>
  )
}

function FixAddress({
  id,
  rows,
  ...props
}: {
  id: string
  rows: TeamRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (email: string) => void
}) {
  const invitation = rows.find(
    (row): row is Invitation => row.kind === "invitation" && row.id === id
  )
  // The address it opened with, so the words hold while the dialog closes.
  const [original] = React.useState(invitation)
  if (!original) return null
  return (
    <MembersFixAddressDialog
      invitation={original}
      domains={SIGN_IN_DOMAINS}
      {...props}
    />
  )
}

function MembersSkeleton() {
  return (
    <div
      role="status"
      aria-busy
      aria-label="Loading members"
      className="flex flex-col gap-(--density-8)"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} className="h-(--density-48)" />
      ))}
    </div>
  )
}

function MembersEmpty({
  filter,
  isFiltered,
  onClear,
  onInvite,
}: {
  filter: MembersFilter
  isFiltered: boolean
  onClear: () => void
  onInvite: () => void
}) {
  if (isFiltered) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPlaceholder
              lucide="SearchIcon"
              tabler="IconSearch"
              hugeicons="SearchIcon"
              phosphor="MagnifyingGlassIcon"
              remixicon="RiSearchLine"
            />
          </EmptyMedia>
          <EmptyTitle>
            {filter.query.trim()
              ? `Nobody matches "${filter.query.trim()}"`
              : "Nobody has that role"}
          </EmptyTitle>
          <EmptyDescription>
            Try a shorter name, or clear the search and filters.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <MembersButton variant="outline" onClick={onClear}>
            Clear search and filters
          </MembersButton>
        </EmptyContent>
      </Empty>
    )
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconPlaceholder
            lucide="MailIcon"
            tabler="IconMail"
            hugeicons="Mail01Icon"
            phosphor="EnvelopeIcon"
            remixicon="RiMailLine"
          />
        </EmptyMedia>
        <EmptyTitle>No invitations waiting</EmptyTitle>
        <EmptyDescription>
          People you invite show here until they join.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <MembersButton variant="outline" onClick={onInvite}>
          Invite people
        </MembersButton>
      </EmptyContent>
    </Empty>
  )
}
