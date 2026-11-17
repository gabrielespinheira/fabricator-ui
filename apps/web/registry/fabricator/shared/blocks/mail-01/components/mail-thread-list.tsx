"use client"

import * as React from "react"
import { cn } from "cn"

import { MailAvatar } from "@/registry/bases/__base__/blocks/mail-01/components/mail-avatar"
import {
  MailCheckbox,
  MailIconButton,
  MailStarToggle,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { MAIL_LABELS } from "@/registry/bases/__base__/blocks/mail-01/lib/mail-data"
import {
  findContact,
  formatMailTime,
  getAdjacentId,
  getLatestAt,
  getParticipants,
  getSnippet,
  ME,
  type MailContact,
  type MailThread,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/__base__/lib/fluid-hover"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export type MailRowAction = "archive" | "delete" | "toggleUnread"

type ListProps = {
  threads: MailThread[]
  contacts: MailContact[]
  openId: string | null
  selectedIds: string[]
  now: number
  timeFormat: TimeFormat
  /** ↑ and ↓ show a thread and keep the list in view. */
  onSelect: (id: string) => void
  /** A press or Enter opens it, which on a phone leaves the list. */
  onOpen: (id: string) => void
  onToggleSelected: (id: string) => void
  onStar: (id: string, isStarred: boolean) => void
  onAction: (id: string, action: MailRowAction) => void
}

export function MailLabelBadge({ labelId }: { labelId: string }) {
  const label = MAIL_LABELS.find(({ id }) => id === labelId)
  if (!label) return null
  return (
    <Badge variant="outline" className="shrink-0 gap-(--density-6)">
      <span aria-hidden className={cn("size-1.5 rounded-full", label.dot)} />
      {label.name}
    </Badge>
  )
}

const starIcon = (
  <IconPlaceholder
    lucide="StarIcon"
    tabler="IconStar"
    hugeicons="StarIcon"
    phosphor="StarIcon"
    remixicon="RiStarLine"
    className="group-aria-pressed/star:fill-current group-data-pressed/star:fill-current"
  />
)

function ThreadRow({
  thread,
  contacts,
  isOpen,
  isChecked,
  isTabStop,
  now,
  timeFormat,
  onOpen,
  onToggleSelected,
  onStar,
  onAction,
}: Omit<ListProps, "threads" | "openId" | "selectedIds" | "onSelect"> & {
  thread: MailThread
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
  const isDraft = thread.box === "drafts"
  const sender = isDraft
    ? "Draft"
    : isFromMe
      ? `To: ${contact?.name ?? ""}`
      : participants.label

  return (
    <li
      data-thread={thread.id}
      data-open={isOpen}
      data-checked={isChecked ? "" : undefined}
      className="group/row relative flex items-start gap-(--density-10) rounded-lg px-(--density-8) py-(--density-10) data-checked:bg-hover"
    >
      <MailCheckbox
        checked={isChecked}
        onCheckedChange={() => onToggleSelected(thread.id)}
        label={`Select “${thread.subject}”`}
        className="relative z-10 mt-(--density-10)"
      />
      {/* The row opens the thread from anywhere on it; the checkbox, the star
          and the quick actions sit above that. */}
      <button
        type="button"
        data-thread-open={thread.id}
        tabIndex={isTabStop ? 0 : -1}
        aria-current={isOpen ? "true" : undefined}
        onClick={() => onOpen(thread.id)}
        className="flex min-w-0 flex-1 items-start gap-(--density-10) text-start outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
      >
        <MailAvatar contact={contact} className="shrink-0" />
        <span
          data-unread={thread.isUnread ? "" : undefined}
          className="group/text flex min-w-0 flex-1 flex-col gap-(--density-2) text-(length:--density-text-13)"
        >
          <span className="flex min-w-0 items-center gap-(--density-6)">
            {thread.isUnread && (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-primary"
              />
            )}
            <span className="sr-only">{thread.isUnread ? "Unread, " : ""}</span>
            <span
              className={cn(
                "min-w-0 truncate group-data-unread/text:font-medium",
                isDraft && "text-destructive-text"
              )}
            >
              {sender}
            </span>
            {participants.count > 1 && (
              <span className="shrink-0 text-muted-foreground tabular-nums group-data-[open=true]/row:text-foreground">
                <span className="sr-only">, </span>
                {participants.count}
                <span className="sr-only"> messages</span>
              </span>
            )}
            {hasAttachments && (
              <IconPlaceholder
                lucide="PaperclipIcon"
                tabler="IconPaperclip"
                hugeicons="Attachment01Icon"
                phosphor="PaperclipIcon"
                remixicon="RiAttachment2"
                role="img"
                aria-label="Has attachments"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            )}
            <time
              dateTime={new Date(getLatestAt(thread)).toISOString()}
              className="ms-auto shrink-0 ps-(--density-8) text-(length:--density-text-12) text-muted-foreground tabular-nums group-data-unread/text:text-foreground group-data-[open=true]/row:text-foreground"
            >
              {formatMailTime(getLatestAt(thread), now, timeFormat)}
            </time>
          </span>
          <span className="truncate pe-(--density-32) group-data-unread/text:font-medium">
            {thread.subject}
          </span>
          <span className="flex min-w-0 items-center gap-(--density-6) pe-(--density-32)">
            {/* Grey text darkens with the open row, as a table's cells do
                with the row under the pointer, so it reads on the wash. */}
            <span className="min-w-0 flex-1 truncate text-muted-foreground group-data-[open=true]/row:text-foreground">
              {getSnippet(thread)}
            </span>
            {thread.labels.slice(0, 2).map((labelId) => (
              <MailLabelBadge key={labelId} labelId={labelId} />
            ))}
          </span>
        </span>
      </button>
      <MailStarToggle
        pressed={thread.isStarred}
        onPressedChange={(pressed) => onStar(thread.id, pressed)}
        label={`Star “${thread.subject}”`}
        className="group/star absolute end-(--density-4) top-(--density-32) z-10"
      >
        {starIcon}
      </MailStarToggle>
      {/* Pointer shortcuts. The keyboard has the same actions in the toolbar,
          the thread and E, # and U, so these stay out of the tab order. */}
      <div className="absolute end-(--density-8) top-(--density-6) z-10 hidden items-center rounded-lg bg-surface-4 shadow-surface-4 group-hover/row:flex">
        <MailIconButton
          label="Archive"
          isFocusable={false}
          onClick={() => onAction(thread.id, "archive")}
        >
          <IconPlaceholder
            lucide="ArchiveIcon"
            tabler="IconArchive"
            hugeicons="Archive02Icon"
            phosphor="ArchiveIcon"
            remixicon="RiArchiveLine"
          />
        </MailIconButton>
        <MailIconButton
          label="Delete"
          isFocusable={false}
          onClick={() => onAction(thread.id, "delete")}
        >
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
          isFocusable={false}
          onClick={() => onAction(thread.id, "toggleUnread")}
        >
          {thread.isUnread ? (
            <IconPlaceholder
              lucide="MailOpenIcon"
              tabler="IconMailOpened"
              hugeicons="MailOpen01Icon"
              phosphor="EnvelopeOpenIcon"
              remixicon="RiMailOpenLine"
            />
          ) : (
            <IconPlaceholder
              lucide="MailIcon"
              tabler="IconMail"
              hugeicons="Mail01Icon"
              phosphor="EnvelopeSimpleIcon"
              remixicon="RiMailLine"
            />
          )}
        </MailIconButton>
      </div>
    </li>
  )
}

/**
 * The threads: the open one is selected, ↑ and ↓ move through them, Home and
 * End jump to the ends, and one highlight glides to the row under the
 * pointer. E archives, # deletes, U marks unread and S stars the focused row.
 */
export function MailThreadList({
  threads,
  openId,
  selectedIds,
  onSelect,
  onOpen,
  onAction,
  onStar,
  ...rowProps
}: ListProps) {
  const listRef = React.useRef<HTMLUListElement>(null)
  const fluid = useFluidHover<HTMLUListElement>({
    items: "[data-thread]",
    selected: '[data-thread][data-open="true"]',
    gapClick: false,
  })
  const mergedRef = useMergedRef(fluid.attach, listRef)
  const ids = threads.map(({ id }) => id)
  const tabStopId = openId && ids.includes(openId) ? openId : ids[0]

  const focusRow = (id: string | undefined) => {
    if (!id) return
    onSelect(id)
    listRef.current
      ?.querySelector<HTMLElement>(`[data-thread-open="${id}"]`)
      ?.focus()
  }

  return (
    <ul
      ref={mergedRef}
      aria-label="Conversations"
      aria-keyshortcuts="E Shift+3 U S"
      {...fluid.props}
      onKeyDown={(event) => {
        // Keys act on the focused row's controls, never on text being typed.
        if (!(event.target instanceof HTMLButtonElement)) return
        const row = event.target
          .closest("[data-thread]")
          ?.getAttribute("data-thread")
        if (!row) return
        const thread = threads.find(({ id }) => id === row)
        const move =
          event.key === "ArrowDown"
            ? "next"
            : event.key === "ArrowUp"
              ? "previous"
              : null
        if (move) {
          event.preventDefault()
          focusRow(getAdjacentId(ids, row, move))
          return
        }
        if (event.key === "Home" || event.key === "End") {
          event.preventDefault()
          focusRow(event.key === "Home" ? ids[0] : ids.at(-1))
          return
        }
        if (event.metaKey || event.ctrlKey || event.altKey) return
        if (event.key === "e") onAction(row, "archive")
        else if (event.key === "#" || event.key === "Delete")
          onAction(row, "delete")
        else if (event.key === "u") onAction(row, "toggleUnread")
        else if (event.key === "s" && thread) onStar(row, !thread.isStarred)
      }}
      className="relative isolate flex flex-col gap-px"
    >
      <FluidHoverSelection selection={fluid.selection} />
      <FluidHoverHighlight hover={fluid.hover} />
      {threads.map((thread) => (
        <ThreadRow
          key={thread.id}
          thread={thread}
          isOpen={thread.id === openId}
          isChecked={selectedIds.includes(thread.id)}
          isTabStop={thread.id === tabStopId}
          onOpen={onOpen}
          onAction={onAction}
          onStar={onStar}
          {...rowProps}
        />
      ))}
    </ul>
  )
}
