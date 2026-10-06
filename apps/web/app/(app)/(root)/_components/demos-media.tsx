"use client"

import * as React from "react"
import Image from "next/image"

import {
  RectangleHorizontalIcon,
  RectangleVerticalIcon,
  SquareIcon,
} from "@/lib/site-icons"
import { AspectRatio } from "@/styles/base-fabricator/ui/aspect-ratio"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

// Each shape keeps roughly the same area, so the photo reshapes around its
// centre instead of growing and shrinking.
const SHAPES = [
  {
    value: "landscape",
    label: "Landscape, 16:9",
    ratio: 16 / 9,
    width: 256,
    Icon: RectangleHorizontalIcon,
  },
  {
    value: "square",
    label: "Square, 1:1",
    ratio: 1,
    width: 196,
    Icon: SquareIcon,
  },
  {
    value: "portrait",
    label: "Portrait, 3:4",
    ratio: 3 / 4,
    width: 168,
    Icon: RectangleVerticalIcon,
  },
] as const

type Shape = (typeof SHAPES)[number]["value"]

export function AspectRatioDemo() {
  const [shape, setShape] = React.useState<Shape>("portrait")
  const current = SHAPES.find((item) => item.value === shape) ?? SHAPES[2]

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Width and the ratio both animate, on the bouncy spring. */}
      <div
        className="transition-[width] duration-240 ease-spring-bounce motion-reduce:transition-none"
        style={{ width: current.width }}
      >
        <AspectRatio
          ratio={current.ratio}
          className="overflow-hidden rounded-2xl bg-muted shadow-surface-3 transition-[aspect-ratio] duration-240 ease-spring-bounce motion-reduce:transition-none"
        >
          <Image
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=640&auto=format&fit=crop&q=80"
            alt="A rowing boat on a turquoise mountain lake"
            fill
            // Twice the widest frame, so it stays sharp on high-density screens.
            sizes="512px"
            className="object-cover"
          />
        </AspectRatio>
      </div>
      <ToggleGroup
        aria-label="Shape"
        value={[shape]}
        onValueChange={(next) => {
          const value = next[0] as Shape | undefined
          if (value) setShape(value)
        }}
        spacing={0.5}
        className="rounded-full bg-foreground/[0.06] p-1 data-[size=default]:rounded-full [&_[data-slot^=fluid-hover]]:rounded-full"
      >
        {SHAPES.map(({ value, label, Icon }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={label}
            className="h-8 min-w-10 rounded-full! px-3 text-muted-foreground aria-pressed:text-foreground"
          >
            <Icon className="size-4" />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
