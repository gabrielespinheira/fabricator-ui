"use client"

import {
  ChatInput,
  ChatInputActions,
  ChatInputAttachment,
  ChatInputAttachments,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  useChatInputAttachments,
} from "@/styles/base-fabricator/ui/chat-input"
import { Kbd, KbdGroup } from "@/styles/base-fabricator/ui/kbd"

export function ChatInputSubmitOn() {
  const files = useChatInputAttachments()
  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput
        layout="large"
        submitOn="mod-enter"
        // Files dropped on the card or pasted into the field ride along.
        onAttach={files.attach}
        hasContent={files.hasContent}
        onSubmit={files.clear}
      >
        <ChatInputAttachments>
          {files.attachments.map((entry) => (
            <ChatInputAttachment
              key={entry.id}
              name={entry.name}
              src={entry.src}
              onRemove={() => files.remove(entry.id)}
            />
          ))}
        </ChatInputAttachments>
        <ChatInputTextarea placeholder="Write a longer brief. Enter adds a line." />
        <ChatInputFooter>
          <ChatInputTools className="ps-(--density-6) text-xs text-muted-foreground">
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
            </KbdGroup>
            to send
          </ChatInputTools>
          <ChatInputActions>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
