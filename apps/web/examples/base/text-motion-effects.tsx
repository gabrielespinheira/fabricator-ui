"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  TextMotion,
  type TextMotionEffect,
} from "@/styles/base-fabricator/ui/text-motion"

const EFFECTS: TextMotionEffect[] = [
  "fade",
  "blur",
  "rise",
  "fall",
  "slide",
  "scale",
  "flip",
  "mask",
  "scramble",
  "type",
]

export function TextMotionEffects() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <dl
        key={run}
        className="grid grid-cols-[5rem_1fr] items-baseline gap-x-4 gap-y-3"
      >
        {EFFECTS.map((effect) => (
          <React.Fragment key={String(effect)}>
            <dt className="font-mono text-xs text-muted-foreground">
              {String(effect)}
            </dt>
            <dd className="text-xl font-semibold tracking-tight text-foreground">
              <TextMotion
                effect={effect}
                by="character"
                trigger="mount"
                className={effect === "scramble" ? "font-mono" : undefined}
              >
                Ship it today
              </TextMotion>
            </dd>
          </React.Fragment>
        ))}
      </dl>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setRun(run + 1)}
      >
        Replay
      </Button>
    </div>
  )
}
