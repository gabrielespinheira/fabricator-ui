"use client"

import * as React from "react"

import { SegmentedMeter } from "@/styles/aria-fabricator/ui/segmented-meter"
import { Button } from "@/styles/aria-nova/ui/button"

const FULL = [
  { label: "Photos", value: 31.4 },
  { label: "Apps", value: 22.6 },
  { label: "Video", value: 20.2 },
]

export function SegmentedMeterDemo() {
  const [freed, setFreed] = React.useState(false)
  const segments = freed
    ? FULL.map((segment) =>
        segment.label === "Video" ? { ...segment, value: 16 } : segment
      )
    : FULL
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <SegmentedMeter
        label="Storage"
        segments={segments}
        max={128}
        formatValue={(value) => `${Math.round(value * 10) / 10} GB`}
      />
      <Button
        variant="outline"
        className="self-start"
        onPress={() => setFreed((value) => !value)}
      >
        {freed ? "Restore the recording" : "Delete a screen recording"}
      </Button>
    </div>
  )
}
