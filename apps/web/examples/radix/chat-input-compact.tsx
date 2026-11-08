"use client"

import { MicIcon, PlusIcon } from "lucide-react"

import {
  ChatInput,
  ChatInputActions,
  ChatInputButton,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
} from "@/styles/radix-fabricator/ui/chat-input"

export function ChatInputCompact() {
  return (
    <div className="mx-auto w-full max-w-md">
      <ChatInput layout="compact">
        <ChatInputTextarea placeholder="Message" />
        <ChatInputFooter>
          <ChatInputTools>
            <ChatInputButton aria-label="Add to message">
              <PlusIcon />
            </ChatInputButton>
          </ChatInputTools>
          <ChatInputActions>
            <ChatInputButton aria-label="Dictate">
              <MicIcon />
            </ChatInputButton>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
