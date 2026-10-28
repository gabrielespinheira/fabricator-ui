"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy-button"
import { Slider } from "@/styles/base-fabricator/ui/slider"

// Parts of the Colors page picker.

/** A hue slider's track: the hues from `from` to `to` at a mid lightness. */
export function hueTrack(from: number, to: number) {
  const stops = Array.from(
    { length: 13 },
    (_, index) => `oklch(0.72 0.12 ${from + ((to - from) * index) / 12})`
  )
  return `linear-gradient(to right, ${stops.join(", ")})`
}

/** The whole wheel. */
export const HUE_TRACK = hueTrack(0, 360)

/** One CSS rule with custom properties, as a project's globals.css has it. */
export function cssBlock(selector: string, entries: Record<string, string>) {
  return `${selector} {\n${Object.entries(entries)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n")}\n}`
}

/**
 * A slider whose track is a gradient (hue, strength). The gradient fills the
 * whole pill (`bg-origin-border`, so it doesn't repeat into the border), a
 * hairline inset ring draws its edge on any page, and the range is hidden.
 */
export function GradientSlider({
  track,
  className,
  style,
  ...props
}: React.ComponentProps<typeof Slider> & { track: string }) {
  return (
    <Slider
      style={{ ...style, "--slider-gradient": track } as React.CSSProperties}
      className={cn(
        "[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:border-transparent [&_[data-slot=slider-track]]:bg-(image:--slider-gradient) [&_[data-slot=slider-track]]:bg-origin-border [&_[data-slot=slider-track]]:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] dark:[&_[data-slot=slider-track]]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]",
        className
      )}
      {...props}
    />
  )
}

/** A labelled slider with its value at the end. */
export function SliderRow({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children: (labelId: string) => React.ReactNode
}) {
  const id = React.useId()

  return (
    <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3">
      <span id={id} className="text-[13px] text-muted-foreground">
        {label}
      </span>
      {children(id)}
      <span className="text-end text-[13px] text-foreground tabular-nums">
        {value}
      </span>
    </div>
  )
}

/** The CSS a picker generates, with a copy button. */
export function CssFigure({ caption, css }: { caption: string; css: string }) {
  return (
    <figure className="not-typeset relative my-6 overflow-hidden rounded-xl bg-code">
      <figcaption className="border-b px-4 py-3 text-[13px] text-muted-foreground">
        {caption}
      </figcaption>
      <CopyButton value={css} className="top-1.5" />
      <pre className="no-scrollbar overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-code-foreground">
        <code>{css}</code>
      </pre>
    </figure>
  )
}
