"use client"

import * as React from "react"

import {
  notifySaved,
  SettingsButton,
  SettingsConfirm,
  SettingsSelect,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import {
  SettingsRow,
  SettingsSection,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-section"
import { NEXT_OWNERS } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import { isNameConfirmed } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"
import { Field, FieldLabel } from "@/registry/bases/__base__/ui/field"
import { Input } from "@/registry/bases/__base__/ui/input"

/** Handing the workspace over, and deleting it. */
export function SettingsDangerCard({
  id,
  name,
  isDeleting,
  onDelete,
}: {
  id: string
  name: string
  isDeleting: boolean
  onDelete: () => void
}) {
  const [nextOwner, setNextOwner] = React.useState<string | null>(null)
  const [isTransferOpen, setTransferOpen] = React.useState(false)
  const [isDeleteOpen, setDeleteOpen] = React.useState(false)

  return (
    <SettingsSection
      id={id}
      title="Danger zone"
      description="Only owners see this."
    >
      {nextOwner ? (
        <SettingsRow
          title="Transfer ownership"
          description={`Waiting for ${nextOwner} to accept. You stay the owner until then.`}
          isInline
        >
          <SettingsButton variant="outline" onClick={() => setNextOwner(null)}>
            Withdraw
          </SettingsButton>
        </SettingsRow>
      ) : (
        <SettingsRow
          title="Transfer ownership"
          description="Hand billing and the workspace to someone else."
          isInline
        >
          <SettingsButton
            variant="outline"
            onClick={() => setTransferOpen(true)}
          >
            Transfer…
          </SettingsButton>
        </SettingsRow>
      )}
      <SettingsRow
        title="Delete workspace"
        description={
          isDeleting
            ? "Scheduled for December 24."
            : "8 people, 248 customers and 1,204 files."
        }
        isInline
      >
        <SettingsButton
          variant="destructive"
          isDisabled={isDeleting}
          onClick={() => setDeleteOpen(true)}
        >
          Delete…
        </SettingsButton>
      </SettingsRow>
      <TransferDialog
        name={name}
        open={isTransferOpen}
        onOpenChange={setTransferOpen}
        onTransfer={(owner) => {
          setNextOwner(owner)
          notifySaved(`${owner} was asked to take over`, () =>
            setNextOwner(null)
          )
        }}
      />
      <DeleteDialog
        name={name}
        open={isDeleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={onDelete}
      />
    </SettingsSection>
  )
}

function TransferDialog({
  name,
  open,
  onOpenChange,
  onTransfer,
}: {
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransfer: (owner: string) => void
}) {
  const [ownerId, setOwnerId] = React.useState(NEXT_OWNERS[0]?.value ?? "")
  const owner = NEXT_OWNERS.find(({ value }) => value === ownerId)?.label ?? ""
  const firstName = owner.split(" ")[0]

  return (
    <SettingsConfirm
      open={open}
      onOpenChange={onOpenChange}
      title={`Transfer ${name}?`}
      description={`${firstName} gets billing and can delete the workspace. You become an Admin once ${firstName} accepts.`}
      cancelLabel="Keep ownership"
      confirmLabel={`Ask ${firstName}`}
      onConfirm={() => onTransfer(owner)}
    >
      <Field>
        <FieldLabel htmlFor="next-owner">New owner</FieldLabel>
        <SettingsSelect
          id="next-owner"
          label="New owner"
          value={ownerId}
          options={NEXT_OWNERS}
          onValueChange={setOwnerId}
        />
      </Field>
    </SettingsConfirm>
  )
}

function DeleteDialog({
  name,
  open,
  onOpenChange,
  onDelete,
}: {
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
}) {
  const [typed, setTyped] = React.useState("")

  return (
    <SettingsConfirm
      open={open}
      onOpenChange={(next) => {
        setTyped("")
        onOpenChange(next)
      }}
      title={`Delete ${name}?`}
      description="8 people lose access now. 248 customers, 36 projects and 1,204 files are erased on December 24, and can't be recovered after that."
      cancelLabel="Keep workspace"
      confirmLabel="Delete workspace"
      isDestructive
      isConfirmDisabled={!isNameConfirmed(typed, name)}
      onConfirm={onDelete}
    >
      <Field>
        <FieldLabel htmlFor="delete-name">
          <span>
            Type <span className="font-semibold">{name}</span> to confirm
          </span>
        </FieldLabel>
        <Input
          id="delete-name"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </Field>
    </SettingsConfirm>
  )
}
