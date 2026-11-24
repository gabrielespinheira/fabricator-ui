"use client"

import * as React from "react"
import { FileTypeIcon } from "@fabricator-ui/icons/files"

import { MailAvatar } from "@/registry/bases/__base__/blocks/mail-01/components/mail-avatar"
import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import {
  findContact,
  formatMailDateTime,
  formatMailTime,
  getMessageSnippet,
  ME,
  splitQuote,
  toMailMarkdown,
  type MailAttachment,
  type MailContact,
  type MailMessage,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/registry/bases/__base__/ui/attachment"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Markdown } from "@/registry/bases/__base__/ui/markdown"

type MessageProps = {
  message: MailMessage
  contacts: MailContact[]
  now: number
  timeFormat: TimeFormat
}

function listNames(contacts: MailContact[], ids: string[]) {
  return ids
    .map((id) => (id === ME ? "me" : (findContact(contacts, id)?.name ?? "")))
    .join(", ")
}

/** The short time where the thread is narrow, the full date where it isn't. */
function MessageTime({
  message,
  now,
  timeFormat,
}: Pick<MessageProps, "message" | "now" | "timeFormat">) {
  return (
    <time
      dateTime={new Date(message.sentAt).toISOString()}
      className="shrink-0 text-(length:--density-text-12) text-muted-foreground tabular-nums"
    >
      <span className="@lg/thread:hidden">
        {formatMailTime(message.sentAt, now, timeFormat)}
      </span>
      <span className="hidden @lg/thread:inline">
        {formatMailDateTime(message.sentAt, timeFormat)}
      </span>
    </time>
  )
}

/** The text, with the message it quotes folded away under it. */
function MessageBody({ body }: { body: string }) {
  const { text, attribution, quote } = splitQuote(body)
  const hasOwnText = text.trim() !== ""
  const [isQuoteOpen, setQuoteOpen] = React.useState(!hasOwnText)
  const quoteId = React.useId()

  return (
    <div className="flex max-w-prose flex-col items-start gap-(--density-12)">
      {hasOwnText && (
        <Markdown size="sm" className="w-full in-data-[size=phone]:text-base">
          {toMailMarkdown(text)}
        </Markdown>
      )}
      {quote !== undefined && hasOwnText && (
        <Button
          variant="secondary"
          size="xs"
          // Its press area is a thumb's on touch.
          className="relative pointer-coarse:after:absolute pointer-coarse:after:-inset-2.5"
          aria-expanded={isQuoteOpen}
          aria-controls={isQuoteOpen ? quoteId : undefined}
          aria-label={isQuoteOpen ? "Hide quoted text" : "Show quoted text"}
          onClick={() => setQuoteOpen((isOpen) => !isOpen)}
        >
          {mailIcons.more}
        </Button>
      )}
      {quote !== undefined && isQuoteOpen && (
        <div
          id={quoteId}
          className="flex w-full flex-col gap-(--density-8) rounded-lg bg-hover px-(--density-16) py-(--density-12) text-foreground/70"
        >
          {attribution && (
            <p className="text-(length:--density-text-12)">{attribution}</p>
          )}
          <Markdown size="sm" className="text-inherit">
            {toMailMarkdown(quote)}
          </Markdown>
        </div>
      )}
    </div>
  )
}

function MessageAttachments({
  attachments,
  onDownload,
}: {
  attachments: MailAttachment[]
  onDownload: (attachment: MailAttachment) => void
}) {
  return (
    <ul aria-label="Attachments" className="flex flex-wrap gap-(--density-8)">
      {attachments.map((attachment) => (
        <li key={attachment.name} className="max-w-full min-w-0">
          <Attachment className="max-w-full">
            <AttachmentMedia>
              <FileTypeIcon name={attachment.name} className="size-6" />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle
                title={attachment.name}
                className="@max-md/thread:break-words @max-md/thread:whitespace-normal"
              >
                {attachment.name}
              </AttachmentTitle>
              <AttachmentDescription>{attachment.size}</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                size="icon-sm"
                className="relative pointer-coarse:after:absolute pointer-coarse:after:-inset-2"
                aria-label={`Download ${attachment.name}`}
                onClick={() => onDownload(attachment)}
              >
                {mailIcons.download}
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </li>
      ))}
    </ul>
  )
}

/** A message folded to one line; pressing it opens it. */
export function MailCollapsedMessage({
  message,
  contacts,
  now,
  timeFormat,
  onExpand,
}: MessageProps & { onExpand: () => void }) {
  const sender = findContact(contacts, message.fromId)
  return (
    <button
      type="button"
      aria-expanded={false}
      onClick={onExpand}
      // Pulled out by its own padding, so its avatar and time line up with
      // the open messages'.
      className="-mx-(--density-8) flex min-h-(--density-44) cursor-pointer items-center gap-(--density-10) rounded-lg px-(--density-8) text-start text-(length:--density-text-13) transition-colors duration-feedback ease-feedback outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <MailAvatar contact={sender} className="shrink-0" />
      <span className="flex min-w-0 flex-1 gap-x-(--density-8) @max-md/thread:flex-col">
        <span className="shrink-0 truncate font-medium">
          {message.fromId === ME ? "Me" : sender?.name}
        </span>
        <span className="min-w-0 truncate text-muted-foreground">
          {getMessageSnippet(message)}
        </span>
      </span>
      <MessageTime message={message} now={now} timeFormat={timeFormat} />
    </button>
  )
}

/** A message to read: who, to whom, when, the text and its files. */
export function MailOpenMessage({
  message,
  contacts,
  now,
  timeFormat,
  onCollapse,
  onDownload,
}: MessageProps & {
  onCollapse?: () => void
  onDownload: (attachment: MailAttachment) => void
}) {
  const sender = findContact(contacts, message.fromId)
  const name = message.fromId === ME ? "Me" : (sender?.name ?? "Unknown sender")

  const heading = (
    <>
      <MailAvatar contact={sender} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-baseline gap-(--density-6)">
          <span className="min-w-0 truncate font-medium @max-md/thread:whitespace-normal">
            {name}
          </span>
          <span className="hidden min-w-0 shrink-[2] truncate text-(length:--density-text-12) text-muted-foreground @md/thread:inline">
            {sender?.email}
          </span>
        </span>
        <span className="truncate text-(length:--density-text-12) text-muted-foreground">
          to {listNames(contacts, message.toIds)}
          {message.ccIds?.length
            ? `, cc ${listNames(contacts, message.ccIds)}`
            : ""}
        </span>
      </span>
      <MessageTime message={message} now={now} timeFormat={timeFormat} />
    </>
  )

  return (
    <article
      tabIndex={-1}
      data-message={message.id}
      aria-label={`From ${name}, ${formatMailDateTime(message.sentAt, timeFormat)}`}
      className="flex flex-col gap-(--density-12) outline-none"
    >
      <header className="text-(length:--density-text-13)">
        {onCollapse ? (
          <button
            type="button"
            aria-expanded
            onClick={onCollapse}
            className="-mx-(--density-8) flex w-[calc(100%+2*var(--density-8))] cursor-pointer items-start gap-(--density-10) rounded-lg px-(--density-8) py-(--density-6) text-start transition-colors duration-feedback ease-feedback outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {heading}
          </button>
        ) : (
          <div className="flex items-start gap-(--density-10) py-(--density-6)">
            {heading}
          </div>
        )}
      </header>
      {/* Under the name, so the avatars stand in a column of their own. */}
      <div className="flex flex-col gap-(--density-16) @md/thread:ps-[calc(var(--density-32)+var(--density-10))]">
        <MessageBody body={message.body} />
        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments
            attachments={message.attachments}
            onDownload={onDownload}
          />
        )}
      </div>
    </article>
  )
}
