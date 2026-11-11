"use client"

import { cn } from "cn"
import {
  SliderFill,
  Slider as SliderPrimitive,
  SliderThumb,
  SliderTrack,
  type SliderProps as SliderPrimitiveProps,
} from "react-aria-components"

import { useSliderDrag } from "@/registry/bases/aria/hooks/use-slider-drag"
import { getSliderSteps } from "@/registry/bases/aria/lib/slider-model"

type SliderValue = number | number[]

// React Aria centres the thumbs on the track's ends, so a step at an end would
// sit on the border: the dots keep inside the track's rounded ends instead.
function getStepOffset(ratio: number) {
  return `calc(var(--slider-track-size) / 2 + (100% - var(--slider-track-size)) * ${ratio})`
}

type SliderProps<T extends SliderValue = SliderValue> = Omit<
  SliderPrimitiveProps<T>,
  "className"
> & {
  className?: string
  size?: "sm" | "default" | "lg"
  /** A dot on every value the thumb can land on. For coarse steps. */
  showSteps?: boolean
}

function Slider<T extends SliderValue = SliderValue>({
  className,
  size = "default",
  showSteps = false,
  onPointerDownCapture,
  ...props
}: SliderProps<T>) {
  const { isDragging, onPointerDown: onDragStart } = useSliderDrag()

  return (
    <SliderPrimitive
      className={cn(
        "cn-slider group relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      data-slot="slider"
      data-size={size}
      data-following={isDragging || undefined}
      // Capture: the track's press handling stops the event bubbling.
      onPointerDownCapture={(event) => {
        onDragStart(event)
        onPointerDownCapture?.(event)
      }}
      {...props}
    >
      {({ state }) => {
        const isVertical = state.orientation === "vertical"
        const steps = showSteps
          ? getSliderSteps({
              min: state.getThumbMinValue(0),
              max: state.getThumbMaxValue(state.values.length - 1),
              step: state.step,
              values: state.values,
            })
          : []
        return (
          <>
            <SliderTrack
              data-slot="slider-track"
              className="cn-slider-track relative grow overflow-hidden select-none"
            >
              <SliderFill
                data-slot="slider-range"
                className="cn-slider-range absolute select-none data-horizontal:h-full data-vertical:w-full"
              />
            </SliderTrack>
            {steps.length > 0 && (
              <div
                data-slot="slider-steps"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                {steps.map(({ value, ratio, isFilled }) => (
                  <span
                    key={value}
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
            {state.values.map((_, index) => (
              <SliderThumb
                data-slot="slider-thumb"
                key={index}
                index={index}
                className="cn-slider-thumb block shrink-0 select-none group-data-horizontal:top-[50%] group-data-vertical:left-[50%] disabled:pointer-events-none disabled:opacity-50"
              />
            ))}
          </>
        )
      }}
    </SliderPrimitive>
  )
}

export { Slider }
