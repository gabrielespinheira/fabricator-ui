"use client"

import * as React from "react"
import { CheckIcon, PhoneIcon, TimerIcon, UploadIcon } from "lucide-react"

import {
  StatusIsland,
  StatusIslandContent,
} from "@/styles/radix-fabricator/ui/status-island"
import { Button } from "@/styles/radix-nova/ui/button"

const STATES = ["timer", "call", "upload", "done"] as const

export function StatusIslandDemo() {
  const [index, setIndex] = React.useState(0)
  const state = STATES[index]
  return (
    <div className="flex flex-col items-center gap-6">
      <StatusIsland>
        {state === "timer" ? (
          <StatusIslandContent key="timer">
            <TimerIcon />
            <span className="tabular-nums">04:59</span>
          </StatusIslandContent>
        ) : null}
        {state === "call" ? (
          <StatusIslandContent key="call" className="py-1">
            <PhoneIcon />
            <div className="flex flex-col">
              <span>Maya Chen</span>
              <span className="text-xs opacity-70">Calling from Lisbon</span>
            </div>
          </StatusIslandContent>
        ) : null}
        {state === "upload" ? (
          <StatusIslandContent key="upload">
            <UploadIcon />
            Uploading launch-deck.pdf, 64%
          </StatusIslandContent>
        ) : null}
        {state === "done" ? (
          <StatusIslandContent key="done">
            <CheckIcon />
            Saved
          </StatusIslandContent>
        ) : null}
      </StatusIsland>
      <Button
        variant="outline"
        onClick={() => setIndex((value) => (value + 1) % STATES.length)}
      >
        Next activity
      </Button>
    </div>
  )
}
