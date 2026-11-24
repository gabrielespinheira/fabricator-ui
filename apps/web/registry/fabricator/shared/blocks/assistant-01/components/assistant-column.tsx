"use client"

import * as React from "react"
import { cn } from "cn"

// The width the transcript, the composer and a new chat share: 720px of text
// inside a gutter that tightens with the column, not the window.

export function AssistantColumn({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className="@container flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col [--assistant-column:calc(45rem+2*var(--assistant-gutter))] [--assistant-gutter:var(--density-16)] @2xl:[--assistant-gutter:var(--density-24)]",
          className
        )}
        {...props}
      />
    </div>
  )
}

export function AssistantComposerSlot({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-(--assistant-column) px-(--assistant-gutter)",
        className
      )}
      {...props}
    />
  )
}
