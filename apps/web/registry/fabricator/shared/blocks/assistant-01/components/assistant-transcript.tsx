"use client"

import {
  AssistantMessage,
  type AssistantReplyHandlers,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-message"
import { type AssistantMessage as AssistantMessageData } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from "@/registry/bases/__base__/ui/message-scroller"

// The conversation, capped at a reading width. Each message the person
// sends anchors its turn near the top while the reply streams below it.

export function AssistantTranscript({
  messages,
  isBusy,
  ...handlers
}: AssistantReplyHandlers & {
  messages: AssistantMessageData[]
  isBusy: boolean
}) {
  return (
    <MessageScroller className="min-h-0 flex-1">
      <MessageScrollerViewport>
        <MessageScrollerContent
          aria-busy={isBusy}
          className="mx-auto w-full max-w-(--assistant-column) gap-(--density-24) px-(--assistant-gutter) pt-(--density-24) pb-(--density-40)"
        >
          {messages.map((message, index) => (
            <MessageScrollerItem
              key={message.id}
              messageId={message.id}
              scrollAnchor={message.role === "user"}
              // Rows are painted on their own, so they reach into the gutter:
              // hover washes and card edges would be cut at the text's edge.
              className="-mx-(--density-12) -my-(--density-4) px-(--density-12) py-(--density-4)"
            >
              <AssistantMessage
                message={message}
                isLast={index === messages.length - 1}
                {...handlers}
              />
            </MessageScrollerItem>
          ))}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  )
}
