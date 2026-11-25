"use client"

import * as React from "react"

import { MessengerConversationAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import {
  SearchIcon,
  WarningIcon,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import {
  formatListTime,
  getAdjacentId,
  getMessagePreview,
  getVisibleUnread,
  type Conversation,
  type Person,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/__base__/lib/fluid-hover"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type ListProps = {
  conversations: Conversation[]
  people: Person[]
  openId: string
  /** The open conversation isn't on screen: a phone is showing the list. */
  isAway: boolean
  /** Who is typing in each conversation. */
  typing: Record<string, string | undefined>
  query: string
  now: number
  timeFormat: TimeFormat
  /** ↑ and ↓ show a conversation and keep the list in view. */
  onSelect: (id: string) => void
  /** A press or Enter opens it, which on a phone leaves the list. */
  onOpen: (id: string) => void
  onClearQuery: () => void
}

function findPerson(people: Person[], id: string) {
  return people.find((person) => person.id === id)
}

function ConversationRow({
  conversation,
  people,
  unreadCount,
  isSelected,
  isTabStop,
  typingName,
  now,
  timeFormat,
  onOpen,
}: {
  conversation: Conversation
  people: Person[]
  unreadCount: number
  isSelected: boolean
  isTabStop: boolean
  typingName: string | undefined
  now: number
  timeFormat: TimeFormat
  onOpen: (id: string) => void
}) {
  const last = conversation.messages.at(-1)
  const members = conversation.memberIds.flatMap(
    (id) => findPerson(people, id) ?? []
  )
  const contact = conversation.kind === "direct" ? members[0] : undefined
  const hasUnread = unreadCount > 0
  const isFailed = last?.status === "failed"
  const preview = last
    ? getMessagePreview(last, {
        isGroup: conversation.kind === "group",
        people,
      })
    : "No messages yet"

  return (
    <Item
      size="sm"
      role="option"
      aria-selected={isSelected}
      data-conversation={conversation.id}
      tabIndex={isTabStop ? 0 : -1}
      onClick={() => onOpen(conversation.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        onOpen(conversation.id)
      }}
      className="cursor-default flex-nowrap gap-(--density-10) px-(--density-8) focus-visible:ring-inset"
    >
      {/* The row reads as its name, time and preview; the picture is decoration. */}
      <ItemMedia aria-hidden>
        <MessengerConversationAvatar
          conversation={conversation}
          members={members}
          size="lg"
          showsPresence
        />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0">
        <div className="flex min-w-0 items-center gap-(--density-6)">
          <ItemTitle
            data-unread={hasUnread ? "" : undefined}
            className="block min-w-0 truncate font-normal data-unread:font-medium"
          >
            {conversation.title}
            {contact?.presence.kind === "online" && (
              <span className="sr-only">, online</span>
            )}
          </ItemTitle>
          {conversation.isMuted && (
            <IconPlaceholder
              lucide="BellOffIcon"
              tabler="IconBellOff"
              hugeicons="NotificationOff01Icon"
              phosphor="BellSlashIcon"
              remixicon="RiNotificationOffLine"
              role="img"
              aria-label="Muted"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          )}
          {last && (
            <time
              dateTime={new Date(last.sentAt).toISOString()}
              data-unread={hasUnread && !conversation.isMuted ? "" : undefined}
              className="ms-auto shrink-0 text-(length:--density-text-12) text-muted-foreground tabular-nums data-unread:text-foreground"
            >
              {formatListTime(last.sentAt, now, timeFormat)}
            </time>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-(--density-8)">
          <ItemDescription
            data-unread={hasUnread ? "" : undefined}
            className="line-clamp-1 min-w-0 flex-1 data-unread:text-foreground"
          >
            {typingName ? (
              <span className="shimmer">{typingName} is typing…</span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-(--density-4) text-destructive-text [&_svg]:size-(--density-icon-14)">
                <WarningIcon />
                Not delivered
              </span>
            ) : (
              preview
            )}
          </ItemDescription>
          {hasUnread && (
            <Badge
              variant="secondary"
              data-muted={conversation.isMuted ? "" : undefined}
              className="h-(--density-20) min-w-(--density-20) shrink-0 rounded-full px-(--density-6) tabular-nums not-data-muted:bg-primary not-data-muted:text-primary-foreground"
            >
              {unreadCount}
              <span className="sr-only"> unread</span>
            </Badge>
          )}
        </div>
      </ItemContent>
    </Item>
  )
}

/**
 * The conversations as a listbox: the open one is selected, ↑ and ↓ move
 * through them, Home and End jump to the ends, and one highlight glides to the
 * row under the pointer.
 */
export function MessengerConversationList({
  conversations,
  people,
  openId,
  isAway,
  typing,
  query,
  now,
  timeFormat,
  onSelect,
  onOpen,
  onClearQuery,
}: ListProps) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const fluid = useFluidHover<HTMLDivElement>({
    items: "[data-conversation]",
    selected: '[data-conversation][aria-selected="true"]',
    gapClick: false,
  })
  const mergedRef = useMergedRef(fluid.attach, listRef)
  const ids = conversations.map(({ id }) => id)
  const tabStopId = ids.includes(openId) ? openId : ids[0]
  const groups = (
    query.trim()
      ? [{ id: "results", label: "Results", items: conversations }]
      : [
          {
            id: "pinned",
            label: "Pinned",
            items: conversations.filter(({ isPinned }) => isPinned),
          },
          {
            id: "all",
            label: "All messages",
            items: conversations.filter(({ isPinned }) => !isPinned),
          },
        ]
  ).filter((group) => group.items.length > 0)

  if (conversations.length === 0) {
    return (
      <Empty className="p-(--density-24)">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchIcon />
          </EmptyMedia>
          <EmptyTitle>No conversations found</EmptyTitle>
          <EmptyDescription>
            Nothing matches “{query.trim()}”. Try a name or a word from the last
            message.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onClearQuery}>
            Clear search
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const moveTo = (id: string | undefined) => {
    if (!id) return
    onSelect(id)
    listRef.current
      ?.querySelector<HTMLElement>(`[data-conversation="${id}"]`)
      ?.focus()
  }

  return (
    <div
      ref={mergedRef}
      role="listbox"
      aria-label="Conversations"
      {...fluid.props}
      onKeyDown={(event) => {
        const move =
          event.key === "ArrowDown"
            ? "next"
            : event.key === "ArrowUp"
              ? "previous"
              : event.key === "Home"
                ? "first"
                : event.key === "End"
                  ? "last"
                  : null
        if (!move) return
        event.preventDefault()
        moveTo(getAdjacentId(ids, openId, move))
      }}
      className="relative isolate flex flex-col gap-(--density-12) px-(--density-8) pb-(--density-12)"
    >
      <FluidHoverSelection selection={fluid.selection} />
      <FluidHoverHighlight hover={fluid.hover} />
      {groups.map((group) => (
        <div
          key={group.id}
          role="group"
          aria-labelledby={`messenger-group-${group.id}`}
          className="flex flex-col gap-px"
        >
          <div
            id={`messenger-group-${group.id}`}
            className="px-(--density-8) pb-(--density-4) text-(length:--density-text-12) text-muted-foreground"
          >
            {group.label}
          </div>
          {group.items.map((conversation) => {
            const typingId = typing[conversation.id]
            return (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                people={people}
                unreadCount={getVisibleUnread(
                  conversation,
                  isAway ? null : openId
                )}
                isSelected={conversation.id === openId && !isAway}
                isTabStop={conversation.id === tabStopId}
                typingName={
                  typingId
                    ? findPerson(people, typingId)?.name.split(" ")[0]
                    : undefined
                }
                now={now}
                timeFormat={timeFormat}
                onOpen={onOpen}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
