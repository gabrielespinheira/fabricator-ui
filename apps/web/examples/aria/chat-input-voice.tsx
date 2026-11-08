"use client"

import * as React from "react"

import {
  ChatInput,
  ChatInputActions,
  ChatInputFooter,
  ChatInputMic,
  ChatInputSubmit,
  ChatInputTextarea,
  type ChatInputMicActivity,
} from "@/styles/aria-fabricator/ui/chat-input"

// A stand-in for a voice session: it hears you, transcribes, then speaks
// the reply, and listens again. A real one reads the microphone's level.
const CYCLE: { activity: ChatInputMicActivity; ms: number }[] = [
  { activity: "listening", ms: 1600 },
  { activity: "hearing", ms: 2200 },
  { activity: "transcribing", ms: 900 },
  { activity: "speaking", ms: 2600 },
]

export function ChatInputVoice() {
  const [isVoiceActive, setVoiceActive] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [isMuted, setMuted] = React.useState(false)
  const current = CYCLE[step % CYCLE.length] ?? CYCLE[0]
  const activity: ChatInputMicActivity = isMuted ? "muted" : current.activity

  React.useEffect(() => {
    if (!isVoiceActive || isMuted) return
    const timer = window.setTimeout(() => setStep(step + 1), current.ms)
    return () => window.clearTimeout(timer)
  }, [isVoiceActive, isMuted, step, current.ms])

  const voiceLevel = React.useCallback(() => {
    if (activity !== "hearing" && activity !== "speaking") return 0.15
    const time = performance.now() / 1000
    return 0.45 + Math.sin(time * 6) * 0.3 + Math.sin(time * 17) * 0.15
  }, [activity])

  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput
        isVoiceActive={isVoiceActive}
        onVoiceActiveChange={(active) => {
          setVoiceActive(active)
          setStep(0)
          setMuted(false)
        }}
        voiceLevel={voiceLevel}
      >
        <ChatInputTextarea
          placeholder={
            isVoiceActive ? "Speak, or type a message…" : "Ask for anything…"
          }
        />
        <ChatInputFooter>
          <ChatInputActions>
            <ChatInputMic
              activity={activity}
              onClick={() => {
                if (activity === "speaking") setStep(0)
                else setMuted(!isMuted)
              }}
            />
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
