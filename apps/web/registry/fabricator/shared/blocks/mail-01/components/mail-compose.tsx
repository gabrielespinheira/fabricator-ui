"use client"

import * as React from "react"

import {
  MailComposeSheet,
  MailRecipientPicker,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { type MailContact } from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import {
  FileUpload,
  FileUploadField,
} from "@/registry/bases/__base__/ui/file-upload"
import { Input } from "@/registry/bases/__base__/ui/input"
import { Textarea } from "@/registry/bases/__base__/ui/textarea"

export type MailDraft = {
  toIds: string[]
  subject: string
  body: string
}

type ComposeErrors = { to?: string; body?: string }

const MAX_FILE_SIZE = 25 * 1024 * 1024

/**
 * A new message: who it goes to, the subject, the message and attachments.
 *
 * A sheet rather than a dialog: four fields would fit a dialog, but writing
 * mail means looking things up in other mail, and DESIGN.md gives fields that
 * need the list beside them a sheet.
 */
export function MailCompose({
  open,
  onOpenChange,
  title,
  initial,
  contacts,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initial: MailDraft
  contacts: MailContact[]
  onSend: (draft: MailDraft, files: File[]) => void
}) {
  const [draft, setDraft] = React.useState(initial)
  const [files, setFiles] = React.useState<File[]>([])
  const [errors, setErrors] = React.useState<ComposeErrors>({})
  const bodyRef = React.useRef<HTMLTextAreaElement>(null)

  const update = (patch: Partial<MailDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: ComposeErrors = {}
    if (draft.toIds.length === 0) {
      nextErrors.to = "Add at least one person to send to."
    }
    if (!draft.body.trim() && files.length === 0) {
      nextErrors.body = "Write a message or attach a file."
    }
    setErrors(nextErrors)
    if (nextErrors.to) {
      document.getElementById("mail-compose-to")?.focus()
      return
    }
    if (nextErrors.body) {
      bodyRef.current?.focus()
      return
    }
    onSend({ ...draft, subject: draft.subject.trim() }, files)
  }

  return (
    <MailComposeSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Sends from ada@acme.com."
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-(--density-16) py-(--density-8)">
          <Field data-invalid={errors.to ? true : undefined}>
            <FieldLabel htmlFor="mail-compose-to">To</FieldLabel>
            <MailRecipientPicker
              id="mail-compose-to"
              contacts={contacts}
              value={draft.toIds}
              onValueChange={(toIds) => update({ toIds })}
              isInvalid={Boolean(errors.to)}
              describedBy={errors.to ? "mail-compose-to-error" : undefined}
            />
            <FieldError id="mail-compose-to-error">{errors.to}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="mail-compose-subject">Subject</FieldLabel>
            <Input
              id="mail-compose-subject"
              value={draft.subject}
              placeholder="What it's about"
              onChange={(event) => update({ subject: event.target.value })}
            />
          </Field>
          <Field data-invalid={errors.body ? true : undefined}>
            <FieldLabel htmlFor="mail-compose-body">Message</FieldLabel>
            <Textarea
              ref={bodyRef}
              id="mail-compose-body"
              rows={10}
              value={draft.body}
              aria-invalid={errors.body ? true : undefined}
              aria-describedby={
                errors.body ? "mail-compose-body-error" : undefined
              }
              onChange={(event) => update({ body: event.target.value })}
              className="min-h-48"
            />
            <FieldError id="mail-compose-body-error">{errors.body}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="mail-compose-files">Attachments</FieldLabel>
            <FileUpload
              multiple
              maxSize={MAX_FILE_SIZE}
              value={files}
              onValueChange={(next) => {
                setFiles(next)
                setErrors({})
              }}
            >
              <FileUploadField
                id="mail-compose-files"
                placeholder="Choose files or drop them here, up to 25 MB each"
              />
            </FileUpload>
          </Field>
        </FieldGroup>
        <div className="flex items-center justify-end gap-(--density-8) px-(--density-16) py-(--density-16)">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Discard
          </Button>
          <Button type="submit">Send</Button>
        </div>
      </form>
    </MailComposeSheet>
  )
}
