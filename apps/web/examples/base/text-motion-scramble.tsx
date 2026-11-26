"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import { TextMotion } from "@/styles/base-fabricator/ui/text-motion"

export function TextMotionScramble() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex flex-col items-center gap-6">
      <div key={run} className="flex flex-col items-center gap-1 font-mono">
        <p className="text-2xl font-medium text-foreground tabular-nums">
          <TextMotion effect="scramble" by="character" from="random">
            Deploy 4F2A91C
          </TextMotion>
        </p>
        <p className="text-sm text-muted-foreground">
          <TextMotion effect={["fade", "scramble"]} by="word">
            Live on fabricator-ui.vercel.app
          </TextMotion>
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  )
}
