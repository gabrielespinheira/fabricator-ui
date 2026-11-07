"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full border border-border bg-transparent data-horizontal:h-[calc(var(--density-icon-16)+2px)] data-horizontal:w-full data-vertical:h-full data-vertical:w-[calc(var(--density-icon-16)+2px)]"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary/10 select-none dark:bg-primary/15 data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="relative block size-(--density-icon-16) shrink-0 cursor-grab rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.1)] ring-1 ring-black/5 transition-[box-shadow] duration-feedback ease-feedback select-none before:absolute before:-inset-1 before:rounded-full before:border before:border-ring before:opacity-0 before:transition-opacity before:duration-feedback after:absolute after:-inset-2 hover:shadow-[0_1px_3px_rgb(0_0_0/0.16)] focus-visible:outline-hidden focus-visible:before:opacity-100 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50 has-focus-visible:before:opacity-100 data-dragging:cursor-grabbing data-focus-visible:before:opacity-100 data-disabled:cursor-not-allowed"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
