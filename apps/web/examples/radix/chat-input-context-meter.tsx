"use client"

import {
  ChatInput,
  ChatInputActions,
  ChatInputContextMeter,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  formatTokenCount,
} from "@/styles/radix-fabricator/ui/chat-input"

const READINGS = [
  { tokens: 84_200, of: 200_000 },
  { tokens: 156_000, of: 200_000 },
  { tokens: 191_000, of: 200_000 },
]

export function ChatInputContextMeterDemo() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput>
        <ChatInputTextarea placeholder="Ask for anything…" />
        <ChatInputFooter>
          <ChatInputActions>
            {READINGS.map((reading) => (
              <ChatInputContextMeter
                key={reading.tokens}
                value={reading.tokens / reading.of}
                label={formatTokenCount(reading.tokens)}
              />
            ))}
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
