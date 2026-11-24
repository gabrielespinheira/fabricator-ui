"use client"

import {
  MailIconButton,
  MailMenuButton,
  type MailMenuGroup,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import { getSnoozeMenu } from "@/registry/bases/__base__/blocks/mail-01/components/mail-list-toolbar"
import {
  canApplyMailAction,
  type MailThread,
  type SnoozeOption,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"

export type MailThreadAction =
  | "archive"
  | "delete"
  | "toggleUnread"
  | "spam"
  | "moveToInbox"
  | "toggleStar"

function getMoreMenu(
  thread: MailThread,
  {
    onAction,
    onReplyAll,
    onForward,
  }: {
    onAction: (action: MailThreadAction) => void
    onReplyAll?: () => void
    onForward: () => void
  }
): MailMenuGroup[] {
  const writing = {
    id: "write",
    entries: [
      ...(onReplyAll
        ? [
            {
              id: "reply-all",
              label: "Reply all",
              icon: mailIcons.replyAll,
              detail: "A",
              onSelect: onReplyAll,
            },
          ]
        : []),
      {
        id: "forward",
        label: "Forward",
        icon: mailIcons.forward,
        detail: "F",
        onSelect: onForward,
      },
    ],
  }
  const moving = {
    id: "move",
    entries: [
      {
        id: "star",
        label: thread.isStarred ? "Remove star" : "Star",
        icon: mailIcons.star,
        detail: "S",
        onSelect: () => onAction("toggleStar"),
      },
      ...(canApplyMailAction(thread, "moveToInbox")
        ? [
            {
              id: "inbox",
              label: thread.box === "spam" ? "Not spam" : "Move to inbox",
              icon: mailIcons.inbox,
              onSelect: () => onAction("moveToInbox"),
            },
          ]
        : []),
      ...(canApplyMailAction(thread, "spam")
        ? [
            {
              id: "spam",
              label: "Report spam",
              icon: mailIcons.spam,
              onSelect: () => onAction("spam"),
            },
          ]
        : []),
    ],
  }
  return thread.box === "drafts" ? [moving] : [writing, moving]
}

/** What can be done with the open thread, and the way to the ones around it. */
export function MailThreadHeader({
  thread,
  position,
  isPhone,
  snoozeOptions,
  onAction,
  onSnooze,
  onReplyAll,
  onForward,
  onMove,
}: {
  thread: MailThread
  position: { place: number; total: number } | null
  isPhone: boolean
  snoozeOptions: SnoozeOption[]
  onAction: (action: MailThreadAction) => void
  onSnooze: (until: number) => void
  onReplyAll?: () => void
  onForward: () => void
  onMove: (direction: "next" | "previous") => void
}) {
  return (
    <>
      <div className="flex shrink-0 items-center">
        {canApplyMailAction(thread, "archive") && (
          <MailIconButton
            label="Archive"
            shortcut="E"
            onClick={() => onAction("archive")}
          >
            {mailIcons.archive}
          </MailIconButton>
        )}
        {canApplyMailAction(thread, "delete") && (
          <MailIconButton
            label="Delete"
            shortcut="#"
            onClick={() => onAction("delete")}
          >
            {mailIcons.trash}
          </MailIconButton>
        )}
        <MailIconButton
          label={thread.isUnread ? "Mark as read" : "Mark as unread"}
          shortcut="U"
          onClick={() => onAction("toggleUnread")}
        >
          {thread.isUnread ? mailIcons.read : mailIcons.unread}
        </MailIconButton>
        {canApplyMailAction(thread, "snooze") && (
          <MailMenuButton
            label="Snooze"
            icon={mailIcons.snooze}
            align="start"
            groups={getSnoozeMenu(snoozeOptions, onSnooze)}
          />
        )}
      </div>
      <div className="ms-auto flex shrink-0 items-center">
        {position && !isPhone && (
          <>
            <span className="pe-(--density-8) text-(length:--density-text-12) text-muted-foreground tabular-nums">
              {position.place} of {position.total}
            </span>
            <MailIconButton
              label="Previous conversation"
              shortcut="K"
              isDisabled={position.place === 1}
              onClick={() => onMove("previous")}
            >
              {mailIcons.previous}
            </MailIconButton>
            <MailIconButton
              label="Next conversation"
              shortcut="J"
              isDisabled={position.place === position.total}
              onClick={() => onMove("next")}
            >
              {mailIcons.next}
            </MailIconButton>
          </>
        )}
        <MailMenuButton
          label="More actions"
          icon={mailIcons.more}
          groups={getMoreMenu(thread, { onAction, onReplyAll, onForward })}
        />
      </div>
    </>
  )
}
