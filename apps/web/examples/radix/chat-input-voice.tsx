"use client"

import * as React from "react"
import { useMicrophone } from "voice-glow"

import {
  ChatInput,
  ChatInputActions,
  ChatInputFooter,
  ChatInputMic,
  ChatInputSubmit,
  ChatInputTextarea,
  type ChatInputMicActivity,
} from "@/styles/radix-fabricator/ui/chat-input"

// Voice chat listens to your microphone: the glow reacts to your voice.
// Without one (denied, or no device) a stand-in level drives it. The
// session itself is a stand-in too: it hears you, transcribes, speaks the
// reply, and listens again.
const CYCLE: { activity: ChatInputMicActivity; ms: number }[] = [
  { activity: "listening", ms: 1600 },
  { activity: "hearing", ms: 2200 },
  { activity: "transcribing", ms: 900 },
  { activity: "speaking", ms: 2600 },
]

export function ChatInputVoice() {
  const mic = useMicrophone()
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
          // Started from the press, so the browser lets audio begin.
          if (active) void mic.start()
          else mic.stop()
        }}
        voiceStream={isMuted ? null : mic.stream}
        voiceLevel={isMuted ? () => 0 : voiceLevel}
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
