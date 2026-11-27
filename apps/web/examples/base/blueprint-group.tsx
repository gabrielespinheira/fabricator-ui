"use client"

import * as React from "react"
import {
  BellIcon,
  ChartLineIcon,
  LockIcon,
  PlugIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react"

import {
  Blueprint,
  BlueprintGroup,
} from "@/styles/base-fabricator/ui/blueprint"
import { Button } from "@/styles/base-fabricator/ui/button"

const FEATURES = [
  {
    title: "Realtime sync",
    text: "Every edit lands everywhere.",
    icon: ZapIcon,
  },
  { title: "Roles", text: "Owners, editors and guests.", icon: UsersIcon },
  { title: "Audit log", text: "Who changed what, and when.", icon: LockIcon },
  { title: "Alerts", text: "Hear about it before users do.", icon: BellIcon },
  { title: "Insights", text: "Usage by team and by day.", icon: ChartLineIcon },
  { title: "Integrations", text: "Slack, GitHub and Linear.", icon: PlugIcon },
]

export function BlueprintGroupExample() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="flex w-full flex-col items-center gap-8 py-8">
      <BlueprintGroup
        key={run}
        className="grid w-full max-w-2xl gap-6 sm:grid-cols-3"
      >
        {FEATURES.map(({ title, text, icon: Icon }) => (
          <Blueprint key={title}>
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
              <div className="grid size-9 place-items-center rounded-lg bg-muted">
                <Icon className="size-4" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          </Blueprint>
        ))}
      </BlueprintGroup>
      <Button variant="outline" size="sm" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  )
}
