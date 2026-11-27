"use client"

import * as React from "react"
import { PhoneIcon, TimerIcon, XIcon } from "lucide-react"

import {
  MorphIsland,
  MorphIslandContent,
} from "@/styles/aria-fabricator/ui/morph-island"
import { Avatar, AvatarFallback } from "@/styles/aria-nova/ui/avatar"
import { Button } from "@/styles/aria-nova/ui/button"

const STATES = ["idle", "timer", "upload", "call"] as const
type IslandState = (typeof STATES)[number]
const STORY: IslandState[] = ["timer", "upload", "call", "idle"]
const STEP_MS = 2800

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

export function MorphIslandDemo() {
  const [state, setState] = React.useState<IslandState>("idle")
  const [isPlaying, setIsPlaying] = React.useState(true)
  const [secondsLeft, setSecondsLeft] = React.useState(299)
  const [uploaded, setUploaded] = React.useState(0)

  // A little story on loop until someone picks a state.
  React.useEffect(() => {
    if (!isPlaying) return
    let step = 0
    const timer = window.setInterval(() => {
      setState(STORY[step % STORY.length])
      step += 1
    }, STEP_MS)
    return () => window.clearInterval(timer)
  }, [isPlaying])

  React.useEffect(() => {
    if (state === "timer") setSecondsLeft(299)
    if (state === "upload") setUploaded(0)
    if (state !== "timer" && state !== "upload") return
    const tick = window.setInterval(
      () => {
        if (state === "timer") setSecondsLeft((value) => Math.max(0, value - 1))
        else setUploaded((value) => Math.min(100, value + 4))
      },
      state === "timer" ? 1000 : 96
    )
    return () => window.clearInterval(tick)
  }, [state])

  const pick = (next: IslandState) => {
    setIsPlaying(false)
    setState(next)
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <MorphIsland value={state}>
        <MorphIslandContent value="idle" />
        <MorphIslandContent value="timer" className="w-56 justify-between">
          <span className="flex items-center gap-2 font-medium text-warning-text">
            <TimerIcon />
            Focus
          </span>
          <span className="font-semibold text-warning-text tabular-nums">
            {formatTime(secondsLeft)}
          </span>
        </MorphIslandContent>
        <MorphIslandContent value="upload" className="w-72">
          <svg viewBox="0 0 32 32" className="size-8 shrink-0 -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              strokeWidth="3.5"
              className="stroke-foreground/15"
            />
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - uploaded}
              className="stroke-success"
            />
          </svg>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">Uploading</span>
            <span className="text-xs text-muted-foreground">
              motion-kit.zip
            </span>
          </span>
          <span className="font-semibold text-success-text tabular-nums">
            {uploaded}%
          </span>
        </MorphIslandContent>
        <MorphIslandContent value="call" className="w-84 py-4">
          <Avatar className="size-12">
            <AvatarFallback>MC</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-semibold">Maya Collins</span>
            <span className="text-xs text-muted-foreground">Incoming call</span>
          </span>
          <Button
            variant="secondary"
            size="icon-lg"
            className="rounded-full"
            aria-label="Decline"
            onPress={() => pick("idle")}
          >
            <XIcon />
          </Button>
          <Button
            size="icon-lg"
            className="rounded-full bg-success text-success-foreground hover:bg-success/90"
            aria-label="Accept"
            onPress={() => pick("idle")}
          >
            <PhoneIcon />
          </Button>
        </MorphIslandContent>
      </MorphIsland>
      <div role="group" aria-label="Island state" className="flex gap-1">
        {STATES.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={state === item ? "secondary" : "ghost"}
            aria-pressed={state === item}
            className="capitalize"
            onPress={() => pick(item)}
          >
            {item}
          </Button>
        ))}
      </div>
    </div>
  )
}
