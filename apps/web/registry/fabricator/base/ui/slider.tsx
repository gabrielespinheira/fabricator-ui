"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

import { useSliderDrag } from "@/registry/bases/base/hooks/use-slider-drag"
import { getSliderSteps } from "@/registry/bases/base/lib/slider-model"

type SliderValue = number | readonly number[]

function toValues(value: SliderValue) {
  return typeof value === "number" ? [value] : value
}

// Edge-aligned like the thumbs: a step sits under the thumb's centre when the
// thumb is on it.
function getStepOffset(ratio: number) {
  return `calc(var(--slider-thumb-size) / 2 + (100% - var(--slider-thumb-size)) * ${ratio})`
}

// The root's name reaches each thumb, which is what assistive tech focuses.
function getThumbLabel(
  label: string | undefined,
  index: number,
  count: number
) {
  if (!label || count < 2) return label
  return `${label}, ${index + 1} of ${count}`
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  size = "default",
  showSteps = false,
  orientation = "horizontal",
  onValueChange,
  onPointerDown,
  "aria-label": ariaLabel,
  ...props
}: SliderPrimitive.Root.Props & {
  size?: "sm" | "default" | "lg"
  /** A dot on every value the thumb can land on. For coarse steps. */
  showSteps?: boolean
}) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]
  // The step dots need the live value, which an uncontrolled slider keeps inside.
  const [uncontrolled, setUncontrolled] = React.useState<SliderValue>(
    defaultValue ?? min
  )
  const { isDragging, onPointerDown: onDragStart } = useSliderDrag()
  const steps = showSteps
    ? getSliderSteps({
        min,
        max,
        step,
        values: toValues(value ?? uncontrolled),
      })
    : []
  const isVertical = orientation === "vertical"

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      aria-label={ariaLabel}
      data-size={size}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      orientation={orientation}
      thumbAlignment="edge"
      onValueChange={(next, details) => {
        setUncontrolled(next)
        onValueChange?.(next, details)
      }}
      onPointerDown={(event) => {
        onDragStart(event)
        onPointerDown?.(event)
      }}
      {...props}
    >
      <SliderPrimitive.Control
        data-size={size}
        data-following={isDragging || undefined}
        className="cn-slider relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="cn-slider-track relative grow overflow-hidden select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="cn-slider-range select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {steps.length > 0 && (
          <div
            data-slot="slider-steps"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            {steps.map(({ value: stepValue, ratio, isFilled }) => (
              <span
                key={stepValue}
                data-slot="slider-step"
                data-filled={isFilled || undefined}
                className={cn(
                  "cn-slider-step absolute",
                  isVertical
                    ? "left-1/2 -translate-x-1/2 translate-y-1/2"
                    : "top-1/2 -translate-x-1/2 -translate-y-1/2"
                )}
                style={
                  isVertical
                    ? { bottom: getStepOffset(ratio) }
                    : { left: getStepOffset(ratio) }
                }
              />
            ))}
          </div>
        )}
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            aria-label={getThumbLabel(ariaLabel, index, _values.length)}
            className="cn-slider-thumb block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
