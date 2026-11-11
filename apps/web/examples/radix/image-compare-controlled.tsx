"use client"

import * as React from "react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import { ImageCompare } from "@/styles/radix-fabricator/ui/image-compare"

const STOPS = [
  { label: "Raw", value: 100 },
  { label: "Split", value: 50 },
  { label: "Graded", value: 0 },
]

export function ImageCompareControlled() {
  const [value, setValue] = React.useState(50)
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <ImageCompare
        beforeSrc="/media/image-compare-before.webp"
        afterSrc="/media/image-compare-after.webp"
        beforeAlt="A fishing village on a rocky coast at sunset, straight from the camera"
        afterAlt="The same village after a warm colour grade"
        beforeLabel="Raw"
        afterLabel="Graded"
        hasLabels={false}
        value={value}
        onValueChange={setValue}
        className="w-full"
      />
      <div className="flex items-center gap-2">
        {STOPS.map((stop) => (
          <Button
            key={stop.label}
            variant={Math.round(value) === stop.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => setValue(stop.value)}
          >
            {stop.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
