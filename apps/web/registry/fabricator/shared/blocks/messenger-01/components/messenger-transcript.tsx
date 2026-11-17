"use client"

import * as React from "react"

import { MessengerAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import { MessengerMessageBody } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-message-body"
import {
  formatClock,
  getReadReceipt,
  groupTranscript,
  type Conversation,
  type Person,
  type TimeFormat,
  type TranscriptRun,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { Marker, MarkerContent } from "@/registry/bases/__base__/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/registry/bases/__base__/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/registry/bases/__base__/ui/message-scroller"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function Run({
  run,
  people,
  isGroup,
  receipt,
  timeFormat,
}: {
  run: TranscriptRun
  people: Person[]
  isGroup: boolean
  receipt: { messageId: string; label: string } | undefined
  timeFormat: TimeFormat
}) {
  const sender = people.find((person) => person.id === run.senderId)
  const senderName = run.isMine ? "you" : (sender?.name ?? "Someone")
  // In a group, the people who write get a name over their first message and
  // a picture beside their last; a direct conversation needs neither.
  const showsSender = isGroup && !run.isMine

  return (
    <MessageGroup>
      {run.messages.map((message, index) => {
        const isLast = index === run.messages.length - 1
        return (
          <Message key={message.id} align={run.isMine ? "end" : "start"}>
            {showsSender && (
              <MessageAvatar aria-hidden>
                {isLast && (
                  <MessengerAvatar
                    name={senderName}
                    src={sender?.avatar}
                    size="sm"
                  />
                )}
              </MessageAvatar>
            )}
            <MessageContent>
              {showsSender && index === 0 && (
                <MessageHeader>{senderName}</MessageHeader>
              )}
              <MessengerMessageBody
                message={message}
                isMine={run.isMine}
                senderName={senderName}
              />
              {isLast && (
                <MessageFooter>
                  <span>
                    <time dateTime={new Date(message.sentAt).toISOString()}>
                      {formatClock(message.sentAt, timeFormat)}
                    </time>
                    {receipt?.messageId === message.id && ` · ${receipt.label}`}
                  </span>
                </MessageFooter>
              )}
            </MessageContent>
          </Message>
        )
      })}
    </MessageGroup>
  )
}

/**
 * The open conversation: day labels, runs of messages from one sender, and
 * who is typing. It opens at the newest message and follows new ones while
 * the reader is at the end.
 */
export function MessengerTranscript({
  conversation,
  people,
  typingId,
  now,
  timeFormat,
}: {
  conversation: Conversation
  people: Person[]
  typingId: string | undefined
  now: number
  timeFormat: TimeFormat
}) {
  const days = React.useMemo(
    () => groupTranscript(conversation.messages, { now, format: timeFormat }),
    [conversation.messages, now, timeFormat]
  )
  const receipt = getReadReceipt(conversation.messages, timeFormat)
  const isGroup = conversation.kind === "group"
  const typist = people.find((person) => person.id === typingId)

  if (conversation.messages.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPlaceholder
              lucide="MessageCircleIcon"
              tabler="IconMessageCircle"
              hugeicons="Message01Icon"
              phosphor="ChatCircleIcon"
              remixicon="RiChat1Line"
            />
          </EmptyMedia>
          <EmptyTitle>No messages yet</EmptyTitle>
          <EmptyDescription>
            Say hello to {conversation.title}. Messages and files you share show
            up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport
          aria-label={`Messages with ${conversation.title}`}
        >
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-(--density-16) px-(--density-16) pt-(--density-24) pb-(--density-16)">
            {days.map((day) => (
              <React.Fragment key={day.key}>
                <MessageScrollerItem>
                  <Marker className="justify-center">
                    <MarkerContent>{day.label}</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
                {day.runs.map((run) => (
                  <MessageScrollerItem key={run.id} messageId={run.id}>
                    <Run
                      run={run}
                      people={people}
                      isGroup={isGroup}
                      receipt={receipt}
                      timeFormat={timeFormat}
                    />
                  </MessageScrollerItem>
                ))}
              </React.Fragment>
            ))}
            {typist && (
              <MessageScrollerItem>
                <Message align="start">
                  {isGroup && (
                    <MessageAvatar aria-hidden>
                      <MessengerAvatar
                        name={typist.name}
                        src={typist.avatar}
                        size="sm"
                      />
                    </MessageAvatar>
                  )}
                  <MessageContent>
                    <Marker role="status">
                      <MarkerContent className="shimmer">
                        {typist.name.split(" ")[0]} is typing…
                      </MarkerContent>
                    </Marker>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
