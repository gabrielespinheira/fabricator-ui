import { DemoFrame } from "@/components/foundations/demo-frame"

// Class names are written out in full so Tailwind generates them.
const LEVELS = [
  { level: 1, className: "bg-surface-1 shadow-surface-1", use: "Page" },
  { level: 2, className: "bg-surface-2 shadow-surface-2", use: "Sidebar" },
  {
    level: 3,
    className: "bg-surface-3 shadow-surface-3",
    use: "Card, popover",
  },
  { level: 4, className: "bg-surface-4 shadow-surface-4", use: "Active tab" },
  { level: 5, className: "bg-surface-5 shadow-surface-5", use: "Dialog" },
  {
    level: 6,
    className: "bg-surface-6 shadow-surface-6",
    use: "Above a dialog",
  },
  {
    level: 7,
    className: "bg-surface-7 shadow-surface-7",
    use: "Menu in a dialog",
  },
  { level: 8, className: "bg-surface-8 shadow-surface-8", use: "Top" },
]

/** The eight levels, in the current theme. */
export function SurfaceLadder() {
  return (
    <DemoFrame caption="Switch the theme to compare. Neutral light flattens to white from level 3 and lets the shadow carry the elevation; dark lifts each level a step lighter. With a base colour, every level in both themes carries the tint.">
      <div className="grid w-full grid-cols-4 gap-4 sm:grid-cols-8">
        {LEVELS.map(({ level, className, use }) => (
          <div key={level} className="flex flex-col items-center gap-2">
            <div
              className={`flex aspect-square w-full items-center justify-center rounded-xl text-[13px] font-medium text-foreground ${className}`}
            >
              {level}
            </div>
            <span className="text-center text-[11px] leading-tight text-muted-foreground">
              {use}
            </span>
          </div>
        ))}
      </div>
    </DemoFrame>
  )
}

/** How the levels nest in a real interface. */
export function SurfaceNesting() {
  return (
    <DemoFrame caption="Page (1), sidebar (2), card (3), active tab (4) and a dialog (5) over it. No borders: every edge is the shadow's 1px ring.">
      <div className="relative flex h-64 w-full max-w-lg overflow-hidden rounded-xl bg-surface-1 shadow-surface-1">
        <div className="flex w-32 flex-col gap-1 bg-surface-2 p-2 shadow-surface-2">
          <span className="px-2 py-1 text-[12px] text-muted-foreground">
            Workspace
          </span>
          <span className="rounded-lg bg-active px-2 py-1.5 text-[13px] text-foreground">
            Threads
          </span>
          <span className="rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground">
            Agents
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex w-fit rounded-xl bg-muted p-1">
            <span className="rounded-lg bg-surface-4 px-3 py-1 text-[12px] text-foreground shadow-surface-4">
              Overview
            </span>
            <span className="px-3 py-1 text-[12px] text-muted-foreground">
              Logs
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-surface-3 p-4 shadow-surface-3">
            <span className="text-[14px] font-medium text-foreground">
              Runs this week
            </span>
            <span className="text-[12px] text-muted-foreground">
              128 runs, 4 failed
            </span>
          </div>
        </div>
        <div className="absolute inset-0 flex items-end justify-end bg-black/10 p-6 dark:bg-black/30">
          <div className="flex w-56 flex-col gap-1 rounded-xl bg-surface-5 p-4 shadow-surface-5">
            <span className="text-[14px] font-semibold text-foreground">
              Rerun failed jobs?
            </span>
            <span className="text-[12px] text-muted-foreground">
              Four jobs will run again.
            </span>
          </div>
        </div>
      </div>
    </DemoFrame>
  )
}

const OVERLAYS = [
  { name: "hover", className: "bg-hover", use: "Lit rows, ghost hover" },
  { name: "active", className: "bg-active", use: "Pressed, selected" },
  { name: "selected", className: "bg-selected", use: "Solid selection" },
  { name: "tint", className: "bg-tint", use: "Secondary fill" },
  {
    name: "destructive-light",
    className: "bg-destructive-light",
    use: "Destructive fill",
  },
]

/** Interaction overlays on a raised surface. */
export function SurfaceOverlays() {
  return (
    <DemoFrame>
      <div className="flex w-full max-w-md flex-col gap-1 rounded-xl bg-surface-3 p-1 shadow-surface-3">
        {OVERLAYS.map(({ name, className, use }) => (
          <div
            key={name}
            className={`flex h-9 items-center justify-between rounded-lg px-3 ${className}`}
          >
            <code className="text-[13px] text-foreground">bg-{name}</code>
            <span className="text-[12px] text-muted-foreground">{use}</span>
          </div>
        ))}
      </div>
    </DemoFrame>
  )
}
