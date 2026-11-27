"use client"

import * as React from "react"
import { cn } from "cn"

import { MessengerAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import {
  MessengerMessageMenu,
  MessengerMessageToolbar,
  type MessengerMenuEntry,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-controls"
import {
  ReplyIcon,
  RetryIcon,
  WarningIcon,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import {
  MessengerMessageBody,
  type Photo,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-message-body"
import {
  canReact,
  formatClock,
  getMessageActions,
  ME,
  type ChatMessage,
  type MessageActionId,
  type Person,
  type RunPosition,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/registry/bases/__base__/ui/message"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** What a person does to a message; the page decides what happens. */
export type MessengerMessageHandlers = {
  onAction: (action: MessageActionId, message: ChatMessage) => void
  onReact: (message: ChatMessage, emoji: string) => void
  onOpenPhoto: (photo: Photo) => void
  onDownload: (name: string) => void
}

const ACTIONS: Record<
  MessageActionId,
  { label: string; icon: React.ReactNode; isInToolbar?: boolean }
> = {
  reply: { label: "Reply", icon: <ReplyIcon />, isInToolbar: true },
  retry: { label: "Retry", icon: <RetryIcon /> },
  copy: {
    label: "Copy text",
    isInToolbar: true,
    icon: (
      <IconPlaceholder
        lucide="CopyIcon"
        tabler="IconCopy"
        hugeicons="Copy01Icon"
        phosphor="CopyIcon"
        remixicon="RiFileCopyLine"
      />
    ),
  },
  unread: {
    label: "Mark as unread",
    icon: (
      <IconPlaceholder
        lucide="MailIcon"
        tabler="IconMail"
        hugeicons="MailIcon"
        phosphor="EnvelopeIcon"
        remixicon="RiMailLine"
      />
    ),
  },
  delete: {
    label: "Delete message",
    icon: (
      <IconPlaceholder
        lucide="Trash2Icon"
        tabler="IconTrash"
        hugeicons="Delete02Icon"
        phosphor="TrashIcon"
        remixicon="RiDeleteBinLine"
      />
    ),
  },
}

/**
 * One message of a run. The pointer or focus brings its actions up beside the
 * bubble; a long press, a right click or Enter opens them all as a menu.
 */
export function MessengerMessage({
  message,
  original,
  sender,
  people,
  position,
  isTabStop,
  showsSender,
  receipt,
  timeFormat,
  handlers,
  onShowOriginal,
  onFocus,
}: {
  message: ChatMessage
  original: ChatMessage | undefined
  sender: Person | undefined
  people: Person[]
  position: RunPosition
  isTabStop: boolean
  /** In a group, people get a name over their run and a picture at its foot. */
  showsSender: boolean
  receipt: string | undefined
  timeFormat: TimeFormat
  handlers: MessengerMessageHandlers
  onShowOriginal: (id: string) => void
  onFocus: () => void
}) {
  const [isHovered, setHovered] = React.useState(false)
  const [isFocused, setFocused] = React.useState(false)
  const [isMenuOpen, setMenuOpen] = React.useState(false)
  const isMine = message.senderId === ME
  const isLast = position === "last" || position === "only"
  const isFirst = position === "first" || position === "only"
  const isFailed = message.status === "failed"
  const senderName = isMine ? "you" : (sender?.name ?? "Someone")
  const clock = formatClock(message.sentAt, timeFormat)
  const entries: MessengerMenuEntry[] = getMessageActions(message).map(
    (id) => ({
      id,
      label: ACTIONS[id].label,
      icon: ACTIONS[id].icon,
      isInToolbar: ACTIONS[id].isInToolbar,
      isDestructive: id === "delete",
      onSelect: () => handlers.onAction(id, message),
    })
  )
  const react = (emoji: string) => handlers.onReact(message, emoji)

  return (
    <MessengerMessageMenu
      entries={entries}
      onReact={canReact(message) ? react : undefined}
    >
      <Message
        align={isMine ? "end" : "start"}
        role="article"
        aria-label={`${isMine ? "You" : senderName}, ${clock}`}
        data-messenger-message={message.id}
        tabIndex={isTabStop ? 0 : -1}
        onPointerEnter={(event) => setHovered(event.pointerType === "mouse")}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => {
          setFocused(true)
          onFocus()
        }}
        onBlur={(event) =>
          setFocused(event.currentTarget.contains(event.relatedTarget))
        }
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.target !== event.currentTarget)
            return
          event.preventDefault()
          const row = event.currentTarget
          const anchor = row.querySelector('[data-slot="bubble"]') ?? row
          const { left, bottom } = anchor.getBoundingClientRect()
          row.dispatchEvent(
            new MouseEvent("contextmenu", {
              bubbles: true,
              cancelable: true,
              clientX: left,
              clientY: bottom,
            })
          )
        }}
        className="rounded-(--radius-control) outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {showsSender && (
          <MessageAvatar
            aria-hidden
            className="group-has-data-[slot=bubble-reactions]/message:-translate-y-[calc(var(--density-24)+var(--density-20))]!"
          >
            {isLast && (
              <MessengerAvatar name={senderName} src={sender?.avatar} />
            )}
          </MessageAvatar>
        )}
        <MessageContent>
          {showsSender && isFirst && (
            <MessageHeader>{senderName}</MessageHeader>
          )}
          <MessengerMessageBody
            message={message}
            original={original}
            people={people}
            position={position}
            senderName={senderName}
            onReact={react}
            onOpenPhoto={handlers.onOpenPhoto}
            onDownload={handlers.onDownload}
            onShowOriginal={onShowOriginal}
          >
            {(isHovered || isFocused || isMenuOpen) && (
              <MessengerMessageToolbar
                entries={entries}
                onReact={canReact(message) ? react : undefined}
                onOpenChange={setMenuOpen}
                className={cn(
                  "absolute top-1/2 hidden -translate-y-1/2 px-(--density-4) @xl/transcript:flex pointer-coarse:hidden",
                  isMine ? "end-full" : "start-full"
                )}
              />
            )}
          </MessengerMessageBody>
          {isFailed && (
            <MessageFooter className="px-0">
              <span className="flex items-center gap-(--density-4) text-destructive-text [&_svg]:size-(--density-icon-14)">
                <WarningIcon />
                Not delivered
              </span>
              <Button
                variant="outline"
                size="xs"
                className="pointer-coarse:min-h-11 pointer-coarse:px-3"
                onClick={() => handlers.onAction("retry", message)}
              >
                Retry
              </Button>
            </MessageFooter>
          )}
          {isLast && !isFailed && (
            <MessageFooter>
              <span>
                <time dateTime={new Date(message.sentAt).toISOString()}>
                  {clock}
                </time>
                {receipt && ` · ${receipt}`}
              </span>
            </MessageFooter>
          )}
        </MessageContent>
      </Message>
    </MessengerMessageMenu>
  )
}
