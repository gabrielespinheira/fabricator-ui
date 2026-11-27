"use client"

import * as React from "react"
import { cn } from "cn"

import { MailAvatar } from "@/registry/bases/__base__/blocks/mail-01/components/mail-avatar"
import { MailIconButton } from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import {
  MailCollapsedMessage,
  MailOpenMessage,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-message"
import { MailReplyBox } from "@/registry/bases/__base__/blocks/mail-01/components/mail-reply-box"
import { MAIL_LABELS } from "@/registry/bases/__base__/blocks/mail-01/lib/mail-data"
import {
  findContact,
  formatSnoozedUntil,
  getReplyRecipientIds,
  getShortName,
  ME,
  type MailAttachment,
  type MailContact,
  type MailReplyDraft,
  type MailThread,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { AppShellPageTitle } from "@/registry/bases/__base__/ui/app-shell"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Button } from "@/registry/bases/__base__/ui/button"

const EMPTY_REPLY: MailReplyDraft = { body: "", mode: "reply", files: [] }

/** Why a thread can't be answered where it is, with the way out. */
function ClosedThreadNote({
  text,
  action,
  onAction,
}: {
  text: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-(--density-8) rounded-(--radius-control) bg-hover py-(--density-8) ps-(--density-16) pe-(--density-8) text-(length:--density-text-13) text-foreground/70 @md/thread:ms-[calc(var(--density-32)+var(--density-10))]">
      {text}
      <Button variant="outline" size="sm" onClick={onAction}>
        {action}
      </Button>
    </div>
  )
}

/**
 * The open thread at a reading width: its subject, earlier messages folded to
 * a line each, the latest open, and the answer ready underneath.
 */
export function MailThreadView({
  thread,
  contacts,
  now,
  timeFormat,
  replyRef,
  replyDraft,
  onReplyDraftChange,
  onReply,
  onForward,
  onEditDraft,
  onMoveToInbox,
  onStar,
  onDownload,
}: {
  thread: MailThread
  contacts: MailContact[]
  now: number
  timeFormat: TimeFormat
  replyRef: React.RefObject<HTMLTextAreaElement | null>
  replyDraft: MailReplyDraft | undefined
  onReplyDraftChange: (draft: MailReplyDraft | null) => void
  onReply: (draft: MailReplyDraft) => Promise<string | undefined>
  onForward: () => void
  onEditDraft: () => void
  onMoveToInbox: () => void
  onStar: () => void
  onDownload: (attachment: MailAttachment) => void
}) {
  // Folding is about what was here when the thread opened: the latest message
  // and anything that arrives or is sent afterwards stay open.
  const [foldedIds, setFoldedIds] = React.useState(() =>
    thread.messages.slice(0, -1).map(({ id }) => id)
  )
  const columnRef = React.useRef<HTMLDivElement>(null)
  const messageCount = React.useRef(thread.messages.length)

  const latest = thread.messages.at(-1)
  const latestId = latest?.id
  React.useEffect(() => {
    const hasNew = thread.messages.length > messageCount.current
    messageCount.current = thread.messages.length
    if (!hasNew) return
    const message = columnRef.current?.querySelector<HTMLElement>(
      `[data-message="${latestId}"]`
    )
    message?.focus({ preventScroll: true })
    message?.scrollIntoView({ block: "center" })
  }, [thread.messages.length, latestId])

  if (!latest) return null

  const draft = replyDraft ?? EMPTY_REPLY
  const replyIds = getReplyRecipientIds(latest, "reply")
  const replyAllIds = getReplyRecipientIds(latest, "replyAll")
  const getNames = (ids: string[]) =>
    ids.map((id) => findContact(contacts, id)?.name ?? "").join(", ")
  const [recipientId = ME] = replyIds
  const recipient = findContact(contacts, recipientId)
  const labels = MAIL_LABELS.filter(({ id }) => thread.labels.includes(id))
  const isSnoozed = thread.snoozedUntil !== undefined
  const isDraft = thread.box === "drafts"

  return (
    <div
      ref={columnRef}
      className="@container/thread mx-auto flex w-full max-w-[calc(45rem+2*var(--density-24))] flex-col gap-(--density-24) px-(--density-16) pt-(--density-12) md:px-(--density-24)"
    >
      <div className="flex flex-col gap-(--density-6)">
        <div className="flex items-start gap-(--density-8)">
          <AppShellPageTitle className="min-w-0 flex-1 text-balance break-words">
            {thread.subject}
          </AppShellPageTitle>
          <MailIconButton
            label={thread.isStarred ? "Remove star" : "Star"}
            shortcut="S"
            isPressed={thread.isStarred}
            onClick={onStar}
            className={cn(
              "-me-(--density-6) mt-0.5 in-data-[size=phone]:-me-(--density-10) in-data-[size=phone]:-mt-1.5",
              thread.isStarred && "text-foreground [&_svg]:fill-current"
            )}
          >
            {mailIcons.star}
          </MailIconButton>
        </div>
        {(labels.length > 0 || isDraft || isSnoozed) && (
          <div className="flex flex-wrap items-center gap-x-(--density-12) gap-y-(--density-6) text-(length:--density-text-12) text-muted-foreground">
            {isDraft && <Badge variant="outline">Draft</Badge>}
            {thread.snoozedUntil !== undefined && (
              <Badge variant="info">
                Snoozed until{" "}
                {formatSnoozedUntil(thread.snoozedUntil, now, timeFormat)}
              </Badge>
            )}
            {labels.map(({ id, name, dot }) => (
              <span key={id} className="flex items-center gap-(--density-6)">
                <span aria-hidden className={cn("size-2 rounded-full", dot)} />
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="isolate flex flex-col gap-(--density-8)">
        {thread.messages.map((message) => {
          const props = { message, contacts, now, timeFormat }
          if (foldedIds.includes(message.id)) {
            return (
              <MailCollapsedMessage
                key={message.id}
                {...props}
                onExpand={() =>
                  setFoldedIds((ids) => ids.filter((id) => id !== message.id))
                }
              />
            )
          }
          return (
            <div key={message.id} className="not-last:pb-(--density-16)">
              <MailOpenMessage
                {...props}
                onCollapse={
                  thread.messages.length > 1
                    ? () => setFoldedIds((ids) => [...ids, message.id])
                    : undefined
                }
                onDownload={onDownload}
              />
            </div>
          )
        })}
      </div>
      <div className="pb-[max(var(--density-16),env(safe-area-inset-bottom))]">
        {isDraft ? (
          <Button
            onClick={onEditDraft}
            className="@md/thread:ms-[calc(var(--density-32)+var(--density-10))]"
          >
            {mailIcons.edit}
            Continue writing
          </Button>
        ) : thread.box === "trash" ? (
          <ClosedThreadNote
            text="This conversation is in Trash."
            action="Move to inbox"
            onAction={onMoveToInbox}
          />
        ) : thread.box === "spam" ? (
          <ClosedThreadNote
            text="Reported as spam. Don't open links or files in it."
            action="Not spam"
            onAction={onMoveToInbox}
          />
        ) : (
          <div className="flex items-start gap-(--density-10)">
            <MailAvatar
              contact={findContact(contacts, ME)}
              className="mt-[calc((var(--density-44)-var(--density-32))/2)] hidden shrink-0 @md/thread:flex"
            />
            <MailReplyBox
              textareaRef={replyRef}
              recipient={getShortName(recipient)}
              replyAllCount={replyAllIds.length}
              recipients={getNames(
                draft.mode === "replyAll" ? replyAllIds : replyIds
              )}
              draft={draft}
              onDraftChange={onReplyDraftChange}
              onSend={onReply}
              onForward={onForward}
            />
          </div>
        )}
      </div>
    </div>
  )
}
