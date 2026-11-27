"use client"

import * as React from "react"

import {
  MailComposeOverlay,
  MailRecipientPicker,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { MailFileList } from "@/registry/bases/__base__/blocks/mail-01/components/mail-file-list"
import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import {
  getComposeErrors,
  splitQuote,
  toMailMarkdown,
  type MailComposeErrors,
  type MailContact,
  type MailDraft,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { Alert, AlertTitle } from "@/registry/bases/__base__/ui/alert"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Editor,
  EditorContent,
  EditorToolbar,
  EditorToolbarButton,
  EditorToolbarGroup,
} from "@/registry/bases/__base__/ui/editor"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import {
  FileUpload,
  FileUploadTrigger,
} from "@/registry/bases/__base__/ui/file-upload"
import { Input } from "@/registry/bases/__base__/ui/input"
import { Markdown } from "@/registry/bases/__base__/ui/markdown"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"

const MAX_FILE_SIZE = 25 * 1024 * 1024
const FORMATS = [
  ["bold", "italic"],
  ["bulleted", "numbered", "quote"],
]

/** A message being written, and the files going with it. */
export type MailComposeValue = { draft: MailDraft; files: File[] }

/**
 * A new message: who it goes to, what it's about, the text and its files.
 * Closing it keeps what was written, so nothing is lost and nothing asks.
 */
export function MailCompose({
  open,
  title,
  from,
  initial,
  contacts,
  onSend,
  onDiscard,
  onClose,
}: {
  open: boolean
  title: string
  from: string
  initial: MailComposeValue
  contacts: MailContact[]
  /** Resolves to what went wrong, or to nothing. */
  onSend: (value: MailComposeValue) => Promise<string | undefined>
  onDiscard: (value: MailComposeValue) => void
  onClose: (value: MailComposeValue) => void
}) {
  const [draft, setDraft] = React.useState(initial.draft)
  const [files, setFiles] = React.useState(initial.files)
  const [errors, setErrors] = React.useState<MailComposeErrors>({})
  const [problem, setProblem] = React.useState<string>()
  const [isSending, setSending] = React.useState(false)
  const bodyRef = React.useRef<HTMLDivElement>(null)

  const update = (patch: Partial<MailDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
    setProblem(undefined)
  }

  const submit = async () => {
    if (isSending) return
    const nextErrors = getComposeErrors(draft, { fileCount: files.length })
    setErrors(nextErrors)
    if (nextErrors.to) {
      document.getElementById("mail-compose-to")?.focus()
      return
    }
    if (nextErrors.body) {
      bodyRef.current?.querySelector<HTMLElement>("[role=textbox]")?.focus()
      return
    }
    setSending(true)
    const nextProblem = await onSend({
      draft: { ...draft, subject: draft.subject.trim() },
      files,
    })
    setSending(false)
    setProblem(nextProblem)
  }

  return (
    <MailComposeOverlay
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSending) onClose({ draft, files })
      }}
      title={title}
      description={`From ${from}`}
    >
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col gap-(--density-16) max-md:px-(--density-16) max-md:pt-(--density-12) max-md:pb-[max(var(--density-16),env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        onKeyDownCapture={(event) => {
          if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return
          event.preventDefault()
          event.stopPropagation()
          void submit()
        }}
      >
        <FileUpload
          multiple
          maxSize={MAX_FILE_SIZE}
          value={files}
          onValueChange={(next) => {
            setFiles(next)
            setErrors({})
            setProblem(undefined)
          }}
          onFileReject={([rejection]) => {
            if (rejection) {
              setProblem(`${rejection.file.name} is over the 25 MB limit.`)
            }
          }}
          className="flex min-h-0 flex-1 flex-col gap-(--density-16)"
        >
          <fieldset disabled={isSending} className="contents">
            {/* Its padding keeps the fields' focus rings out of the clip. */}
            <FieldGroup className="-m-1 min-h-0 w-[calc(100%+(--spacing(2)))] flex-1 overflow-y-auto p-1">
              {problem && (
                <Alert variant="error">
                  {mailIcons.alert}
                  <AlertTitle>{problem}</AlertTitle>
                </Alert>
              )}
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
                  autoComplete="off"
                  onChange={(event) => update({ subject: event.target.value })}
                />
              </Field>
              <Field
                ref={bodyRef}
                data-invalid={errors.body ? true : undefined}
              >
                <FieldTitle>Message</FieldTitle>
                <Editor
                  defaultValue={initial.draft.body}
                  onValueChange={(body) => update({ body })}
                  className={errors.body ? "ring-destructive/50" : undefined}
                >
                  <EditorToolbar>
                    {FORMATS.map((group) => (
                      <EditorToolbarGroup key={group.join()}>
                        {group.map((command) => (
                          <EditorToolbarButton
                            key={command}
                            command={command}
                          />
                        ))}
                      </EditorToolbarGroup>
                    ))}
                  </EditorToolbar>
                  <EditorContent
                    size="sm"
                    aria-label="Message"
                    aria-invalid={errors.body ? true : undefined}
                    aria-describedby={
                      errors.body ? "mail-compose-body-error" : undefined
                    }
                    className="max-h-[36svh] min-h-32 overflow-y-auto max-md:text-base"
                  />
                </Editor>
                <FieldError id="mail-compose-body-error">
                  {errors.body}
                </FieldError>
              </Field>
              {draft.quote && (
                <div className="flex flex-col gap-(--density-8)">
                  {/* Focusable, so the keyboard can scroll to its end. */}
                  <section
                    aria-label="Forwarded message"
                    tabIndex={0}
                    className="max-h-40 overflow-y-auto rounded-(--radius-control) bg-hover px-(--density-12) py-(--density-10) text-foreground/70 outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <Markdown size="sm" className="text-inherit">
                      {toMailMarkdown(splitQuote(draft.quote).quote ?? "")}
                    </Markdown>
                  </section>
                  {draft.attachments && draft.attachments.length > 0 && (
                    <p className="flex items-start gap-(--density-6) text-(length:--density-text-12) text-muted-foreground [&_svg]:mt-px [&_svg]:size-3.5 [&_svg]:shrink-0">
                      {mailIcons.attach}
                      With{" "}
                      {draft.attachments.map(({ name }) => name).join(", ")}
                    </p>
                  )}
                </div>
              )}
              {files.length > 0 && <MailFileList files={files} />}
            </FieldGroup>
            <div className="flex shrink-0 items-center gap-(--density-8)">
              <FileUploadTrigger variant="ghost" className="-ms-(--density-16)">
                {mailIcons.attach}
                Attach files
              </FileUploadTrigger>
              <Button
                type="button"
                variant="ghost"
                className="ms-auto"
                onClick={() => onDiscard({ draft, files })}
              >
                Discard
              </Button>
              <Button
                type="submit"
                aria-keyshortcuts="Meta+Enter Control+Enter"
              >
                {isSending && <Spinner data-icon="inline-start" />}
                {isSending ? "Sending…" : "Send"}
              </Button>
            </div>
          </fieldset>
        </FileUpload>
      </form>
    </MailComposeOverlay>
  )
}
