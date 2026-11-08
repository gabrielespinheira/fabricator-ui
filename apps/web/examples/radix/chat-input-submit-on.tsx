"use client"

import {
  ChatInput,
  ChatInputActions,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
} from "@/styles/radix-fabricator/ui/chat-input"
import { Kbd, KbdGroup } from "@/styles/radix-fabricator/ui/kbd"

export function ChatInputSubmitOn() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput submitOn="mod-enter">
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
