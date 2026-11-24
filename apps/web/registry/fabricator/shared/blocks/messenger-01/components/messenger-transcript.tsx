"use client"

import * as React from "react"

import { MessengerAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import { ChatIcon } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import {
  MessengerMessage,
  type MessengerMessageHandlers,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-message"
import {
  getAdjacentId,
  getReadReceipt,
  getRunPosition,
  groupTranscript,
  ME,
  type Conversation,
  type Person,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyContent,
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
  MessageGroup,
} from "@/registry/bases/__base__/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/registry/bases/__base__/ui/message-scroller"

type TranscriptProps = {
  conversation: Conversation
  people: Person[]
  /** Where the "New messages" marker goes. */
  unreadFromId: string | undefined
  typingId: string | undefined
  now: number
  timeFormat: TimeFormat
  handlers: MessengerMessageHandlers
}

// Items clip what they hold, so a little room keeps focus rings whole.
const ITEM_ROOM = "-m-(--density-4) p-(--density-4)"

function findRow(viewport: HTMLElement | null, id: string | undefined) {
  if (!viewport || !id) return null
  return viewport.querySelector<HTMLElement>(
    `[data-messenger-message="${CSS.escape(id)}"]`
  )
}

function TranscriptRows({
  conversation,
  people,
  unreadFromId,
  typingId,
  now,
  timeFormat,
  handlers,
}: TranscriptProps) {
  const { messages } = conversation
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { scrollToEnd, scrollToMessage } = useMessageScroller()
  const [focusId, setFocusId] = React.useState<string>()
  const days = React.useMemo(
    () => groupTranscript(messages, { now, format: timeFormat, unreadFromId }),
    [messages, now, timeFormat, unreadFromId]
  )
  const receipt = getReadReceipt(messages, timeFormat, people)
  const isGroup = conversation.kind === "group"
  const typist = people.find((person) => person.id === typingId)
  const ids = messages.map(({ id }) => id)
  // One message is in the tab order; ↑ and ↓ move between them from there.
  const tabStopId = focusId && ids.includes(focusId) ? focusId : ids.at(-1)

  // What I send is shown, wherever I had scrolled to.
  const last = messages.at(-1)
  const sentId = last?.senderId === ME ? last.id : undefined
  const shownId = React.useRef(sentId)
  React.useEffect(() => {
    if (!sentId || shownId.current === sentId) return
    shownId.current = sentId
    scrollToEnd()
  }, [sentId, scrollToEnd])

  const showMessage = (id: string) => {
    const run = days
      .flatMap((day) => day.runs)
      .find((entry) => entry.messages.some((message) => message.id === id))
    if (run) scrollToMessage(run.id, { align: "center" })
    findRow(contentRef.current, id)?.focus({ preventScroll: true })
  }

  return (
    <MessageScrollerContent
      ref={contentRef}
      onKeyDown={(event) => {
        const { target } = event
        if (!(target instanceof HTMLElement)) return
        const currentId = target.dataset.messengerMessage
        if (!currentId) return
        const move =
          event.key === "ArrowDown"
            ? "next"
            : event.key === "ArrowUp"
              ? "previous"
              : null
        if (!move) return
        event.preventDefault()
        findRow(
          contentRef.current,
          getAdjacentId(ids, currentId, move)
        )?.focus()
      }}
      className="mx-auto w-full max-w-3xl gap-(--density-16) px-(--density-16) pt-(--density-24) pb-(--density-16)"
    >
      {days.map((day) => (
        <React.Fragment key={day.key}>
          <MessageScrollerItem>
            <Marker className="justify-center">
              <MarkerContent>{day.label}</MarkerContent>
            </Marker>
          </MessageScrollerItem>
          {day.runs.map((run) => (
            <React.Fragment key={run.id}>
              {run.isFirstUnread && (
                <MessageScrollerItem>
                  <Marker variant="separator">
                    <MarkerContent className="font-medium text-foreground">
                      New messages
                    </MarkerContent>
                  </Marker>
                </MessageScrollerItem>
              )}
              <MessageScrollerItem messageId={run.id} className={ITEM_ROOM}>
                <MessageGroup className="gap-(--density-4)">
                  {run.messages.map((message, index) => (
                    <MessengerMessage
                      key={message.id}
                      message={message}
                      original={messages.find(
                        ({ id }) => id === message.replyToId
                      )}
                      sender={people.find(({ id }) => id === run.senderId)}
                      people={people}
                      position={getRunPosition(index, run.messages.length)}
                      isTabStop={message.id === tabStopId}
                      showsSender={isGroup && run.senderId !== ME}
                      receipt={
                        receipt?.messageId === message.id
                          ? receipt.label
                          : undefined
                      }
                      timeFormat={timeFormat}
                      handlers={handlers}
                      onShowOriginal={showMessage}
                      onFocus={() => setFocusId(message.id)}
                    />
                  ))}
                </MessageGroup>
              </MessageScrollerItem>
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
      {typist && (
        <MessageScrollerItem className={ITEM_ROOM}>
          <Message align="start">
            {isGroup && (
              <MessageAvatar aria-hidden>
                <MessengerAvatar name={typist.name} src={typist.avatar} />
              </MessageAvatar>
            )}
            <MessageContent className="justify-center">
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
  )
}

/**
 * The open conversation: day labels, runs of messages from one sender, where
 * unread ones start, and who is typing. It opens at the newest message and
 * follows new ones while the reader is at the end.
 */
export function MessengerTranscript(props: TranscriptProps) {
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="@container/transcript min-h-0 flex-1">
        <MessageScrollerViewport
          aria-label={`Messages with ${props.conversation.title}`}
          // Both edges: the viewport fades its foot alone.
          className="scroll-fade! [--scroll-fade-mask:var(--scroll-fade-block)]!"
        >
          <TranscriptRows {...props} />
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

/** A conversation nobody has written in yet. */
export function MessengerNewConversation({
  conversation,
  onWave,
}: {
  conversation: Conversation
  onWave: () => void
}) {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChatIcon />
        </EmptyMedia>
        <EmptyTitle>Write to {conversation.title.split(" ")[0]}</EmptyTitle>
        <EmptyDescription>
          Nothing here yet. The messages, photos and files you share show up in
          this chat.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onWave}>
          Send a wave 👋
        </Button>
      </EmptyContent>
    </Empty>
  )
}
