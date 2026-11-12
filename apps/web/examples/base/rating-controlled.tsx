"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import { Rating } from "@/styles/base-fabricator/ui/rating"

export function RatingControlled() {
  const [value, setValue] = React.useState(2.5)
  return (
    <div className="flex items-center gap-4">
      <Rating
        value={value}
        onValueChange={setValue}
        step={0.5}
        aria-label="Delivery"
      />
      <span className="w-12 text-sm text-muted-foreground tabular-nums">
        {value} / 5
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={value === 0}
        onClick={() => setValue(0)}
      >
        Clear
      </Button>
    </div>
  )
}
