"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import { TextMotion } from "@/styles/base-fabricator/ui/text-motion"

export function TextMotionType() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <p
        key={run}
        className="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground"
      >
        <span className="text-muted-foreground">$ </span>
        <TextMotion effect="type">
          npx fabricator-ui@latest add text-motion
        </TextMotion>
      </p>
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
