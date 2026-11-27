"use client"

import {
  AutomationMenuItems,
  type AutomationMenuEntry,
} from "@/registry/bases/__base__/blocks/automation-01/components/automation-controls"
import { automationIcons } from "@/registry/bases/__base__/blocks/automation-01/components/automation-icons"
import {
  formatDuration,
  type AutomationRun,
} from "@/registry/bases/__base__/blocks/automation-01/lib/automation-model"
import {
  AppShellHeader,
  AppShellHeaderActions,
  AppShellPanelTrigger,
} from "@/registry/bases/__base__/ui/app-shell"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"

/** What the last test run did, in a few words. */
function RunState({ run }: { run: AutomationRun | null }) {
  if (!run) return null
  return (
    <span
      role="status"
      className="flex min-w-0 items-center gap-(--density-6) text-(length:--density-text-13) text-muted-foreground @max-xl/automation-header:hidden"
    >
      {run.status === "running" ? (
        <>
          <Spinner variant="ring" aria-hidden />
          <span className="truncate">Testing</span>
        </>
      ) : (
        <span className="truncate tabular-nums">
          {run.status === "stopped"
            ? "Test run stopped"
            : `Test passed · ${run.path.length} steps · ${formatDuration(run.durationMs)}`}
        </span>
      )}
    </span>
  )
}

/** The workflow's name and state, Test run, and the workflow's menu. */
export function AutomationHeader({
  name,
  issueCount,
  run,
  menu,
  onRun,
  onStop,
}: {
  name: string
  issueCount: number
  run: AutomationRun | null
  menu: AutomationMenuEntry[][]
  onRun: () => void
  onStop: () => void
}) {
  const isRunning = run?.status === "running"
  return (
    <AppShellHeader className="@container/automation-header">
      <div className="flex min-w-0 flex-1 items-center gap-(--density-8)">
        <h1 className="truncate text-(length:--density-text-16) weight-semibold">
          {name}
        </h1>
        {issueCount > 0 ? (
          <Badge variant="warning" className="shrink-0">
            {issueCount === 1 ? "1 issue" : `${issueCount} issues`}
          </Badge>
        ) : (
          <Badge variant="success" className="shrink-0">
            Live
          </Badge>
        )}
        <RunState run={run} />
      </div>
      <AppShellHeaderActions
        primaryAction={
          isRunning
            ? { id: "stop", label: "Stop test", onSelect: onStop }
            : {
                id: "run",
                label: "Test run",
                icon: automationIcons.play,
                shortcut: "mod+enter",
                onSelect: onRun,
              }
        }
        menuLabel="Workflow options"
        menu={<AutomationMenuItems groups={menu} />}
      />
      <AppShellPanelTrigger panel="step" />
    </AppShellHeader>
  )
}
