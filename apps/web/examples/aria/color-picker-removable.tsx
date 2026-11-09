"use client"

import * as React from "react"

import { Button } from "@/styles/aria-fabricator/ui/button"
import { ColorPickerPopover } from "@/styles/aria-fabricator/ui/color-picker"

export function ColorPickerRemovable() {
  const [fill, setFill] = React.useState<string | null>("#6b97ff")

  if (fill === null) {
    return (
      <Button variant="outline" onPress={() => setFill("#6b97ff")}>
        Add fill
      </Button>
    )
  }

  return (
    <ColorPickerPopover
      value={fill}
      onValueChange={setFill}
      triggerLabel="Fill"
      triggerShowRemove
      onTriggerRemove={() => setFill(null)}
    />
  )
}
