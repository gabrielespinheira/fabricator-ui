"use client"

import * as React from "react"
import { cn } from "cn"

import { MailAvatar } from "@/registry/bases/__base__/blocks/mail-01/components/mail-avatar"
import {
  MailCheckbox,
  MailIconButton,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import { MAIL_LABELS } from "@/registry/bases/__base__/blocks/mail-01/lib/mail-data"
import {
  canApplyMailAction,
  findContact,
  formatMailTime,
  formatSnoozedUntil,
  getAdjacentId,
  getLatestAt,
  getParticipants,
  getSnippet,
  ME,
  type MailContact,
  type MailReplyDraft,
  type MailThread,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/__base__/lib/fluid-hover"
import { Skeleton } from "@/registry/bases/__base__/ui/skeleton"

export type MailRowAction = "archive" | "delete" | "toggleUnread"

type ListProps = {
  threads: MailThread[]
  contacts: MailContact[]
  replyDrafts: Record<string, MailReplyDraft>
  openId: string | null
  selectedIds: string[]
  now: number
  timeFormat: TimeFormat
  listRef: React.Ref<HTMLUListElement>
  /** ↑ and ↓ show a thread and keep the list in view. */
  onSelect: (id: string) => void
  /** A press or Enter opens it, which on a phone leaves the list. */
  onOpen: (id: string) => void
  onToggleSelected: (id: string) => void
  onClearSelection: () => void
  onStar: (id: string, isStarred: boolean) => void
  onAction: (id: string, action: MailRowAction) => void
}

/** The threads' labels as dots; their names are in the dots' tooltip. */
function LabelDots({ thread }: { thread: MailThread }) {
  const labels = MAIL_LABELS.filter(({ id }) => thread.labels.includes(id))
  if (labels.length === 0) return null
  const names = labels.map(({ name }) => name).join(", ")
  return (
    <span
      title={names}
      // Above the row's press area, so the pointer reaches the tooltip.
      className="relative z-10 flex shrink-0 items-center gap-(--density-4) py-(--density-4)"
    >
      <span className="sr-only">, labelled {names}</span>
      {labels.map(({ id, dot }) => (
        <span key={id} aria-hidden className={cn("size-2 rounded-full", dot)} />
      ))}
    </span>
  )
}

function getSenderLabel({
  isDraft,
  isFromMe,
  recipient,
  participants,
}: {
  isDraft: boolean
  isFromMe: boolean
  recipient: string | undefined
  participants: string
}) {
  if (isDraft) return recipient ? `Draft to ${recipient}` : "Draft"
  if (isFromMe) return `To ${recipient ?? "me"}`
  return participants
}

function ThreadRow({
  thread,
  contacts,
  replyDraft,
  isOpen,
  isChecked,
  isTabStop,
  now,
  timeFormat,
  onOpen,
  onToggleSelected,
  onStar,
  onAction,
}: Pick<
  ListProps,
  | "contacts"
  | "now"
  | "timeFormat"
  | "onOpen"
  | "onToggleSelected"
  | "onStar"
  | "onAction"
> & {
  thread: MailThread
  replyDraft: MailReplyDraft | undefined
  isOpen: boolean
  isChecked: boolean
  isTabStop: boolean
}) {
  // The picture is the last person who wrote other than you; mail only
  // you wrote shows who it went to.
  const lastFromOthers = thread.messages.findLast(({ fromId }) => fromId !== ME)
  const isFromMe = lastFromOthers === undefined
  const contact = findContact(
    contacts,
    lastFromOthers?.fromId ?? thread.messages.at(-1)?.toIds[0] ?? ME
  )
  const participants = getParticipants(thread, contacts)
  const hasAttachments = thread.messages.some(
    ({ attachments }) => (attachments?.length ?? 0) > 0
  )
  const sender = getSenderLabel({
    isDraft: thread.box === "drafts",
    isFromMe,
    recipient: thread.messages.at(-1)?.toIds.length ? contact?.name : undefined,
    participants: participants.label,
  })
  const draftText = replyDraft?.body.trim()

  return (
    <li
      data-thread={thread.id}
      data-open={isOpen}
      data-checked={isChecked ? "" : undefined}
      data-unread={thread.isUnread ? "" : undefined}
      className="group/row relative flex scroll-my-(--density-12) items-center gap-(--density-10) rounded-(--radius-control) py-(--density-8) ps-(--density-10) pe-(--density-10) data-checked:bg-hover"
    >
      {thread.isUnread && (
        <span
          aria-hidden
          className="absolute start-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      {/* The avatar turns into the row's checkbox under the pointer, with the
          keyboard and while rows are selected. By touch, tapping it selects. */}
      <div className="relative z-10 grid size-(--density-32) shrink-0 place-items-center *:col-start-1 *:row-start-1">
        <MailAvatar
          contact={contact}
          className="transition-opacity duration-feedback ease-feedback group-hover/row:opacity-0 group-has-[[data-thread-open]:focus-visible,[data-slot=checkbox]:focus-visible]/row:opacity-0 group-data-selecting/list:opacity-0"
        />
        <MailCheckbox
          checked={isChecked}
          isFocusable={isTabStop}
          onCheckedChange={() => onToggleSelected(thread.id)}
          label={`Select “${thread.subject}”`}
          className="opacity-0 group-hover/row:opacity-100 group-has-[[data-thread-open]:focus-visible]/row:opacity-100 group-data-selecting/list:opacity-100 after:-inset-(--density-12) focus-visible:opacity-100"
        />
      </div>
      <button
        type="button"
        data-thread-open={thread.id}
        tabIndex={isTabStop ? 0 : -1}
        aria-current={isOpen ? "true" : undefined}
        onClick={() => onOpen(thread.id)}
        className="flex min-w-0 flex-1 cursor-pointer flex-col gap-(--density-2) text-start text-(length:--density-text-13) outline-none after:absolute after:inset-0 after:rounded-(--radius-control) focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
      >
        <span className="flex w-full min-w-0 items-center gap-(--density-6)">
          {thread.isUnread && <span className="sr-only">Unread, </span>}
          <span className="min-w-0 truncate group-data-unread/row:font-medium">
            {sender}
          </span>
          {participants.count > 1 && (
            <span className="shrink-0 text-(length:--density-text-12) text-muted-foreground tabular-nums group-data-[open=true]/row:text-foreground/70">
              <span className="sr-only">, </span>
              {participants.count}
              <span className="sr-only"> messages</span>
            </span>
          )}
          <span className="ms-auto flex shrink-0 items-center justify-end gap-(--density-6) ps-(--density-8) text-(length:--density-text-12) text-muted-foreground group-hover/row:invisible group-hover/row:min-w-28 group-data-selecting/list:visible group-data-unread/row:text-foreground group-data-[open=true]/row:text-foreground/70 [&_svg]:size-3.5">
            {hasAttachments && (
              <span className="flex text-muted-foreground">
                {mailIcons.attach}
                <span className="sr-only">, has attachments</span>
              </span>
            )}
            {thread.snoozedUntil === undefined ? (
              <time
                dateTime={new Date(getLatestAt(thread)).toISOString()}
                className="tabular-nums"
              >
                {formatMailTime(getLatestAt(thread), now, timeFormat)}
              </time>
            ) : (
              <span className="tabular-nums">
                <span className="sr-only">Snoozed until </span>
                <span className="inline-block first-letter:uppercase">
                  {formatSnoozedUntil(thread.snoozedUntil, now, timeFormat)}
                </span>
              </span>
            )}
          </span>
        </span>
        <span className="flex w-full min-w-0 items-center gap-(--density-8) in-data-[size=phone]:items-end">
          {/* On a phone a subject is read here, so it gets a second line. */}
          <span className="min-w-0 flex-1 truncate text-muted-foreground group-data-[open=true]/row:text-foreground/70 in-data-[size=phone]:line-clamp-2 in-data-[size=phone]:whitespace-normal">
            <span className="text-foreground group-data-unread/row:font-medium">
              {thread.subject}
            </span>
            <span className="sr-only">. </span>
            <span aria-hidden>{" "}</span>
            {draftText ? (
              <>
                <span className="text-foreground">Draft:</span> {draftText}
              </>
            ) : (
              getSnippet(thread)
            )}
          </span>
          <LabelDots thread={thread} />
          {thread.isStarred && (
            <span className="flex shrink-0 text-foreground group-hover/row:invisible group-data-selecting/list:visible [&_svg]:size-3.5 [&_svg]:fill-current">
              {mailIcons.star}
              <span className="sr-only">, starred</span>
            </span>
          )}
        </span>
      </button>
      {/* Pointer shortcuts. The keyboard has E, #, U and S, touch has the
          thread's own header, so these stay out of the tab order. */}
      <div className="absolute end-(--density-4) top-(--density-4) z-10 hidden items-center group-hover/row:flex group-data-selecting/list:hidden">
        <MailIconButton
          label={thread.isStarred ? "Remove star" : "Star"}
          shortcut="S"
          isPressed={thread.isStarred}
          isFocusable={false}
          onClick={() => onStar(thread.id, !thread.isStarred)}
          className={cn(thread.isStarred && "[&_svg]:fill-current")}
        >
          {mailIcons.star}
        </MailIconButton>
        {canApplyMailAction(thread, "archive") && (
          <MailIconButton
            label="Archive"
            shortcut="E"
            isFocusable={false}
            onClick={() => onAction(thread.id, "archive")}
          >
            {mailIcons.archive}
          </MailIconButton>
        )}
        {canApplyMailAction(thread, "delete") && (
          <MailIconButton
            label="Delete"
            shortcut="#"
            isFocusable={false}
            onClick={() => onAction(thread.id, "delete")}
          >
            {mailIcons.trash}
          </MailIconButton>
        )}
        <MailIconButton
          label={thread.isUnread ? "Mark as read" : "Mark as unread"}
          shortcut="U"
          isFocusable={false}
          onClick={() => onAction(thread.id, "toggleUnread")}
        >
          {thread.isUnread ? mailIcons.read : mailIcons.unread}
        </MailIconButton>
      </div>
    </li>
  )
}

/**
 * The threads: the open one is selected, ↑ and ↓ move through them, Home and
 * End jump to the ends, and one highlight glides to the row under the
 * pointer. The letter shortcuts are the page's (see useMailShortcuts).
 */
export function MailThreadList({
  threads,
  replyDrafts,
  openId,
  selectedIds,
  listRef,
  onSelect,
  onOpen,
  onClearSelection,
  ...rowProps
}: ListProps) {
  const fluid = useFluidHover<HTMLUListElement>({
    items: "[data-thread]",
    selected: '[data-thread][data-open="true"]',
    gapClick: false,
  })
  const mergedRef = useMergedRef(fluid.attach, listRef)
  const ids = threads.map(({ id }) => id)
  const tabStopId = openId && ids.includes(openId) ? openId : ids[0]

  const moveTo = (list: HTMLElement, id: string | undefined) => {
    if (!id) return
    onSelect(id)
    list.querySelector<HTMLElement>(`[data-thread-open="${id}"]`)?.focus()
  }

  return (
    <ul
      ref={mergedRef}
      aria-label="Conversations"
      data-selecting={selectedIds.length > 0 ? "" : undefined}
      {...fluid.props}
      onKeyDown={(event) => {
        const row =
          event.target instanceof Element
            ? event.target.closest("[data-thread]")?.getAttribute("data-thread")
            : null
        if (event.key === "Escape" && selectedIds.length > 0) {
          event.preventDefault()
          onClearSelection()
          return
        }
        if (!row || event.metaKey || event.ctrlKey || event.altKey) return
        const targets: Record<string, () => string | undefined> = {
          ArrowDown: () => getAdjacentId(ids, row, "next"),
          ArrowUp: () => getAdjacentId(ids, row, "previous"),
          Home: () => ids[0],
          End: () => ids.at(-1),
        }
        const target = targets[event.key]
        if (!target) return
        event.preventDefault()
        moveTo(event.currentTarget, target())
      }}
      className="group/list relative isolate flex flex-col gap-px"
    >
      <FluidHoverSelection selection={fluid.selection} />
      <FluidHoverHighlight hover={fluid.hover} />
      {threads.map((thread) => (
        <ThreadRow
          key={thread.id}
          thread={thread}
          replyDraft={replyDrafts[thread.id]}
          isOpen={thread.id === openId}
          isChecked={selectedIds.includes(thread.id)}
          isTabStop={thread.id === tabStopId}
          onOpen={onOpen}
          {...rowProps}
        />
      ))}
    </ul>
  )
}

const SKELETON_ROWS = 8

/** The list while an account's mail loads, at the size its rows will have. */
export function MailThreadListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading mail"
      className="flex flex-col gap-(--density-8) px-(--density-10) py-(--density-4)"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton
          key={index}
          className="h-(--density-48) rounded-(--radius-control)"
        />
      ))}
    </div>
  )
}
