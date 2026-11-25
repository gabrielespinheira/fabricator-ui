"use client"

import * as React from "react"

import {
  MembersConfirm,
  MembersSelect,
} from "@/registry/bases/__base__/blocks/members-01/components/members-controls"
import {
  describeOwned,
  getFirstName,
  getHeirs,
  getRoleWithArticle,
  getRowName,
  isEmail,
  pluralize,
  suggestAddress,
  type Invitation,
  type MemberRole,
  type Person,
  type TeamRow,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import { Input } from "@/registry/bases/__base__/ui/input"

type Open = { open: boolean; onOpenChange: (open: boolean) => void }

/** Taking people out, and who gets what they own. */
export function MembersRemoveDialog({
  open,
  onOpenChange,
  rows,
  people,
  onRemove,
}: Open & {
  /** Who goes: people, and invitations among them. */
  rows: TeamRow[]
  people: Person[]
  onRemove: (heirId?: string) => void
}) {
  const ids = rows.map(({ id }) => id)
  const leaving = rows.filter((row): row is Person => row.kind === "person")
  const owned = describeOwned({
    projects: leaving.reduce((sum, { owns }) => sum + owns.projects, 0),
    reports: leaving.reduce((sum, { owns }) => sum + owns.reports, 0),
  })
  const heirs = getHeirs(people, ids)
  const [heirId, setHeirId] = React.useState<string | null>(null)
  const heir = heirs.find(({ id }) => id === heirId) ?? heirs[0]
  const [only] = rows
  const isOne = rows.length === 1 && only !== undefined
  const name = isOne
    ? getRowName(only)
    : pluralize(rows.length, "person", "people")

  return (
    <MembersConfirm
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${name}?`}
      description={getRemovalText(rows, isOne)}
      cancelLabel={isOne ? `Keep ${getFirstName(name)}` : "Keep them"}
      confirmLabel={
        isOne ? `Remove ${getFirstName(name)}` : `Remove ${rows.length}`
      }
      isDestructive
      onConfirm={() => {
        onRemove(owned ? heir?.id : undefined)
        setHeirId(null)
      }}
    >
      {owned && heir && (
        <Field>
          <FieldLabel htmlFor="member-heir">
            {isOne ? "Give their work to" : "Give all of it to"}
          </FieldLabel>
          <MembersSelect
            id="member-heir"
            label="New owner of their work"
            value={heir.id}
            options={heirs.map((person) => ({
              value: person.id,
              label: person.name,
            }))}
            onValueChange={setHeirId}
          />
          <FieldDescription>
            {owned}. {getFirstName(heir.name)} gets an email about it.
          </FieldDescription>
        </Field>
      )}
    </MembersConfirm>
  )
}

function getRemovalText(rows: TeamRow[], isOne: boolean) {
  if (isOne) {
    return "They are signed out now and lose access to every project. Comments and history stay."
  }
  const names = rows.slice(0, 3).map(getRowName)
  const rest = rows.length - names.length
  const list =
    rest > 0 ? `${names.join(", ")} and ${rest} more` : names.join(", ")
  return `${list}. People are signed out now, and invitations stop working.`
}

/** Lowering your own role, which you can't take back yourself. */
export function MembersDemoteDialog({
  open,
  onOpenChange,
  role,
  onConfirm,
}: Open & { role: MemberRole; onConfirm: () => void }) {
  return (
    <MembersConfirm
      open={open}
      onOpenChange={onOpenChange}
      title={`Make yourself ${getRoleWithArticle(role)}?`}
      description={`${
        role === "admin"
          ? "You lose billing and can't delete the workspace."
          : "You can't invite people, change roles or open these settings."
      } Only another owner can change it back.`}
      cancelLabel="Stay an Owner"
      confirmLabel="Change my role"
      onConfirm={onConfirm}
    />
  )
}

/** The only owner wants out: someone else has to be one first. */
export function MembersOnlyOwnerDialog({
  open,
  onOpenChange,
  workspace,
  people,
  meId,
  onMakeOwner,
}: Open & {
  workspace: string
  people: Person[]
  meId: string
  onMakeOwner: (person: Person) => void
}) {
  const candidates = getHeirs(people, [meId])
  const [nextId, setNextId] = React.useState<string | null>(null)
  const next = candidates.find(({ id }) => id === nextId) ?? candidates[0]

  return (
    <MembersConfirm
      open={open}
      onOpenChange={onOpenChange}
      title="Choose another owner first"
      description={`You are the only owner of ${workspace}. Once someone else is one too, you can leave or change your role.`}
      cancelLabel="Not now"
      confirmLabel={next ? `Make ${getFirstName(next.name)} an Owner` : "Done"}
      onConfirm={() => {
        if (next) onMakeOwner(next)
      }}
    >
      {next && (
        <Field>
          <FieldLabel htmlFor="next-owner">New owner</FieldLabel>
          <MembersSelect
            id="next-owner"
            label="New owner"
            value={next.id}
            options={candidates.map((person) => ({
              value: person.id,
              label: person.name,
            }))}
            onValueChange={setNextId}
          />
          <FieldDescription>
            Owners manage billing and can delete the workspace.
          </FieldDescription>
        </Field>
      )}
    </MembersConfirm>
  )
}

/** An address that bounced, with the one they probably meant filled in. */
export function MembersFixAddressDialog({
  open,
  onOpenChange,
  invitation,
  domains,
  onSend,
}: Open & {
  invitation: Invitation
  domains: string[]
  onSend: (email: string) => void
}) {
  const suggestion = suggestAddress(invitation.email, domains)
  const [email, setEmail] = React.useState(suggestion ?? invitation.email)
  const domain = invitation.email.split("@")[1]

  return (
    <MembersConfirm
      open={open}
      onOpenChange={onOpenChange}
      title={`Send to ${getRowName(invitation)} again`}
      description={`There is no mail server at ${domain}.`}
      cancelLabel="Cancel"
      confirmLabel="Send invitation"
      isConfirmDisabled={!isEmail(email)}
      onConfirm={() => onSend(email)}
    >
      <Field>
        <FieldLabel htmlFor="fixed-address">Email address</FieldLabel>
        <Input
          id="fixed-address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value.trim())}
          autoComplete="off"
          inputMode="email"
        />
        {suggestion && (
          <FieldDescription>Was {invitation.email}.</FieldDescription>
        )}
      </Field>
    </MembersConfirm>
  )
}
