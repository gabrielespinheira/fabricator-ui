"use client"

import * as React from "react"

import { notifyMembers } from "@/registry/bases/__base__/blocks/members-01/components/members-controls"
import {
  addInvitations,
  getFirstName,
  getRoleWithArticle,
  getRowName,
  pluralize,
  removeRows,
  setRoles,
  type MemberRole,
  type ParsedAddress,
  type Seats,
  type TeamRow,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"

/** The team and everything that can be done to it, each with its report. */
export function useMembers({
  rows: initialRows,
  seats: initialSeats,
  now,
  invitedBy,
}: {
  rows: TeamRow[]
  seats: Seats
  now: string
  invitedBy: string
}) {
  const [rows, setRows] = React.useState(initialRows)
  const [seats, setSeats] = React.useState(initialSeats)

  const describe = (ids: readonly string[]) => {
    const [first] = rows.filter(({ id }) => ids.includes(id))
    if (!first || ids.length > 1) {
      return pluralize(ids.length, "person", "people")
    }
    return getRowName(first)
  }

  /** Shows the change, and puts the list back as it was on Undo. */
  const change = (next: TeamRow[], message: string) => {
    const previous = rows
    setRows(next)
    notifyMembers(message, () => setRows(previous))
  }

  const changeRole = (ids: readonly string[], role: MemberRole) => {
    const changed = rows.filter(
      (row) => ids.includes(row.id) && row.role !== role
    )
    const [first] = changed
    if (!first) return
    const name = first.name ? getFirstName(first.name) : first.email
    change(
      setRoles(rows, ids, role),
      changed.length === 1
        ? `${name} is ${getRoleWithArticle(role)} now`
        : `${changed.length} roles changed`
    )
  }

  const remove = (ids: readonly string[], heirId?: string) =>
    change(removeRows(rows, ids, heirId), `${describe(ids)} removed`)

  const revoke = (id: string) =>
    change(removeRows(rows, [id]), `Invitation to ${describe([id])} revoked`)

  const resend = (id: string, email?: string) => {
    const row = rows.find((candidate) => candidate.id === id)
    if (!row) return
    setRows((current) =>
      current.map((candidate) =>
        candidate.id === id && candidate.kind === "invitation"
          ? {
              ...candidate,
              email: email ?? candidate.email,
              status: "pending",
              sentAt: now,
            }
          : candidate
      )
    )
    notifyMembers(`Invitation sent to ${email ?? row.email}`)
  }

  const invite = (addresses: readonly ParsedAddress[], role: MemberRole) =>
    setRows((current) =>
      addInvitations(current, addresses, { role, invitedBy, sentAt: now })
    )

  const addSeats = (count: number) =>
    setSeats((current) => ({ ...current, total: current.total + count }))

  return { rows, seats, changeRole, remove, revoke, resend, invite, addSeats }
}
