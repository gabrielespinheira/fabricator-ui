import { cn } from "@/lib/utils"

import { PreviewColumn, PreviewStage } from "./preview-stage"

const ACTIVITY = [
  { name: "Maya Chen", action: "merged Pricing page", time: "2m" },
  { name: "Leo Park", action: "commented on Onboarding", time: "8m" },
  { name: "Ana Silva", action: "uploaded hero.webp", time: "14m" },
  { name: "Sam Okafor", action: "opened Billing bug", time: "21m" },
  { name: "Iris Novak", action: "renamed Q3 roadmap", time: "33m" },
  { name: "Tom Reyes", action: "closed 4 issues", time: "1h" },
  { name: "Maya Chen", action: "invited 2 people", time: "1h" },
  { name: "Leo Park", action: "published Changelog", time: "2h" },
  { name: "Ana Silva", action: "archived Old brand", time: "3h" },
  { name: "Sam Okafor", action: "deployed v0.9.0", time: "4h" },
  { name: "Iris Novak", action: "edited Settings copy", time: "5h" },
  { name: "Tom Reyes", action: "added a webhook", time: "6h" },
]

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

function ActivityList({ isFaded, label }: { isFaded: boolean; label: string }) {
  return (
    <div className="rounded-xl bg-surface-3 shadow-surface-3 has-focus-visible:ring-2 has-focus-visible:ring-focus-ring">
      <div
        tabIndex={0}
        role="region"
        aria-label={label}
        className={cn(
          "no-scrollbar h-72 overflow-y-auto outline-none",
          isFaded && "scroll-fade"
        )}
      >
        <ul className="flex flex-col gap-0.5 p-1.5">
          {ACTIVITY.map((item, index) => (
            <li
              key={index}
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
      </div>
    </div>
  )
}

export function ScrollFadePreview() {
  return (
    <PreviewStage caption="Scroll both lists. The faded one sharpens its top edge at the start and its bottom edge at the end.">
      <div className="grid w-full max-w-lg grid-cols-1 gap-6 sm:grid-cols-2">
        <PreviewColumn label="Clipped" note="Rows are cut at a hard line">
          <ActivityList isFaded={false} label="Activity, clipped" />
        </PreviewColumn>
        <PreviewColumn
          label="scroll-fade"
          note="Rows dissolve where more waits"
        >
          <ActivityList isFaded label="Activity, with scroll fade" />
        </PreviewColumn>
      </div>
    </PreviewStage>
  )
}
