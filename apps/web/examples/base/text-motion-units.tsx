"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  TextMotion,
  type TextMotionBy,
} from "@/styles/base-fabricator/ui/text-motion"

const UNITS: TextMotionBy[] = ["character", "word", "line", "text"]

export function TextMotionUnits() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <dl
        key={run}
        className="grid grid-cols-[5rem_1fr] items-baseline gap-x-4 gap-y-4"
      >
        {UNITS.map((by) => (
          <React.Fragment key={by}>
            <dt className="font-mono text-xs text-muted-foreground">{by}</dt>
            <dd className="text-sm text-foreground">
              <TextMotion by={by} trigger="mount">
                {"Pick a template.\nInvite your team.\nShip the first release."}
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
