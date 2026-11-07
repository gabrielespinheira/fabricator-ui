"use client"

import * as React from "react"
import Image from "next/image"

import { AspectRatio } from "@/styles/aria-nova/ui/aspect-ratio"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/aria-nova/ui/toggle-group"

const RATIOS = [
  { label: "16:9", ratio: 16 / 9 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "1:1", ratio: 1 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "9:16", ratio: 9 / 16 },
]

// Every shape keeps the same area, so the photo reshapes around its centre
// instead of growing and shrinking. The tallest, 9:16, is 288px high.
const FRAME_AREA = 288 * 162

export default function AspectRatioDemo() {
  const [selected, setSelected] = React.useState(RATIOS[0])
  const width = Math.round(Math.sqrt(FRAME_AREA * selected.ratio))

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-72 items-center">
        {/* The width moves on the same timing as the ratio. */}
        <div
          className="transition-[width] duration-move ease-move motion-reduce:transition-none"
          style={{ width }}
        >
          <AspectRatio
            ratio={selected.ratio}
            className="overflow-hidden rounded-xl bg-muted"
          >
            <Image
              src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80"
              alt="A rowing boat on a turquoise mountain lake"
              fill
              sizes="384px"
              className="object-cover"
            />
          </AspectRatio>
        </div>
      </div>
      <ToggleGroup
        aria-label="Aspect ratio"
        variant="outline"
        size="sm"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[selected.label]}
        onSelectionChange={(keys) => {
          const match = RATIOS.find((item) => keys.has(item.label))
          if (match) setSelected(match)
        }}
      >
        {RATIOS.map((item) => (
          <ToggleGroupItem
            key={item.label}
            id={item.label}
            className="tabular-nums"
          >
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
