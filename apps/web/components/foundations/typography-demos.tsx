"use client"

import * as React from "react"

import { DemoColumn, DemoFrame } from "@/components/foundations/demo-frame"

// Class names are written out in full so Tailwind generates them.
const WEIGHTS = [
  {
    utility: "weight-normal",
    value: "wght 400 · opsz 14",
    className: "weight-normal",
  },
  {
    utility: "weight-medium",
    value: "wght 450 · opsz 15",
    className: "weight-medium",
  },
  {
    utility: "weight-semibold",
    value: "wght 550 · opsz 18",
    className: "weight-semibold",
  },
  {
    utility: "weight-bold",
    value: "wght 700 · opsz 25",
    className: "weight-bold",
  },
]

/** The four weight utilities. */
export function TypographyWeights() {
  return (
    <DemoFrame className="flex-col items-stretch gap-0 p-0 sm:p-0">
      {WEIGHTS.map(({ utility, value, className }) => (
        <div
          key={utility}
          className="flex items-baseline justify-between gap-6 border-b px-6 py-4 last:border-b-0"
        >
          <span className={`text-[22px] text-foreground ${className}`}>
            Refined, functional, fluid
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <code className="text-[12px] text-foreground">{utility}</code>
            <span className="text-[11px] text-muted-foreground">{value}</span>
          </span>
        </div>
      ))}
    </DemoFrame>
  )
}

const ROLES = [
  {
    role: "Display",
    size: "28px",
    className: "text-[28px] font-semibold tracking-tight",
  },
  { role: "Title", size: "16px", className: "text-[16px] font-bold" },
  { role: "Subtitle", size: "14px", className: "text-[14px] font-medium" },
  { role: "Body", size: "13px", className: "text-[13px]" },
  {
    role: "Caption",
    size: "12px",
    className: "text-[12px] text-muted-foreground",
  },
]

/** The type roles used across the components. */
export function TypographyRoles() {
  return (
    <DemoFrame className="flex-col items-stretch gap-0 p-0 sm:p-0">
      {ROLES.map(({ role, size, className }) => (
        <div
          key={role}
          className="flex items-baseline justify-between gap-6 border-b px-6 py-3 last:border-b-0"
        >
          <span className={`text-foreground ${className}`}>{role}</span>
          <span className="text-[12px] text-muted-foreground">{size}</span>
        </div>
      ))}
    </DemoFrame>
  )
}

const OPTIONS = ["Spring animations", "Fluid hover", "Thin scrollbars"]

function WeightList({ animated }: { animated: boolean }) {
  const [checked, setChecked] = React.useState<string[]>([OPTIONS[0]])
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface-3 p-1 shadow-surface-3">
      {OPTIONS.map((option) => {
        const on = checked.includes(option)
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() =>
              setChecked((current) =>
                on
                  ? current.filter((item) => item !== option)
                  : [...current, option]
              )
            }
            className={
              animated
                ? "flex h-9 items-center rounded-lg px-3 text-start text-[13px] text-muted-foreground transition-[font-variation-settings,color] duration-moderate ease-spring outline-none weight-normal hover:bg-hover focus-visible:ring-1 focus-visible:ring-ring aria-pressed:text-foreground aria-pressed:weight-semibold"
                : "flex h-9 items-center rounded-lg px-3 text-start text-[13px] font-normal text-muted-foreground outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-ring aria-pressed:font-semibold aria-pressed:text-foreground"
            }
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

/** Weight as state: a jump next to a weight utility transition. */
export function TypographyWeightState() {
  return (
    <DemoFrame
      className="items-start"
      caption="Click the rows. Weight marks persistent state such as checked or selected; hover only changes colour."
    >
      <DemoColumn label="font-semibold" note="Snaps to the new weight">
        <WeightList animated={false} />
      </DemoColumn>
      <DemoColumn
        label="weight-semibold"
        note="Transitions wght and opsz together"
      >
        <WeightList animated />
      </DemoColumn>
    </DemoFrame>
  )
}
