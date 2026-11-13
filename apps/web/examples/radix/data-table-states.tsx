"use client"

import * as React from "react"
import { CloudOffIcon, RotateCwIcon } from "lucide-react"

import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableOption,
} from "@/styles/radix-fabricator/hooks/use-data-table"
import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  DataTable,
  DataTableContent,
  DataTableToolbar,
} from "@/styles/radix-fabricator/ui/data-table"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/styles/radix-fabricator/ui/empty"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/radix-fabricator/ui/toggle-group"

type Deploy = {
  id: string
  branch: string
  status: string
  author: string
  duration: number
  created: string
}

const STATUSES: DataTableOption[] = [
  { value: "ready", label: "Ready", tone: "success" },
  { value: "building", label: "Building", tone: "info" },
  { value: "failed", label: "Failed", tone: "destructive" },
]

const NOW = Date.UTC(2026, 10, 12, 12)

const DEPLOYS: Deploy[] = Array.from({ length: 24 }, (_, index) => ({
  id: `dpl-${index + 1}`,
  branch: ["main", "feat/data-table", "fix/checkout", "chore/deps"][index % 4],
  status: STATUSES[index % 7 === 3 ? 2 : index % 5 === 1 ? 1 : 0].value,
  author: ["Maya Chen", "Leo Hartman", "Priya Raman"][index % 3],
  duration: 32 + ((index * 41) % 180),
  created: new Date(NOW - index * 5_400_000).toISOString(),
}))

const column = createDataTableColumnHelper<Deploy>()

const columns = column.columns([
  column.accessor("branch", {
    meta: { type: "text", label: "Branch", primary: true },
  }),
  column.accessor("status", {
    meta: { type: "status", label: "Status", options: STATUSES },
  }),
  column.accessor("author", {
    meta: {
      type: "person",
      label: "Author",
      options: ["Maya Chen", "Leo Hartman", "Priya Raman"].map((name) => ({
        value: name,
        label: name,
      })),
    },
  }),
  column.accessor("duration", {
    meta: { type: "number", label: "Duration (s)" },
  }),
  column.accessor("created", {
    meta: { type: "date", label: "Created", format: { relative: true } },
  }),
])

const STATES = ["ready", "loading", "refetching", "empty", "error"] as const
type State = (typeof STATES)[number]

function isState(value: unknown): value is State {
  return STATES.some((state) => state === value)
}

export default function DataTableStatesExample() {
  const [state, setState] = React.useState<State>("loading")
  const data = state === "ready" || state === "refetching" ? DEPLOYS : []
  const table = useDataTable({ data, columns, now: NOW })

  return (
    <DataTable className="h-[420px] w-full">
      <DataTableToolbar>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={state}
          onValueChange={(value) => {
            if (isState(value)) setState(value)
          }}
          aria-label="Table state"
        >
          {STATES.map((value) => (
            <ToggleGroupItem key={value} value={value} className="capitalize">
              {value}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </DataTableToolbar>
      <DataTableContent
        table={table}
        loading={state === "loading" || state === "refetching"}
        error={
          state === "error" ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CloudOffIcon />
                </EmptyMedia>
                <EmptyTitle>Couldn’t load deployments</EmptyTitle>
                <EmptyDescription>
                  The server didn’t answer. Check your connection and try again.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState("ready")}
                >
                  <RotateCwIcon data-icon="inline-start" />
                  Try again
                </Button>
              </EmptyContent>
            </Empty>
          ) : undefined
        }
      />
    </DataTable>
  )
}
