"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { DemoColumn, DemoFrame } from "@/components/foundations/demo-frame"
import { Button } from "@/styles/base-fabricator/ui/button"

// Class names are written out in full so Tailwind generates them.
const TIERS = [
  {
    name: "fast",
    timing: "80ms enter · 60ms exit",
    use: "Hover, focus, fades, popups",
    ball: "duration-60 ease-exit data-on:duration-80 data-on:ease-spring",
  },
  {
    name: "moderate",
    timing: "160ms enter · 120ms exit",
    use: "Selection, tabs, switches, sheets",
    ball: "duration-120 ease-exit data-on:duration-160 data-on:ease-spring",
  },
  {
    name: "slow",
    timing: "240ms enter · 160ms exit, with bounce",
    use: "Dialogs",
    ball: "duration-160 ease-exit data-on:duration-240 data-on:ease-spring-bounce",
  },
]

/** The three spring tiers, fired together. */
export function MotionTiers() {
  const [on, setOn] = React.useState(false)
  return (
    <DemoFrame
      className="flex-col items-stretch gap-5"
      caption="Each ball enters on its tier's spring and returns on the exit tween, one step quicker."
    >
      {TIERS.map((tier) => (
        <button
          key={tier.name}
          type="button"
          onClick={() => setOn((value) => !value)}
          className="group/track flex flex-col gap-2 rounded-lg text-start outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="flex items-baseline justify-between gap-4 px-1">
            <span className="text-[13px] font-medium text-foreground">
              {tier.name}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {tier.timing}
            </span>
          </div>
          <div className="@container relative h-9 rounded-full bg-muted p-1">
            <span
              data-on={on ? "" : undefined}
              className={cn(
                "block size-7 rounded-full bg-foreground transition-transform data-on:translate-x-[calc(100cqw-1.75rem)] motion-reduce:transition-none",
                tier.ball
              )}
            />
          </div>
          <span className="px-1 text-[12px] text-muted-foreground">
            {tier.use}
          </span>
        </button>
      ))}
      <Button
        variant="secondary"
        size="sm"
        className="self-center"
        onClick={() => setOn((value) => !value)}
      >
        Replay
      </Button>
    </DemoFrame>
  )
}

function Panel({ open, exit }: { open: boolean; exit: "same" | "faster" }) {
  return (
    <div className="flex h-36 w-full items-center justify-center rounded-xl bg-muted/50">
      <div
        data-open={open ? "" : undefined}
        className={cn(
          "flex w-40 flex-col gap-1 rounded-xl bg-surface-5 p-4 opacity-0 shadow-surface-5 transition-[opacity,scale] motion-reduce:scale-100 data-open:scale-100 data-open:opacity-100 data-open:duration-240 data-open:ease-spring-bounce",
          exit === "same"
            ? "scale-[0.97] duration-240 ease-spring-bounce"
            : "scale-[0.97] duration-160 ease-exit"
        )}
      >
        <span className="text-[13px] font-semibold text-foreground">
          Invite people
        </span>
        <span className="text-[12px] text-muted-foreground">
          Opens on the slow spring.
        </span>
      </div>
    </div>
  )
}

/** Same enter, different exits. */
export function MotionExit() {
  const [left, setLeft] = React.useState(false)
  const [right, setRight] = React.useState(false)
  return (
    <DemoFrame
      className="items-start"
      caption="Both panels open on the slow spring. Close the left one, then the right one: the left lingers on the way out."
    >
      <DemoColumn
        label="Exit on the same spring"
        note="Drags on the way out"
        className="w-60"
      >
        <Panel open={left} exit="same" />
        <Button variant="outline" size="sm" onClick={() => setLeft((v) => !v)}>
          {left ? "Close" : "Open"}
        </Button>
      </DemoColumn>
      <DemoColumn
        label="Exit one tier quicker"
        note="Gone before you look for it"
        className="w-60"
      >
        <Panel open={right} exit="faster" />
        <Button variant="outline" size="sm" onClick={() => setRight((v) => !v)}>
          {right ? "Close" : "Open"}
        </Button>
      </DemoColumn>
    </DemoFrame>
  )
}
