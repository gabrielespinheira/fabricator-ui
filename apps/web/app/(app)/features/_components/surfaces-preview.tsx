"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"

import { PreviewStage } from "./preview-stage"

type View = "layers" | "flat"

const VIEWS: Record<View, string> = { layers: "Layers", flat: "Flat" }

function isView(value: unknown): value is View {
  return value === "layers" || value === "flat"
}

// Written out in full so Tailwind generates them.
const LEVEL_CLASSES: Record<number, string> = {
  1: "bg-surface-1 shadow-surface-1",
  2: "bg-surface-2 shadow-surface-2",
  3: "bg-surface-3 shadow-surface-3",
  4: "bg-surface-4 shadow-surface-4",
  5: "bg-surface-5 shadow-surface-5",
}

// How far apart the levels float in the layered view.
const LIFT = 46

// Every layer sits in one 3D scene: flat, it is an ordinary screen; layered,
// the scene tilts and each level rises by its height on the ladder.
function Layer({
  level,
  name,
  isLayered,
  className,
  children,
}: {
  level: number
  name: string
  isLayered: boolean
  className: string
  children?: React.ReactNode
}) {
  return (
    <div
      style={{ transform: `translateZ(${isLayered ? level * LIFT : 0}px)` }}
      className={cn(
        "absolute transition-transform duration-(--motion-move) ease-move [transform-style:preserve-3d] motion-reduce:transition-none",
        LEVEL_CLASSES[level],
        className
      )}
    >
      {children}
      <span
        className={cn(
          "absolute -top-2.5 -right-2 rounded-full bg-foreground px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-background tabular-nums transition-opacity duration-(--motion-move) motion-reduce:transition-none",
          isLayered ? "opacity-100" : "opacity-0"
        )}
      >
        {level} · {name}
      </span>
    </div>
  )
}

export function SurfacesPreview() {
  const [view, setView] = React.useState<View>("layers")
  const isLayered = view === "layers"

  return (
    <PreviewStage
      className="[perspective:1800px]"
      caption="No borders anywhere: each edge is its level's shadow. Switch the theme to see dark mode lift each level a step lighter."
      controls={
        <Tabs
          value={view}
          onValueChange={(value) => {
            if (isView(value)) setView(value)
          }}
        >
          <TabsList aria-label="Surfaces view">
            {Object.entries(VIEWS).map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      <div
        role="img"
        aria-label="A page, sidebar, card, active tab and dialog, each on its own surface level"
        className={cn(
          "relative aspect-[7/5] w-full max-w-[26rem] transition-transform duration-(--motion-move) ease-move [transform-style:preserve-3d] motion-reduce:transition-none",
          isLayered && "[transform:rotateX(38deg)_rotateZ(-22deg)_scale(0.84)]"
        )}
      >
        <Layer
          level={1}
          name="Page"
          isLayered={isLayered}
          className="inset-0 rounded-2xl"
        />
        <Layer
          level={2}
          name="Sidebar"
          isLayered={isLayered}
          className="inset-y-0 left-0 flex w-[30%] flex-col gap-1 rounded-l-2xl p-2"
        >
          <span className="px-2 py-1 text-[11px] text-muted-foreground">
            Workspace
          </span>
          <span className="rounded-md bg-active px-2 py-1 text-[12px] text-foreground">
            Threads
          </span>
          <span className="px-2 py-1 text-[12px] text-muted-foreground">
            Agents
          </span>
          <span className="px-2 py-1 text-[12px] text-muted-foreground">
            Runs
          </span>
        </Layer>
        <div className="absolute top-[7%] left-[35%] h-[13%] w-[42%] rounded-lg bg-muted" />
        <Layer
          level={4}
          name="Active tab"
          isLayered={isLayered}
          className="top-[8.5%] left-[36%] flex h-[10%] w-[20%] items-center justify-center rounded-md text-[11px] text-foreground"
        >
          Overview
        </Layer>
        <Layer
          level={3}
          name="Card"
          isLayered={isLayered}
          className="top-[27%] right-[5%] left-[35%] flex flex-col gap-1 rounded-xl p-3"
        >
          <span className="text-[12px] text-muted-foreground">
            Runs this week
          </span>
          <span className="text-[22px] font-semibold text-foreground tabular-nums">
            128
          </span>
          <span className="text-[11px] text-muted-foreground">4 failed</span>
        </Layer>
        <Layer
          level={5}
          name="Dialog"
          isLayered={isLayered}
          className="right-[9%] bottom-[8%] flex w-[48%] flex-col gap-1 rounded-xl p-3"
        >
          <span className="text-[12px] font-semibold text-foreground">
            Rerun failed jobs?
          </span>
          <span className="text-[11px] text-muted-foreground">
            Four jobs will run again.
          </span>
        </Layer>
      </div>
    </PreviewStage>
  )
}
