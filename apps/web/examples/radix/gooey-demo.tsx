"use client"

import * as React from "react"
import { animate, useReducedMotion } from "motion/react"

import { Badge } from "@/styles/radix-fabricator/ui/badge"
import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  Gooey,
  GooeyProvider,
  type GooeySettings,
} from "@/styles/radix-fabricator/ui/gooey"
import { Slider } from "@/styles/radix-fabricator/ui/slider"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/radix-fabricator/ui/tabs"

function GooeySurfaceExample({
  effect,
  isOff,
}: {
  effect: "morph" | "melt"
  isOff: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const current = React.useRef(0)
  const isReduced = useReducedMotion()

  React.useEffect(() => {
    if (isOff || isReduced) return
    const animation = animate(current.current, isOpen ? 1 : 0, {
      duration: 0.28,
      onUpdate: (value) => {
        current.current = value
        setProgress(value)
      },
    })
    return () => animation.stop()
  }, [isOpen, isOff, isReduced])

  const isMorph = effect === "morph"
  return (
    <div className="flex min-h-24 flex-wrap items-center gap-3">
      <Button
        variant="outline"
        aria-pressed={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isMorph ? "Split actions" : "Blend badges"}
      </Button>
      <div className="relative isolate flex h-16 w-44 items-center justify-center gap-1">
        <Gooey
          effect={effect}
          progress={progress}
          fill={isMorph ? "var(--muted)" : "var(--info-surface-4)"}
          accentFill={isMorph ? undefined : "var(--success-surface-4)"}
          className="absolute inset-0 -z-10 size-full"
        />
        {isMorph ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(!isOpen)}
            >
              Add
            </Button>
            {isOpen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                Import
              </Button>
            )}
          </>
        ) : (
          <>
            <Badge
              variant="outline"
              className="border-transparent bg-transparent"
            >
              Draft
            </Badge>
            <Badge
              variant="outline"
              className="border-transparent bg-transparent"
            >
              Ready
            </Badge>
          </>
        )}
      </div>
    </div>
  )
}

export function GooeyDemo() {
  const [mode, setMode] = React.useState<GooeySettings["mode"]>("expressive")
  const [waviness, setWaviness] = React.useState(0.35)
  return (
    <GooeyProvider mode={mode} waviness={waviness}>
      <div data-slot="gooey-demo" className="grid w-full max-w-xl gap-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-2 text-sm">
            Gooey
            <select
              value={mode}
              onChange={(event) => {
                const next = event.target.value
                if (
                  next === "off" ||
                  next === "subtle" ||
                  next === "expressive"
                )
                  setMode(next)
              }}
              className="h-9 rounded-md border bg-background px-2"
            >
              <option value="off">Off</option>
              <option value="subtle">Subtle</option>
              <option value="expressive">Expressive</option>
            </select>
          </label>
          <div className="grid w-36 gap-2 text-sm">
            <span aria-hidden>Waviness · {Math.round(waviness * 100)}%</span>
            <Slider
              aria-label="Waviness"
              gooey={false}
              min={0}
              max={100}
              step={1}
              value={[Math.round(waviness * 100)]}
              onValueChange={([value]) => setWaviness(value / 100)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Move · Tabs</p>
          <Tabs defaultValue="overview">
            <TabsList aria-label="Project views">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              Your project at a glance.
            </TabsContent>
            <TabsContent value="activity">
              Recent changes to your project.
            </TabsContent>
            <TabsContent value="files">
              Files shared with your team.
            </TabsContent>
          </Tabs>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Bend · Slider</p>
          <Slider aria-label="Volume" defaultValue={[45]} />
        </div>
        <div>
          <p className="text-sm font-medium">Morph · Button</p>
          <GooeySurfaceExample effect="morph" isOff={mode === "off"} />
        </div>
        <div>
          <p className="text-sm font-medium">Melt · Badge</p>
          <GooeySurfaceExample effect="melt" isOff={mode === "off"} />
        </div>
      </div>
    </GooeyProvider>
  )
}
