"use client"

import * as React from "react"

import { MailIconButton } from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { MailFileList } from "@/registry/bases/__base__/blocks/mail-01/components/mail-file-list"
import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import { type MailReplyDraft } from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { useIsMobile } from "@/registry/bases/__base__/hooks/use-mobile"
import { useShortcutLabel } from "@/registry/bases/__base__/ui/app-shell"
import { FieldError } from "@/registry/bases/__base__/ui/field"
import {
  FileUpload,
  FileUploadTrigger,
} from "@/registry/bases/__base__/ui/file-upload"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/registry/bases/__base__/ui/input-group"
import { Kbd } from "@/registry/bases/__base__/ui/kbd"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"

const MAX_FILE_SIZE = 25 * 1024 * 1024

/**
 * The answer, ready at the foot of the thread: one line that grows into a
 * message once it has the focus or a draft.
 */
export function MailReplyBox({
  textareaRef,
  recipient,
  replyAllCount,
  recipients,
  draft,
  onDraftChange,
  onSend,
  onForward,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  /** Who a plain reply goes to: "Maya". */
  recipient: string
  /** How many people a reply to everyone reaches. */
  replyAllCount: number
  /** Everyone this reply goes to: "Maya Chen, Lucas Ferreira". */
  recipients: string
  draft: MailReplyDraft
  onDraftChange: (draft: MailReplyDraft | null) => void
  /** Resolves to what went wrong, or to nothing. */
  onSend: (draft: MailReplyDraft) => Promise<string | undefined>
  onForward: () => void
}) {
  const [isActive, setActive] = React.useState(false)
  const [isSending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const { body, mode, files } = draft
  const hasContent = body !== "" || files.length > 0
  const isOpen = isActive || hasContent || isSending
  const canReplyAll = replyAllCount > 1
  const isMobile = useIsMobile()
  const sendKeys = useShortcutLabel({ keys: "mod+Enter" })

  const update = (patch: Partial<MailReplyDraft>) => {
    setError(undefined)
    onDraftChange({ ...draft, ...patch })
  }

  const setMode = (next: MailReplyDraft["mode"]) => {
    update({ mode: next })
    setActive(true)
    textareaRef.current?.focus()
  }

  const submit = async () => {
    if (isSending) return
    if (!body.trim() && files.length === 0) {
      setError("Write a message or attach a file.")
      textareaRef.current?.focus()
      return
    }
    setSending(true)
    const problem = await onSend({ ...draft, body: body.trim() })
    setSending(false)
    setError(problem)
    if (!problem) setActive(false)
  }

  return (
    <form
      noValidate
      className="min-w-0 flex-1"
      aria-label={mode === "replyAll" ? "Reply all" : `Reply to ${recipient}`}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      onBlur={(event) => {
        // Leaving an empty reply folds it back to its line.
        if (event.currentTarget.contains(event.relatedTarget)) return
        setActive(false)
      }}
    >
      <FileUpload
        multiple
        maxSize={MAX_FILE_SIZE}
        value={[...files]}
        onValueChange={(next) => update({ files: next })}
        onFileReject={([rejection]) => {
          if (rejection) {
            setError(`${rejection.file.name} is over the 25 MB limit.`)
          }
        }}
      >
        <InputGroup className="bg-card">
          {isOpen && (
            <InputGroupAddon
              align="block-start"
              className="flex-wrap gap-x-(--density-8) gap-y-(--density-4)"
            >
              <span className="min-w-0 flex-1 truncate text-(length:--density-text-12)">
                To {recipients}
              </span>
              {canReplyAll && (
                <InputGroupButton
                  size="sm"
                  onClick={() =>
                    setMode(mode === "replyAll" ? "reply" : "replyAll")
                  }
                >
                  {mode === "replyAll" ? mailIcons.reply : mailIcons.replyAll}
                  {mode === "replyAll"
                    ? `Reply to ${recipient} only`
                    : "Reply all"}
                </InputGroupButton>
              )}
              <InputGroupButton size="sm" onClick={onForward}>
                {mailIcons.forward}
                Forward
              </InputGroupButton>
            </InputGroupAddon>
          )}
          <InputGroupTextarea
            ref={textareaRef}
            rows={1}
            aria-label={
              mode === "replyAll"
                ? "Reply to everyone"
                : `Reply to ${recipient}`
            }
            aria-keyshortcuts="R"
            placeholder={
              mode === "replyAll"
                ? "Reply to everyone…"
                : `Reply to ${recipient}…`
            }
            value={body}
            onFocus={() => setActive(true)}
            readOnly={isSending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "mail-reply-error" : undefined}
            onChange={(event) => update({ body: event.target.value })}
            onKeyDown={(event) => {
              // ⌘↵ or Ctrl+↵ sends, as in most mail apps.
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                void submit()
              }
              if (event.key === "Escape" && !hasContent) {
                event.currentTarget.blur()
              }
            }}
            data-open={isOpen ? "" : undefined}
            className="max-h-[40svh] min-h-(--density-44) overflow-y-auto py-(--density-12) data-open:min-h-24 data-open:pt-(--density-4)"
          />
          {isOpen && files.length > 0 && (
            <InputGroupAddon align="block-end">
              <MailFileList files={files} />
            </InputGroupAddon>
          )}
          {isOpen ? (
            <InputGroupAddon align="block-end" className="gap-(--density-4)">
              <FileUploadTrigger
                variant="ghost"
                size={isMobile ? "icon" : "icon-sm"}
                aria-label="Attach files"
                disabled={isSending}
              >
                {mailIcons.attach}
              </FileUploadTrigger>
              {hasContent && !isSending && (
                <MailIconButton
                  label="Discard reply"
                  onClick={() => {
                    setError(undefined)
                    onDraftChange(null)
                    textareaRef.current?.focus()
                  }}
                >
                  {mailIcons.trash}
                </MailIconButton>
              )}
              <Kbd className="ms-auto me-(--density-4) in-data-[size=phone]:hidden">
                {sendKeys}
              </Kbd>
              <fieldset disabled={isSending} className="contents">
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="sm"
                  className="in-data-[size=phone]:ms-auto"
                >
                  {isSending && <Spinner data-icon="inline-start" />}
                  {isSending ? "Sending…" : "Send"}
                </InputGroupButton>
              </fieldset>
            </InputGroupAddon>
          ) : (
            <InputGroupAddon align="inline-end" className="gap-0">
              {canReplyAll && (
                <MailIconButton
                  label="Reply all"
                  shortcut="A"
                  onClick={() => setMode("replyAll")}
                >
                  {mailIcons.replyAll}
                </MailIconButton>
              )}
              <MailIconButton label="Forward" shortcut="F" onClick={onForward}>
                {mailIcons.forward}
              </MailIconButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </FileUpload>
      <FieldError id="mail-reply-error" className="pt-(--density-6)">
        {error}
      </FieldError>
    </form>
  )
}
