"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import { Kanban, type KanbanLoader } from "@/styles/base-fabricator/ui/kanban"
import type { PropertyDefinition } from "@/styles/base-fabricator/ui/properties"

type Issue = {
  id: string
  title: string
  columnId: string
  priority: string
  labels: string[]
}

const properties: PropertyDefinition[] = [
  { id: "id", name: "ID", type: "key" },
  {
    id: "priority",
    name: "Priority",
    type: "select",
    options: [
      { value: "high", label: "High", icon: "priority-high" },
      { value: "medium", label: "Medium", icon: "priority-medium" },
      { value: "low", label: "Low", icon: "priority-low" },
    ],
  },
  {
    id: "labels",
    name: "Labels",
    type: "multi-select",
    options: [
      { value: "access", label: "Accessibility", color: "purple" },
      { value: "docs", label: "Docs", color: "orange" },
      { value: "native", label: "Native", color: "teal" },
    ],
  },
]

const priorities = ["medium", "high", "low"]
const labels = [["access"], ["docs"], [], ["native", "access"]]

const issueTitles = [
  "Audit the keyboard flow",
  "Review the contrast at compact density",
  "Document the filter controls",
  "Add a read-only example",
  "Test the interaction on a phone",
  "Verify focus returns from the record",
]

const columns = [
  { id: "planned", name: "Planned", icon: "status-todo", color: "gray" },
  { id: "active", name: "Active", icon: "status-progress", color: "yellow" },
  { id: "shipped", name: "Shipped", icon: "status-done", color: "green" },
]

const totalPerColumn = 25_000

function waitForPage(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, 450)
    function abort() {
      window.clearTimeout(timeout)
      reject(signal.reason)
    }
    signal.addEventListener("abort", abort, { once: true })
  })
}

function KanbanLoaderDemo() {
  const [query, refresh] = React.useReducer((value: number) => value + 1, 0)
  const [failNext, setFailNext] = React.useState(false)
  const failRequests = React.useRef(false)
  const load = React.useCallback<KanbanLoader<Issue>>(
    async ({ columnId, cursor, limit, signal }) => {
      await waitForPage(signal)
      if (failRequests.current && columnId === "active") {
        failRequests.current = false
        setFailNext(false)
        throw new Error("The active column is temporarily unavailable.")
      }
      const start = cursor === null ? 0 : Number(cursor)
      const end = Math.min(totalPerColumn, start + limit)
      return {
        items: Array.from({ length: end - start }, (_, index) => {
          const number = start + index + 1
          return {
            id: `${columnId.toUpperCase()}-${number}`,
            columnId,
            title: issueTitles[(number - 1) % issueTitles.length],
            priority: priorities[number % priorities.length],
            labels: labels[number % labels.length],
          }
        }),
        nextCursor: end < totalPerColumn ? String(end) : null,
        total: totalPerColumn,
      }
    },
    []
  )

  return (
    <main className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-semibold">Issue queue</h1>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={failNext}
          onClick={() => {
            failRequests.current = !failNext
            setFailNext(!failNext)
          }}
        >
          Fail the next Active request
        </Button>
        <Button variant="outline" size="sm" onClick={refresh}>
          Reload all
        </Button>
      </div>
      <Kanban<Issue>
        columns={columns}
        properties={properties}
        load={load}
        queryKey={String(query)}
        pageSize={25}
      />
    </main>
  )
}

export default KanbanLoaderDemo
