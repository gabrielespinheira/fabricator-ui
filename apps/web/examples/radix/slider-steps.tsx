"use client"

import * as React from "react"

import { Slider } from "@/styles/radix-fabricator/ui/slider"

export function SliderSteps() {
  return (
    <div className="mx-auto grid w-full max-w-xs gap-6">
      <SteppedSlider label="Quality" defaultValue={50} step={25} />
      <SteppedSlider label="Zoom" defaultValue={20} step={10} />
    </div>
  )
}

function SteppedSlider({
  label,
  defaultValue,
  step,
}: {
  label: string
  defaultValue: number
  step: number
}) {
  const [value, setValue] = React.useState([defaultValue])

  return (
    <div className="flex items-center gap-4">
      <span className="w-8 shrink-0 text-end text-sm text-muted-foreground tabular-nums">
        {value[0]}
      </span>
      <Slider
        aria-label={label}
        value={value}
        onValueChange={setValue}
        max={100}
        step={step}
        showSteps
      />
    </div>
  )
}
