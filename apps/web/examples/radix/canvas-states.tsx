"use client"

import * as React from "react"
import { SparklesIcon } from "@fabricator-ui/icons"

import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  Canvas,
  type CanvasLibraryItem,
} from "@/styles/radix-fabricator/ui/canvas"

type State = "empty" | "loading" | "error"

const library: CanvasLibraryItem[] = [
  {
    id: "ai",
    label: "Add an AI step",
    icon: <SparklesIcon />,
    create: (position) => ({
      id: `ai-${Date.now()}`,
      position,
      data: { title: "AI step" },
    }),
  },
]

// What a canvas shows before it has a graph: the first-run prompt, ghost
// nodes while it loads, and a failure with Retry.
export function CanvasStates() {
  const [state, setState] = React.useState<State>("empty")
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex gap-2">
        {(["empty", "loading", "error"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={state === value ? "secondary" : "ghost"}
            aria-pressed={state === value}
            onClick={() => setState(value)}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Button>
        ))}
      </div>
      <Canvas
        key={state}
        defaultNodes={[]}
        library={library}
        loading={state === "loading"}
        error={
          state === "error" ? "The workflow service didn't answer." : undefined
        }
        onRetry={() => setState("loading")}
        label="New workflow"
        className="h-96 w-full rounded-xl"
      />
    </div>
  )
}
