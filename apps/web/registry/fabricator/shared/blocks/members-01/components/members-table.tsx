"use client"

import * as React from "react"
import { cn } from "cn"

import { MembersAvatar } from "@/registry/bases/__base__/blocks/members-01/components/members-avatar"
import {
  MembersButton,
  MembersCheckbox,
  MembersMenuButton,
  MembersRolePicker,
  MembersTableHeader,
  type MembersColumn,
  type MembersMenuItem,
} from "@/registry/bases/__base__/blocks/members-01/components/members-controls"
import {
  MembersInvitationBadge,
  MembersTwoFactor,
} from "@/registry/bases/__base__/blocks/members-01/components/members-status"
import {
  formatAgo,
  formatDay,
  getRoleLabel,
  getRowName,
  isProblem,
  type Invitation,
  type MemberRole,
  type Person,
  type TeamRow,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/registry/bases/__base__/ui/table"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const COLUMNS: MembersColumn[] = [
  { label: "Name" },
  { label: "Role", className: "hidden @lg/members:table-cell" },
  { label: "Teams", className: "hidden @4xl/members:table-cell" },
  { label: "Last active", className: "hidden @2xl/members:table-cell" },
  { label: "Two-factor", className: "hidden @3xl/members:table-cell" },
  { label: "Actions", isHidden: true, className: "w-10" },
]

export type MembersTableProps = {
  rows: TeamRow[]
  now: string
  meId: string
  selectedIds: ReadonlySet<string>
  openId: string | null
  /** Why someone's role is fixed, or null when it can change. */
  getRoleNote: (row: TeamRow) => string | null
  getMenu: (row: TeamRow) => MembersMenuItem[][]
  onSelect: (id: string, isSelected: boolean) => void
  onOpen: (id: string) => void
  onRoleChange: (row: TeamRow, role: MemberRole) => void
  onResend: (invitation: Invitation) => void
  onFixAddress: (invitation: Invitation) => void
}

/** Everyone in the workspace and everyone on the way in. */
export function MembersTable({ rows, ...props }: MembersTableProps) {
  return (
    // The wash of a row bleeds past the page's edge; its text stays on it.
    <div className="-mx-(--density-12)">
      <Table aria-label="Members">
        <MembersTableHeader
          columns={COLUMNS}
          className="max-@lg/members:sr-only"
        />
        <TableBody>
          {rows.map((row) => (
            <MembersTableRow key={row.id} row={row} {...props} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MembersTableRow({
  row,
  now,
  meId,
  selectedIds,
  openId,
  getRoleNote,
  getMenu,
  onSelect,
  onOpen,
  onRoleChange,
  onResend,
  onFixAddress,
}: Omit<MembersTableProps, "rows"> & { row: TeamRow }) {
  const isSelected = selectedIds.has(row.id)
  const name = getRowName(row)
  const note = getRoleNote(row)

  return (
    <TableRow
      data-state={isSelected || openId === row.id ? "selected" : undefined}
      className="group/row"
    >
      <TableCell className="w-full max-w-0 min-w-40">
        <div className="flex items-center gap-(--density-12)">
          <RowSelect
            row={row}
            isSelected={isSelected}
            isSelecting={selectedIds.size > 0}
            onSelect={onSelect}
          />
          <button
            type="button"
            onClick={() => onOpen(row.id)}
            className="flex min-h-(--density-40) min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-(--density-2) rounded-md text-start outline-none focus-visible:ring-1 focus-visible:ring-ring pointer-coarse:min-h-(--density-48)"
          >
            <span className="flex max-w-full items-center gap-(--density-8)">
              <span className="min-w-0 truncate font-medium text-foreground">
                {name}
              </span>
              {row.id === meId && (
                <span className="shrink-0 font-normal text-muted-foreground group-data-[state=selected]/row:text-foreground">
                  You
                </span>
              )}
              {row.kind === "invitation" && (
                <span className="hidden shrink-0 @lg/members:block">
                  <MembersInvitationBadge status={row.status} />
                </span>
              )}
            </span>
            <span className="hidden max-w-full truncate text-(length:--density-text-12) text-muted-foreground group-data-[state=selected]/row:text-foreground @lg/members:block">
              {row.kind === "invitation" && !row.name
                ? `Invited by ${row.invitedBy}`
                : row.email}
            </span>
            {/* A phone has one column: what the others say, on a second line. */}
            <span className="flex max-w-full items-center gap-(--density-8) text-(length:--density-text-12) text-muted-foreground group-data-[state=selected]/row:text-foreground @lg/members:hidden">
              {isProblem(row) && row.kind === "invitation" && (
                <MembersInvitationBadge status={row.status} />
              )}
              <span className="truncate">
                {getRoleLabel(row.role)}
                {row.kind === "person"
                  ? `, ${lowerFirst(formatActive(row, now))}`
                  : row.status === "pending" && ", pending"}
              </span>
            </span>
          </button>
        </div>
      </TableCell>
      <TableCell className="hidden @lg/members:table-cell">
        <MembersRolePicker
          label={`Role of ${name}`}
          value={row.role}
          note={note ?? undefined}
          isLocked={note !== null}
          canBeOwner={row.kind === "person"}
          onValueChange={(role) => onRoleChange(row, role)}
          trigger={{
            variant: "ghost",
            // Pulled out by its padding, so the role sits on the column's line.
            className:
              "-ms-3 text-(length:--density-text-13) font-normal text-foreground",
            content: (
              <>
                {getRoleLabel(row.role)}
                <IconPlaceholder
                  lucide="ChevronDownIcon"
                  tabler="IconChevronDown"
                  hugeicons="ArrowDown01Icon"
                  phosphor="CaretDownIcon"
                  remixicon="RiArrowDownSLine"
                  data-icon="inline-end"
                  className="opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100"
                />
              </>
            ),
          }}
        />
      </TableCell>
      <TableCell className="hidden max-w-40 truncate group-data-[state=selected]/row:text-foreground @4xl/members:table-cell">
        {row.kind === "person" && row.teams.length > 0
          ? row.teams.join(", ")
          : "None"}
      </TableCell>
      <TableCell className="hidden tabular-nums group-data-[state=selected]/row:text-foreground @2xl/members:table-cell">
        {row.kind === "person"
          ? formatActive(row, now)
          : formatInvited(row, now)}
      </TableCell>
      <TableCell className="hidden group-data-[state=selected]/row:text-foreground @3xl/members:table-cell">
        {row.kind === "person" ? (
          <MembersTwoFactor isOn={row.hasTwoFactor} />
        ) : (
          <InvitationAction
            invitation={row}
            onResend={onResend}
            onFixAddress={onFixAddress}
          />
        )}
      </TableCell>
      <TableCell className="text-end">
        <MembersMenuButton
          label={`Actions for ${name}`}
          icon={
            <IconPlaceholder
              lucide="EllipsisIcon"
              tabler="IconDots"
              hugeicons="MoreHorizontalCircle01Icon"
              phosphor="DotsThreeIcon"
              remixicon="RiMoreLine"
            />
          }
          groups={getMenu(row)}
          className="opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 aria-expanded:opacity-100 pointer-coarse:-me-2 pointer-coarse:size-(--density-48) pointer-coarse:opacity-100"
        />
      </TableCell>
    </TableRow>
  )
}

// The avatar is the checkbox once the row is pointed at, focused or part of a
// selection, so the names keep the page's edge.
function RowSelect({
  row,
  isSelected,
  isSelecting,
  onSelect,
}: {
  row: TeamRow
  isSelected: boolean
  isSelecting: boolean
  onSelect: (id: string, isSelected: boolean) => void
}) {
  return (
    <span className="relative flex size-(--density-32) shrink-0 items-center justify-center">
      <MembersAvatar
        row={row}
        className={cn(
          "group-has-[[data-slot=checkbox]:focus-visible]/row:opacity-0 pointer-fine:group-hover/row:opacity-0",
          isSelecting && "opacity-0"
        )}
      />
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center opacity-0 group-has-[[data-slot=checkbox]:focus-visible]/row:opacity-100 pointer-fine:group-hover/row:opacity-100",
          isSelecting ? "opacity-100" : "pointer-coarse:hidden"
        )}
      >
        <MembersCheckbox
          label={`Select ${getRowName(row)}`}
          checked={isSelected}
          onCheckedChange={(next) => onSelect(row.id, next)}
        />
      </span>
    </span>
  )
}

function InvitationAction({
  invitation,
  onResend,
  onFixAddress,
}: {
  invitation: Invitation
  onResend: (invitation: Invitation) => void
  onFixAddress: (invitation: Invitation) => void
}) {
  if (invitation.status === "pending") {
    return "Once they join"
  }
  return invitation.status === "undelivered" ? (
    <MembersButton
      variant="outline"
      size="sm"
      aria-label={`Fix the address of ${getRowName(invitation)}`}
      onClick={() => onFixAddress(invitation)}
    >
      Fix address
    </MembersButton>
  ) : (
    <MembersButton
      variant="outline"
      size="sm"
      aria-label={`Resend the invitation to ${getRowName(invitation)}`}
      onClick={() => onResend(invitation)}
    >
      Resend
    </MembersButton>
  )
}

function formatActive(person: Person, now: string) {
  const ago = formatAgo(person.lastActiveAt, now)
  return ago === "Now" ? "Active now" : ago
}

function formatInvited({ status, sentAt }: Invitation, now: string) {
  if (status === "expired") return `Sent ${formatDay(sentAt)}`
  return `Sent ${lowerFirst(formatAgo(sentAt, now))}`
}

function lowerFirst(text: string) {
  return /^(Active|Yesterday|Now)/.test(text)
    ? text.charAt(0).toLowerCase() + text.slice(1)
    : text
}
