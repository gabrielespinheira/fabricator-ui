"use client"

import * as React from "react"
import { CornerDownRightIcon, ListEndIcon, Trash2Icon } from "lucide-react"

import {
  ChatInput,
  ChatInputActions,
  ChatInputButton,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTray,
  ChatInputTrayItem,
  type ChatInputStatus,
} from "@/styles/aria-fabricator/ui/chat-input"

type Queued = { id: string; text: string }

export function ChatInputTrayDemo() {
  const [queued, setQueued] = React.useState<Queued[]>([
    { id: "1", text: "Then add a dark mode screenshot to the PR" },
  ])

  const [status, setStatus] = React.useState<ChatInputStatus>("streaming")

  const remove = (id: string) =>
    setQueued((current) => current.filter((message) => message.id !== id))

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      {queued.length > 0 && (
        <ChatInputTray role="list" aria-label="Queued messages">
          {queued.map((message) => (
            <ChatInputTrayItem key={message.id} role="listitem">
              <ListEndIcon aria-hidden />
              <span className="min-w-0 flex-1 truncate">{message.text}</span>
              <ChatInputButton
                size="sm"
                aria-label={`Send now: ${message.text}`}
                onClick={() => remove(message.id)}
              >
                <CornerDownRightIcon />
                <span>Steer</span>
              </ChatInputButton>
              <ChatInputButton
                aria-label={`Remove: ${message.text}`}
                onClick={() => remove(message.id)}
              >
                <Trash2Icon />
              </ChatInputButton>
            </ChatInputTrayItem>
          ))}
        </ChatInputTray>
      )}
      <ChatInput
        queue
        status={status}
        onStop={() => setStatus("ready")}
        onSubmit={(text) => {
          if (status === "ready") return setStatus("streaming")
          setQueued((current) => [
            ...current,
            { id: crypto.randomUUID(), text },
          ])
        }}
      >
        <ChatInputTextarea placeholder="Queue a message for after this reply…" />
        <ChatInputFooter>
          <ChatInputActions>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
