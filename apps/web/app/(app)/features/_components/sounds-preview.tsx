"use client"

import * as React from "react"

import { useSiteSetting } from "@/lib/site-settings"
import { playSound, type SoundName } from "@/styles/base-fabricator/lib/sounds"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import { Label } from "@/styles/base-fabricator/ui/label"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"

import { PreviewStage } from "./preview-stage"

const MATERIALS: { material: string; usedBy: string; sound: SoundName }[] = [
  { material: "Wood", usedBy: "Buttons", sound: "press" },
  { material: "Mechanism", usedBy: "Checkboxes", sound: "check" },
  { material: "Liquid", usedBy: "Switches", sound: "toggle-on" },
  { material: "Glass", usedBy: "Menu rows", sound: "tick" },
  { material: "Bells", usedBy: "Tabs", sound: "note" },
  { material: "Air", usedBy: "Sheets", sound: "slide-in" },
]

const BARS = [0.45, 0.8, 1, 0.65, 0.9, 0.5, 0.3]

// The bars swell once when the tile plays, unless motion is reduced.
function pulseBars(tile: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  tile.querySelectorAll<HTMLElement>("[data-bar]").forEach((bar, index) => {
    bar.animate(
      [
        { transform: "scaleY(0.5)" },
        { transform: "scaleY(1)", offset: 0.25 },
        { transform: "scaleY(0.5)" },
      ],
      { duration: 420, delay: index * 22, easing: "ease-out" }
    )
  })
}

function MaterialTile({ material, usedBy, sound }: (typeof MATERIALS)[number]) {
  return (
    <button
      type="button"
      onClick={(event) => {
        // Pressing a tile is an explicit request to hear it, even with sounds off.
        playSound(sound, { force: true })
        pulseBars(event.currentTarget)
      }}
      className="group/tile flex flex-col gap-3 rounded-xl bg-surface-3 p-3 text-start shadow-surface-3 transition-[scale] duration-feedback ease-feedback outline-none focus-visible:ring-2 focus-visible:ring-focus-ring active:scale-(--motion-press-scale)"
    >
      <span
        aria-hidden="true"
        className="flex h-6 items-center gap-[3px] text-muted-foreground transition-colors group-hover/tile:text-foreground"
      >
        {BARS.map((height, index) => (
          <span
            key={index}
            data-bar=""
            style={{ height: `${height * 100}%` }}
            className="w-[3px] origin-center scale-y-50 rounded-full bg-current"
          />
        ))}
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-medium text-foreground">
          {material}
        </span>
        <span className="text-[12px] text-muted-foreground">{usedBy}</span>
      </span>
    </button>
  )
}

export function SoundsPreview() {
  const [isSoundOn, setIsSoundOn] = useSiteSetting("sound")

  return (
    <PreviewStage
      className="flex-col items-stretch gap-8"
      caption="Press a tile to hear its material. The components below play through the site's own sound setting."
      controls={
        <span className="flex items-center gap-2">
          <Switch
            id="feature-sounds"
            checked={isSoundOn}
            onCheckedChange={setIsSoundOn}
          />
          <Label htmlFor="feature-sounds">Sounds</Label>
        </span>
      }
    >
      <div
        data-sound="none"
        className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {MATERIALS.map((material) => (
          <MaterialTile key={material.material} {...material} />
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-4">
        <span className="flex items-center gap-2">
          <Checkbox id="feature-sounds-checkbox" defaultChecked />
          <Label htmlFor="feature-sounds-checkbox">Weekly digest</Label>
        </span>
        <Tabs defaultValue="day">
          <TabsList aria-label="Range">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </PreviewStage>
  )
}
