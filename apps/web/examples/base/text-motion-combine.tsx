"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  TextMotion,
  type TextMotionEffect,
} from "@/styles/base-fabricator/ui/text-motion"

const COMBINATIONS: { effect: TextMotionEffect; label: string }[] = [
  { effect: ["fade", "blur"], label: "fade blur" },
  { effect: ["fade", "blur", "scale"], label: "fade blur scale" },
  { effect: ["fade", "slide", "blur"], label: "fade slide blur" },
  { effect: ["fade", "rise", "slide"], label: "fade rise slide" },
  { effect: ["fade", "flip"], label: "fade flip" },
  { effect: ["fade", "scramble"], label: "fade scramble" },
]

export function TextMotionCombine() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <dl
        key={run}
        className="grid grid-cols-[8rem_1fr] items-baseline gap-x-4 gap-y-3"
      >
        {COMBINATIONS.map(({ effect, label }) => (
          <React.Fragment key={label}>
            <dt className="font-mono text-xs text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold tracking-tight text-foreground">
              <TextMotion effect={effect} by="character" trigger="mount">
                Build in public
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
