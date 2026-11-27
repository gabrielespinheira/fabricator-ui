"use client"

import * as React from "react"

import { SlideToConfirm } from "@/styles/aria-fabricator/ui/slide-to-confirm"

export function SlideToConfirmDemo() {
  const [round, setRound] = React.useState(0)
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <SlideToConfirm
        key={round}
        confirmingLabel="Paying"
        confirmedLabel="Paid"
        onConfirm={() =>
          new Promise((resolve) => window.setTimeout(resolve, 1200))
        }
      >
        Slide to pay $240.00
      </SlideToConfirm>
      <button
        type="button"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => setRound((value) => value + 1)}
      >
        Reset
      </button>
    </div>
  )
}
