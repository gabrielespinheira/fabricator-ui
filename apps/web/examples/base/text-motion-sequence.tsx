"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  TextMotion,
  TextMotionGroup,
} from "@/styles/base-fabricator/ui/text-motion"

export function TextMotionSequence() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <TextMotionGroup key={run} className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary-text">
          <TextMotion by="text" effect="fade">
            Version 0.10
          </TextMotion>
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
          <TextMotion effect={["fade", "mask"]}>
            Text that plays in order
          </TextMotion>
        </h3>
        <p className="text-sm text-muted-foreground">
          <TextMotion by="line" effect={["fade", "rise"]}>
            {
              "Each line waits for the one before it.\nOne trigger starts the whole group."
            }
          </TextMotion>
        </p>
      </TextMotionGroup>
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
