"use client"

import * as React from "react"
import { ChevronDownIcon, PlusIcon, SparklesIcon } from "lucide-react"

import {
  ChatInput,
  ChatInputActions,
  ChatInputButton,
  ChatInputFooter,
  ChatInputMic,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  type ChatInputMicActivity,
} from "@/styles/base-fabricator/ui/chat-input"

export function ChatInputCompact() {
  const [isVoiceActive, setVoiceActive] = React.useState(false)
  const [activity, setActivity] =
    React.useState<ChatInputMicActivity>("listening")

  return (
    <div className="mx-auto w-full max-w-md">
      <ChatInput
        layout="compact"
        isVoiceActive={isVoiceActive}
        onVoiceActiveChange={setVoiceActive}
        voiceLevel={() => 0.4 + Math.sin(performance.now() / 180) * 0.3}
      >
        <ChatInputTextarea placeholder={["Message", "Plan a launch…"]} />
        <ChatInputFooter>
          <ChatInputTools>
            <ChatInputButton aria-label="Add to message">
              <PlusIcon />
            </ChatInputButton>
          </ChatInputTools>
          <ChatInputActions>
            <ChatInputButton aria-label="Model: Lumen 3">
              <SparklesIcon />
              <span className="@max-sm/chat-input:hidden">Lumen 3</span>
              <ChevronDownIcon />
            </ChatInputButton>
            <ChatInputMic
              activity={activity}
              onClick={() =>
                setActivity(activity === "muted" ? "listening" : "muted")
              }
            />
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
