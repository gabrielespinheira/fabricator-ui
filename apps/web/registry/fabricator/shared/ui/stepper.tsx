"use client"

// Stepper: the steps of a flow (checkout, onboarding, a setup) and where the
// person is in it. Finished steps draw a check, the current one pops up in
// the primary fill, and the line between steps fills as each is finished.
// The steps are a list; the current one is marked aria-current="step".
import * as React from "react"
import { cn } from "cn"

import {
  getStepState,
  type StepState,
} from "@/registry/bases/__base__/lib/stepper-model"

const StepperContext = React.createContext<{ current: number }>({ current: 1 })
const StepperItemContext = React.createContext<{
  step: number
  state: StepState
}>({ step: 1, state: "upcoming" })

type StepperProps = React.ComponentProps<"ol"> & {
  /** The current step, counting from 1. Past the last, every step is done. */
  value: number
}

function Stepper({ value, className, ...props }: StepperProps) {
  const context = React.useMemo(() => ({ current: value }), [value])
  return (
    <StepperContext.Provider value={context}>
      <ol
        data-slot="stepper"
        className={cn("cn-stepper group/stepper flex", className)}
        {...props}
      />
    </StepperContext.Provider>
  )
}

function StepperItem({
  step,
  className,
  ...props
}: React.ComponentProps<"li"> & {
  /** This step's place in the flow, counting from 1. */
  step: number
}) {
  const { current } = React.useContext(StepperContext)
  const state = getStepState(step, current)
  const context = React.useMemo(() => ({ step, state }), [step, state])
  return (
    <StepperItemContext.Provider value={context}>
      <li
        data-slot="stepper-item"
        data-state={state}
        aria-current={state === "current" ? "step" : undefined}
        className={cn(
          "cn-stepper-item group/stepper-item relative flex min-w-0",
          className
        )}
        {...props}
      />
    </StepperItemContext.Provider>
  )
}

// A check drawn along its path (pathLength 1), so finishing a step reads as
// ticking it off.
function StepperCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="cn-stepper-check"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
    </svg>
  )
}

function StepperIndicator({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  const { step, state } = React.useContext(StepperItemContext)
  return (
    <span
      data-slot="stepper-indicator"
      className={cn(
        "cn-stepper-indicator relative flex shrink-0 items-center justify-center",
        className
      )}
      {...props}
    >
      <span className="cn-stepper-number">{children ?? step}</span>
      <span className="cn-stepper-check-frame absolute inset-0 flex items-center justify-center">
        <StepperCheck />
      </span>
      {state === "complete" ? <span className="sr-only">, done</span> : null}
    </span>
  )
}

/** Holds a step's title and description, stacked. */
function StepperContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stepper-content"
      className={cn("cn-stepper-content flex min-w-0 flex-col", className)}
      {...props}
    />
  )
}

function StepperTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stepper-title"
      className={cn("cn-stepper-title", className)}
      {...props}
    />
  )
}

function StepperDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stepper-description"
      className={cn("cn-stepper-description", className)}
      {...props}
    />
  )
}

function StepperSeparator({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stepper-separator"
      aria-hidden
      className={cn("cn-stepper-separator relative overflow-hidden", className)}
      {...props}
    >
      <span className="cn-stepper-separator-fill absolute inset-0" />
    </span>
  )
}

export {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperContent,
  StepperTitle,
  StepperDescription,
  StepperSeparator,
}
