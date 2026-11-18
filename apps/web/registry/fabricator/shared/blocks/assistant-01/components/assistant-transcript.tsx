"use client"

import { AssistantMessage } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-message"
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
}: {
  messages: AssistantMessageData[]
  isBusy: boolean
}) {
  return (
    <MessageScroller className="min-h-0 flex-1">
      <MessageScrollerViewport>
        <MessageScrollerContent
          aria-busy={isBusy}
          className="mx-auto w-full max-w-3xl gap-(--density-32) px-(--density-16) pt-(--density-24) pb-(--density-40) md:px-(--density-24)"
        >
          {messages.map((message) => (
            <MessageScrollerItem
              key={message.id}
              messageId={message.id}
              scrollAnchor={message.role === "user"}
            >
              <AssistantMessage message={message} />
            </MessageScrollerItem>
          ))}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  )
}
