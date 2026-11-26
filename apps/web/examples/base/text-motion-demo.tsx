"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  TextMotion,
  TextMotionGroup,
} from "@/styles/base-fabricator/ui/text-motion"

export function TextMotionDemo() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <TextMotionGroup key={run} className="flex max-w-md flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-balance text-foreground">
          <TextMotion by="character">
            Interfaces that move with intent
          </TextMotion>
        </h2>
        <p className="text-balance text-muted-foreground">
          <TextMotion effect={["fade", "rise"]}>
            Every effect is a layer. Combine them, and the motion roles time the
            rest.
          </TextMotion>
        </p>
      </TextMotionGroup>
      <Button variant="outline" size="sm" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  )
}
