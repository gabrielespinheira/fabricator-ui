"use client"

import * as React from "react"

import { ModelPickerEffort } from "@/styles/aria-fabricator/ui/model-picker"

const FIVE = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "ultra", label: "Ultra" },
]

export function ModelPickerEffortDemo() {
  const [effort, setEffort] = React.useState<string | null>(null)

  return (
    <div className="mx-auto grid w-full max-w-xs gap-4 rounded-xl bg-popover p-1 shadow-surface-3">
      <ModelPickerEffort levels={FIVE} value={effort} onValueChange={setEffort}>
        <span className="text-sm">Reasoning</span>
      </ModelPickerEffort>
    </div>
  )
}
