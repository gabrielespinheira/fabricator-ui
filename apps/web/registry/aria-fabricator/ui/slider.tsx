"use client"

import { cn } from "cn"
import {
  SliderFill,
  Slider as SliderPrimitive,
  SliderThumb,
  SliderTrack,
  type SliderProps as SliderPrimitiveProps,
} from "react-aria-components"

type SliderValue = number | number[]
type SliderProps<T extends SliderValue = SliderValue> = Omit<
  SliderPrimitiveProps<T>,
  "className"
> & {
  className?: string
}

function Slider<T extends SliderValue = SliderValue>({
  className,
  ...props
}: SliderProps<T>) {
  return (
    <SliderPrimitive
      className={cn(
        "group relative flex w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      data-slot="slider"
      {...props}
    >
      {({ state }) => {
        return (
          <>
            <SliderTrack
              data-slot="slider-track"
              className="relative grow overflow-hidden rounded-full border border-border bg-transparent select-none data-horizontal:h-[calc(var(--density-icon-16)+2px)] data-horizontal:w-full data-vertical:h-full data-vertical:w-[calc(var(--density-icon-16)+2px)]"
            >
              <SliderFill
                data-slot="slider-range"
                className="absolute bg-primary/10 select-none dark:bg-primary/15 data-horizontal:h-full data-vertical:w-full"
              />
            </SliderTrack>
            {state.values.map((_, index) => (
              <SliderThumb
                data-slot="slider-thumb"
                key={index}
                index={index}
                className="relative block size-(--density-icon-16) shrink-0 cursor-grab rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.1)] ring-1 ring-black/5 transition-[box-shadow] duration-feedback ease-feedback select-none group-data-horizontal:top-[50%] group-data-vertical:left-[50%] before:absolute before:-inset-1 before:rounded-full before:border before:border-ring before:opacity-0 before:transition-opacity before:duration-feedback after:absolute after:-inset-2 hover:shadow-[0_1px_3px_rgb(0_0_0/0.16)] focus-visible:outline-hidden focus-visible:before:opacity-100 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50 has-focus-visible:before:opacity-100 data-dragging:cursor-grabbing data-focus-visible:before:opacity-100 data-disabled:cursor-not-allowed"
              />
            ))}
          </>
        )
      }}
    </SliderPrimitive>
  )
}

export { Slider }
