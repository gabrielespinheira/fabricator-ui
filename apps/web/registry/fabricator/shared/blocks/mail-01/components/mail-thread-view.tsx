"use client"

import * as React from "react"
import { FileTypeIcon } from "@fabricator-ui/icons/files"

import { MailAvatar } from "@/registry/bases/__base__/blocks/mail-01/components/mail-avatar"
import {
  MailIconButton,
  MailMenuButton,
  type MailMenuGroup,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { MailReplyBox } from "@/registry/bases/__base__/blocks/mail-01/components/mail-reply-box"
import { MailLabelBadge } from "@/registry/bases/__base__/blocks/mail-01/components/mail-thread-list"
import {
  findContact,
  formatMailDateTime,
  formatSnoozedUntil,
  ME,
  type MailContact,
  type MailMessage,
  type MailThread,
  type SnoozeOption,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import {
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
} from "@/registry/bases/__base__/ui/app-shell"
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/registry/bases/__base__/ui/attachment"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export type MailThreadAction =
  | "archive"
  | "delete"
  | "toggleUnread"
  | "spam"
  | "notSpam"
  | "moveToInbox"

type ReplyMode = "reply" | "replyAll"

function nameOf(contacts: MailContact[], id: string) {
  return id === ME ? "me" : (findContact(contacts, id)?.name ?? "")
}

function listNames(contacts: MailContact[], ids: string[]) {
  return ids.map((id) => nameOf(contacts, id)).join(", ")
}

/** Everyone on the latest message but you: who Reply all writes to. */
function getReplyAllIds(message: MailMessage) {
  return [
    ...new Set([message.fromId, ...message.toIds, ...(message.ccIds ?? [])]),
  ].filter((id) => id !== ME)
}

function MessageBody({ body }: { body: string }) {
  return (
    <div className="flex flex-col gap-(--density-12) text-[14px] leading-relaxed text-pretty">
      {body.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function ExpandedMessage({
  message,
  contacts,
  timeFormat,
  onCollapse,
}: {
  message: MailMessage
  contacts: MailContact[]
  timeFormat: TimeFormat
  onCollapse?: () => void
}) {
  const sender = findContact(contacts, message.fromId)
  const date = formatMailDateTime(message.sentAt, timeFormat)

  return (
    <article
      aria-label={`From ${sender?.name ?? "unknown"}, ${date}`}
      className="flex flex-col gap-(--density-16)"
    >
      <header className="flex items-start gap-(--density-10)">
        <MailAvatar contact={sender} />
        <div className="flex min-w-0 flex-1 flex-col text-(length:--density-text-13)">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-(--density-6)">
            <span className="font-medium">{sender?.name}</span>
            <span className="truncate text-(length:--density-text-12) text-muted-foreground">
              {sender?.email}
            </span>
          </p>
          <p className="truncate text-(length:--density-text-12) text-muted-foreground">
            To {listNames(contacts, message.toIds)}
            {message.ccIds?.length
              ? `, cc ${listNames(contacts, message.ccIds)}`
              : ""}
          </p>
        </div>
        {/* The date is also the way to fold an earlier message back. */}
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={`Collapse the message from ${sender?.name ?? "unknown"}`}
            className="shrink-0 rounded-sm text-(length:--density-text-12) text-muted-foreground tabular-nums outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {date}
          </button>
        ) : (
          <time
            dateTime={new Date(message.sentAt).toISOString()}
            className="shrink-0 text-(length:--density-text-12) text-muted-foreground tabular-nums"
          >
            {date}
          </time>
        )}
      </header>
      <MessageBody body={message.body} />
      {message.attachments && message.attachments.length > 0 && (
        <ul
          aria-label="Attachments"
          className="flex flex-wrap gap-(--density-8)"
        >
          {message.attachments.map((attachment) => (
            <li key={attachment.name} className="w-64 max-w-full">
              <Attachment>
                <AttachmentMedia>
                  <FileTypeIcon name={attachment.name} className="size-6" />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{attachment.name}</AttachmentTitle>
                  <AttachmentDescription>
                    {attachment.size}
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function CollapsedMessage({
  message,
  contacts,
  timeFormat,
  onExpand,
}: {
  message: MailMessage
  contacts: MailContact[]
  timeFormat: TimeFormat
  onExpand: () => void
}) {
  const sender = findContact(contacts, message.fromId)
  return (
    <button
      type="button"
      onClick={onExpand}
      // Pulled out by its own padding, so its avatar and date line up with
      // the open message's.
      className="-mx-(--density-8) flex items-center gap-(--density-10) rounded-lg px-(--density-8) py-(--density-8) text-start text-(length:--density-text-13) outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MailAvatar contact={sender} />
      <span className="shrink-0 font-medium">{sender?.name}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {message.body.replace(/\s+/g, " ")}
      </span>
      <span className="shrink-0 text-(length:--density-text-12) text-muted-foreground tabular-nums">
        {formatMailDateTime(message.sentAt, timeFormat)}
      </span>
    </button>
  )
}

function ThreadActions({
  thread,
  snoozeOptions,
  onAction,
  onSnooze,
}: {
  thread: MailThread
  snoozeOptions: SnoozeOption[]
  onAction: (action: MailThreadAction) => void
  onSnooze: (until: number) => void
}) {
  const more: MailMenuGroup[] = [
    {
      id: "move",
      entries:
        thread.box === "spam"
          ? [
              {
                id: "not-spam",
                label: "Not spam",
                onSelect: () => onAction("notSpam"),
              },
            ]
          : [
              ...(thread.box === "inbox"
                ? []
                : [
                    {
                      id: "inbox",
                      label: "Move to inbox",
                      onSelect: () => onAction("moveToInbox"),
                    },
                  ]),
              {
                id: "spam",
                label: "Report spam",
                onSelect: () => onAction("spam"),
              },
            ],
    },
  ]

  return (
    <div className="-ms-(--density-6) flex items-center">
      {thread.box !== "archive" && (
        <MailIconButton label="Archive" onClick={() => onAction("archive")}>
          <IconPlaceholder
            lucide="ArchiveIcon"
            tabler="IconArchive"
            hugeicons="Archive02Icon"
            phosphor="ArchiveIcon"
            remixicon="RiArchiveLine"
          />
        </MailIconButton>
      )}
      <MailIconButton label="Delete" onClick={() => onAction("delete")}>
        <IconPlaceholder
          lucide="Trash2Icon"
          tabler="IconTrash"
          hugeicons="Delete02Icon"
          phosphor="TrashIcon"
          remixicon="RiDeleteBinLine"
        />
      </MailIconButton>
      <MailIconButton
        label={thread.isUnread ? "Mark as read" : "Mark as unread"}
        onClick={() => onAction("toggleUnread")}
      >
        <IconPlaceholder
          lucide="MailIcon"
          tabler="IconMail"
          hugeicons="Mail01Icon"
          phosphor="EnvelopeSimpleIcon"
          remixicon="RiMailLine"
        />
      </MailIconButton>
      <MailMenuButton
        label="Snooze"
        icon={
          <IconPlaceholder
            lucide="AlarmClockIcon"
            tabler="IconAlarm"
            hugeicons="AlarmClockIcon"
            phosphor="AlarmIcon"
            remixicon="RiAlarmLine"
          />
        }
        groups={[
          {
            id: "snooze",
            label: "Snooze until",
            entries: snoozeOptions.map((option) => ({
              id: option.id,
              label: option.label,
              detail: option.detail,
              onSelect: () => onSnooze(option.until),
            })),
          },
        ]}
      />
      <MailMenuButton
        label="More actions"
        icon={
          <IconPlaceholder
            lucide="EllipsisIcon"
            tabler="IconDots"
            hugeicons="MoreHorizontalIcon"
            phosphor="DotsThreeIcon"
            remixicon="RiMoreLine"
          />
        }
        groups={more}
      />
    </div>
  )
}

/**
 * The open thread: its subject and labels, earlier messages folded to one
 * line each and the latest open, then Reply, Reply all and Forward.
 */
export function MailThreadView({
  thread,
  contacts,
  now,
  timeFormat,
  snoozeOptions,
  onAction,
  onSnooze,
  onReply,
  onForward,
  onEditDraft,
}: {
  thread: MailThread | null
  contacts: MailContact[]
  now: number
  timeFormat: TimeFormat
  snoozeOptions: SnoozeOption[]
  onAction: (action: MailThreadAction) => void
  onSnooze: (until: number) => void
  onReply: (body: string, recipientIds: string[]) => void
  onForward: () => void
  onEditDraft: () => void
}) {
  const [expandedIds, setExpandedIds] = React.useState<string[]>([])
  const [replyMode, setReplyMode] = React.useState<ReplyMode | null>(null)

  if (!thread) {
    return (
      <>
        <AppShellPanelHeader>
          <AppShellPanelTitle>Conversation</AppShellPanelTitle>
          <AppShellPanelClose />
        </AppShellPanelHeader>
        <AppShellPanelContent className="flex">
          <Empty className="m-auto">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconPlaceholder
                  lucide="MailOpenIcon"
                  tabler="IconMailOpened"
                  hugeicons="MailOpen01Icon"
                  phosphor="EnvelopeOpenIcon"
                  remixicon="RiMailOpenLine"
                />
              </EmptyMedia>
              <EmptyTitle>No conversation open</EmptyTitle>
              <EmptyDescription>
                Pick one from the list to read it here. ↑ and ↓ move through the
                list.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </AppShellPanelContent>
      </>
    )
  }

  const latest = thread.messages.at(-1)
  const isDraft = thread.box === "drafts"
  const replyAllIds = latest ? getReplyAllIds(latest) : []
  const replyIds = latest
    ? latest.fromId === ME
      ? latest.toIds
      : [latest.fromId]
    : []
  const recipientIds = replyMode === "replyAll" ? replyAllIds : replyIds

  return (
    <>
      {/* The actions lead, as in most mail apps; the close stays at the end. */}
      <AppShellPanelHeader>
        <AppShellPanelTitle className="sr-only">
          {thread.subject}
        </AppShellPanelTitle>
        <ThreadActions
          thread={thread}
          snoozeOptions={snoozeOptions}
          onAction={onAction}
          onSnooze={onSnooze}
        />
        <AppShellPanelClose />
      </AppShellPanelHeader>
      <AppShellPanelContent className="flex flex-col gap-(--density-24) px-(--density-16) pt-(--density-8) pb-(--density-24)">
        <div className="flex flex-col gap-(--density-8)">
          <h2 className="text-[18px] leading-snug font-semibold text-balance">
            {thread.subject}
          </h2>
          {(thread.labels.length > 0 ||
            isDraft ||
            thread.snoozedUntil !== undefined) && (
            <div className="flex flex-wrap items-center gap-(--density-6)">
              {isDraft && <Badge variant="warning">Draft</Badge>}
              {thread.snoozedUntil !== undefined && (
                <Badge variant="info">
                  Snoozed until{" "}
                  {formatSnoozedUntil(thread.snoozedUntil, now, timeFormat)}
                </Badge>
              )}
              {thread.labels.map((labelId) => (
                <MailLabelBadge key={labelId} labelId={labelId} />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-(--density-8)">
          {thread.messages.map((message, index) => {
            const isLatest = index === thread.messages.length - 1
            return isLatest || expandedIds.includes(message.id) ? (
              <div key={message.id} className="not-first:pt-(--density-16)">
                <ExpandedMessage
                  message={message}
                  contacts={contacts}
                  timeFormat={timeFormat}
                  onCollapse={
                    isLatest
                      ? undefined
                      : () =>
                          setExpandedIds((ids) =>
                            ids.filter((id) => id !== message.id)
                          )
                  }
                />
              </div>
            ) : (
              <CollapsedMessage
                key={message.id}
                message={message}
                contacts={contacts}
                timeFormat={timeFormat}
                onExpand={() => setExpandedIds((ids) => [...ids, message.id])}
              />
            )
          })}
        </div>
        {isDraft ? (
          <div>
            <Button variant="outline" size="sm" onClick={onEditDraft}>
              <IconPlaceholder
                lucide="PencilIcon"
                tabler="IconPencil"
                hugeicons="PencilEdit01Icon"
                phosphor="PencilSimpleIcon"
                remixicon="RiPencilLine"
                data-icon="inline-start"
              />
              Continue writing
            </Button>
          </div>
        ) : replyMode ? (
          <MailReplyBox
            key={replyMode}
            label={replyMode === "replyAll" ? "Reply all" : "Reply"}
            recipients={listNames(contacts, recipientIds)}
            onDiscard={() => setReplyMode(null)}
            onSend={(body) => {
              onReply(body, recipientIds)
              setReplyMode(null)
            }}
          />
        ) : (
          <div className="flex flex-wrap gap-(--density-8)">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReplyMode("reply")}
            >
              <IconPlaceholder
                lucide="ReplyIcon"
                tabler="IconArrowBackUp"
                hugeicons="MailReply01Icon"
                phosphor="ArrowBendUpLeftIcon"
                remixicon="RiReplyLine"
                data-icon="inline-start"
              />
              Reply
            </Button>
            {replyAllIds.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplyMode("replyAll")}
              >
                <IconPlaceholder
                  lucide="ReplyAllIcon"
                  tabler="IconArrowBackUpDouble"
                  hugeicons="MailReplyAll01Icon"
                  phosphor="ArrowBendDoubleUpLeftIcon"
                  remixicon="RiReplyAllLine"
                  data-icon="inline-start"
                />
                Reply all
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onForward}>
              <IconPlaceholder
                lucide="ForwardIcon"
                tabler="IconArrowForwardUp"
                hugeicons="MailSend01Icon"
                phosphor="ArrowBendUpRightIcon"
                remixicon="RiShareForwardLine"
                data-icon="inline-start"
              />
              Forward
            </Button>
          </div>
        )}
      </AppShellPanelContent>
    </>
  )
}
