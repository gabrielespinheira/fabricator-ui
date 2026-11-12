"use client"

import {
  PreviewRail,
  type PreviewRailItem,
} from "@/styles/base-fabricator/ui/preview-rail"

const CHAPTERS = [
  { value: "0", label: "Welcome", time: "0:00" },
  { value: "45", label: "Setting up the project", time: "0:45" },
  { value: "190", label: "Your first screen", time: "3:10" },
  { value: "372", label: "Forms and validation", time: "6:12" },
  { value: "530", label: "Dark mode", time: "8:50" },
  { value: "641", label: "Motion and density", time: "10:41" },
  { value: "802", label: "Shipping to the App Store", time: "13:22" },
  { value: "955", label: "Wrapping up", time: "15:55" },
]

const TIME_BY_VALUE = new Map(
  CHAPTERS.map((chapter) => [chapter.value, chapter.time])
)

function renderChapter(item: PreviewRailItem) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground tabular-nums">
        {TIME_BY_VALUE.get(item.value)}
      </span>
      <span className="font-medium text-foreground">{item.label}</span>
    </div>
  )
}

export function PreviewRailChapters() {
  return (
    <div className="flex w-full justify-center pt-20">
      <PreviewRail
        items={CHAPTERS}
        orientation="horizontal"
        renderPreview={renderChapter}
        aria-label="Chapters"
      />
    </div>
  )
}
