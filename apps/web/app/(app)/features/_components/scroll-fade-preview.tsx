"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/styles/base-fabricator/ui/label"
import { Switch } from "@/styles/base-fabricator/ui/switch"

import { PreviewStage } from "./preview-stage"

const FILTERS = [
  "All",
  "Mentions",
  "Comments",
  "Uploads",
  "Deploys",
  "Issues",
  "Invites",
  "Billing",
]

const DAYS = [
  {
    day: "Today",
    items: [
      { name: "Maya Chen", action: "merged Pricing page", time: "2m" },
      { name: "Leo Park", action: "commented on Onboarding", time: "8m" },
      { name: "Ana Silva", action: "uploaded hero.webp", time: "14m" },
      { name: "Sam Okafor", action: "opened Billing bug", time: "21m" },
      { name: "Iris Novak", action: "renamed Q3 roadmap", time: "33m" },
    ],
  },
  {
    day: "Yesterday",
    items: [
      { name: "Tom Reyes", action: "closed 4 issues", time: "18:40" },
      { name: "Maya Chen", action: "invited 2 people", time: "16:12" },
      { name: "Leo Park", action: "published Changelog", time: "11:05" },
      { name: "Ana Silva", action: "archived Old brand", time: "09:30" },
    ],
  },
  {
    day: "Monday",
    items: [
      { name: "Sam Okafor", action: "deployed v0.9.0", time: "17:55" },
      { name: "Iris Novak", action: "edited Settings copy", time: "14:20" },
      { name: "Tom Reyes", action: "added a webhook", time: "10:02" },
    ],
  },
]

// Where the list starts, so both of its edges fade before anyone scrolls.
const INITIAL_SCROLL = 140

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

function ActivityPanel({ isFaded }: { isFaded: boolean }) {
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: INITIAL_SCROLL })
  }, [])

  // The mask clips a scroller's own focus ring, so the panel draws it.
  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-surface-3 shadow-surface-3 has-focus-visible:ring-2 has-focus-visible:ring-focus-ring">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <span className="text-[14px] font-medium text-foreground">
          Activity
        </span>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          12 new
        </span>
      </div>
      <div
        role="region"
        aria-label="Activity filters"
        tabIndex={0}
        className={cn(
          "mt-3 no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3 outline-none",
          isFaded && "scroll-fade-x"
        )}
      >
        {FILTERS.map((filter, index) => (
          <span
            key={filter}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[12px]",
              index === 0
                ? "bg-foreground text-background"
                : "bg-hover text-foreground"
            )}
          >
            {filter}
          </span>
        ))}
      </div>
      <div
        ref={listRef}
        role="region"
        aria-label="Activity"
        tabIndex={0}
        className={cn(
          "no-scrollbar h-72 overflow-y-auto outline-none",
          isFaded && "scroll-fade scroll-fade-inset-t-8"
        )}
      >
        {DAYS.map(({ day, items }) => (
          <section key={day} aria-label={day}>
            <h3 className="sticky top-0 z-10 flex h-8 items-center bg-surface-3 px-4 text-[12px] font-medium text-muted-foreground">
              {day}
            </h3>
            <ul className="flex flex-col px-2 pb-2">
              {items.map((item) => (
                <li
                  key={`${day}-${item.name}-${item.time}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
                    {getInitials(item.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] text-foreground">
                      {item.name}
                    </span>
                    <span className="truncate text-[12px] text-muted-foreground">
                      {item.action}
                    </span>
                  </span>
                  <span className="text-[12px] text-muted-foreground tabular-nums">
                    {item.time}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export function ScrollFadePreview() {
  const [isFaded, setIsFaded] = React.useState(true)

  return (
    <PreviewStage
      caption={
        isFaded
          ? "Rows dissolve under the day headers and at the bottom; the filters fade at the edge that scrolls."
          : "Without the fade, rows are cut at a hard line and the filters end mid-word."
      }
      controls={
        <span className="flex items-center gap-2">
          <Switch
            id="feature-scroll-fade"
            checked={isFaded}
            onCheckedChange={setIsFaded}
          />
          <Label htmlFor="feature-scroll-fade">Scroll fade</Label>
        </span>
      }
    >
      <ActivityPanel isFaded={isFaded} />
    </PreviewStage>
  )
}
