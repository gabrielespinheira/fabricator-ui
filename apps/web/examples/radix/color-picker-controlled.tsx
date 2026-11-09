"use client"

import * as React from "react"

import { ColorPicker } from "@/styles/radix-fabricator/ui/color-picker"

export function ColorPickerControlled() {
  const [value, setValue] = React.useState("rgb(107, 151, 255)")

  return (
    <div className="flex flex-col items-center gap-3">
      <ColorPicker value={value} onValueChange={setValue} defaultFormat="rgb" />
      <p className="text-sm text-muted-foreground tabular-nums">
        Current: {value}
      </p>
    </div>
  )
}
