"use client"

import * as React from "react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  TextMotion,
  type TextMotionFrom,
} from "@/styles/radix-fabricator/ui/text-motion"

const ORIGINS: TextMotionFrom[] = ["start", "end", "center", "edges", "random"]

export function TextMotionOrder() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <dl
        key={run}
        className="grid grid-cols-[5rem_1fr] items-baseline gap-x-4 gap-y-3"
      >
        {ORIGINS.map((from) => (
          <React.Fragment key={from}>
            <dt className="font-mono text-xs text-muted-foreground">{from}</dt>
            <dd className="text-xl font-semibold tracking-tight text-foreground">
              <TextMotion
                by="character"
                from={from}
                effect={["fade", "mask"]}
                trigger="mount"
              >
                Release notes
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
