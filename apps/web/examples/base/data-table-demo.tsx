"use client"

import * as React from "react"
import { ArchiveIcon, DownloadIcon, MoreHorizontalIcon } from "lucide-react"

import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableCellChange,
  type DataTableOption,
  type DataTablePage,
  type DataTableQuery,
} from "@/styles/base-fabricator/hooks/use-data-table"
import {
  queryRows,
  summarizeRows,
  type DataTableColumnType,
} from "@/styles/base-fabricator/lib/data-table-model"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  createDataTableSelectColumn,
  DataTable,
  DataTableContent,
  DataTableSearch,
  DataTableSelectionBar,
  DataTableToolbar,
} from "@/styles/base-fabricator/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"

type Account = {
  id: string
  company: string
  stage: string
  owner: string
  segments: string[]
  value: number
  probability: number
  health: number
  seats: number
  lastContact: string
  website: string
  contact: string
  active: boolean
}

const STAGES: DataTableOption[] = [
  { value: "lead", label: "Lead", tone: "neutral" },
  { value: "qualified", label: "Qualified", tone: "info" },
  { value: "proposal", label: "Proposal", tone: "info" },
  { value: "negotiation", label: "Negotiation", tone: "warning" },
  { value: "won", label: "Won", tone: "success" },
  { value: "lost", label: "Lost", tone: "destructive" },
]

const OWNERS: DataTableOption[] = [
  "Maya Chen",
  "Leo Hartman",
  "Priya Raman",
  "Tom Okafor",
  "Elena Rossi",
  "Sam Whitaker",
  "Nora Lind",
  "Diego Alvarez",
  "Hana Sato",
  "Owen Price",
].map((name) => ({
  value: name,
  label: name,
  image: `https://avatar.vercel.sh/${name.replace(" ", "-").toLowerCase()}`,
}))

const SEGMENTS: DataTableOption[] = [
  { value: "Enterprise", label: "Enterprise", tone: "info" },
  { value: "Mid-Market", label: "Mid-Market" },
  { value: "SMB", label: "SMB" },
  { value: "Expansion", label: "Expansion", tone: "success" },
  { value: "Renewal", label: "Renewal", tone: "warning" },
  { value: "New Logo", label: "New Logo" },
  { value: "Pilot", label: "Pilot" },
]

const NAMES = [
  "North",
  "Blue",
  "Cedar",
  "Lumen",
  "Atlas",
  "Nova",
  "Orbit",
  "Harbor",
  "Summit",
  "Vector",
  "Echo",
  "Maple",
  "Coral",
  "Granite",
  "Aurora",
  "Delta",
]
const KINDS = [
  "Labs",
  "Systems",
  "Works",
  "Cloud",
  "Analytics",
  "Health",
  "Logistics",
  "Studio",
  "Finance",
  "Robotics",
  "Energy",
  "Foods",
]

// One fixed "today", so the server and the browser render the same dates.
const NOW = Date.UTC(2026, 10, 12, 12)
const DAY = 86_400_000

// Seeded, so every visit builds the same 10,000 accounts.
function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let next = Math.imul(state ^ (state >>> 15), 1 | state)
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function getAccounts(count: number): Account[] {
  const random = createRandom(42)
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)]
  return Array.from({ length: count }, (_, index) => {
    const company = `${pick(NAMES)} ${pick(KINDS)}`
    const slug = `${company.toLowerCase().replace(" ", "-")}-${index + 1}`
    const stage = pick(STAGES).value
    return {
      id: `acc-${index + 1}`,
      company,
      stage,
      owner: pick(OWNERS).value,
      segments: SEGMENTS.filter(() => random() > 0.62).map(
        (item) => item.value
      ),
      value: Math.round(2_000 + random() ** 2 * 640_000),
      probability:
        stage === "won"
          ? 1
          : stage === "lost"
            ? 0
            : Math.round(random() * 90 + 5) / 100,
      health: Math.round(random() * 100),
      seats: Math.round(5 + random() * 1_200),
      lastContact: new Date(
        NOW - Math.floor(random() ** 1.6 * 540) * DAY
      ).toISOString(),
      website: `https://${slug}.example.com`,
      contact: `hello@${slug}.example.com`,
      active: random() > 0.18,
    }
  })
}

// MARK: A stand-in for your API

const database = getAccounts(10_000)

const fields = {
  company: { type: "text" },
  stage: { type: "status", options: STAGES },
  owner: { type: "person", options: OWNERS },
  segments: { type: "tags", options: SEGMENTS },
  value: { type: "currency" },
  probability: { type: "percent" },
  health: { type: "progress" },
  seats: { type: "number" },
  lastContact: { type: "date" },
  website: { type: "link" },
  contact: { type: "email" },
  active: { type: "boolean" },
} satisfies Record<
  string,
  { type: DataTableColumnType; options?: DataTableOption[] }
>

function isField(id: string): id is keyof typeof fields {
  return id in fields
}

function readField(account: Account, id: string) {
  return isField(id) ? account[id] : undefined
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

async function fetchAccounts(
  query: DataTableQuery,
  signal: AbortSignal
): Promise<DataTablePage<Account>> {
  await wait(query.offset === 0 ? 500 : 350, signal)
  // queryRows sorts, filters and searches exactly as the table does.
  const matching = queryRows(database, query, fields, readField, NOW)
  return {
    rows: matching.slice(query.offset, query.offset + query.limit),
    total: matching.length,
    // The footer's figures over every match, sent with the first window.
    aggregates:
      query.offset === 0
        ? summarizeRows(matching, fields, readField)
        : undefined,
  }
}

function saveAccount({
  row,
  columnId,
  value,
  replaceRow,
}: DataTableCellChange<Account>) {
  const account = { ...row, [columnId]: value }
  const index = database.findIndex((item) => item.id === account.id)
  database[index] = account
  replaceRow?.(account)
}

// MARK: The table

const column = createDataTableColumnHelper<Account>()

const columns = column.columns([
  createDataTableSelectColumn<Account>(),
  column.accessor("company", {
    meta: {
      type: "text",
      label: "Company",
      primary: true,
      pin: "start",
      aggregate: "count",
      editable: true,
    },
    size: 210,
  }),
  column.accessor("stage", {
    meta: {
      type: "status",
      label: "Stage",
      options: STAGES,
      aggregate: "unique",
      editable: true,
    },
  }),
  column.accessor("owner", {
    meta: { type: "person", label: "Owner", options: OWNERS, editable: true },
  }),
  column.accessor("segments", {
    meta: {
      type: "tags",
      label: "Segments",
      options: SEGMENTS,
      editable: true,
    },
    size: 220,
  }),
  column.accessor("value", {
    meta: {
      type: "currency",
      label: "Pipeline",
      format: { fractionDigits: 0 },
      aggregate: "sum",
      editable: true,
    },
  }),
  column.accessor("probability", {
    meta: {
      type: "percent",
      label: "Win rate",
      aggregate: "average",
      editable: true,
    },
  }),
  column.accessor("health", {
    meta: {
      type: "progress",
      label: "Health",
      aggregate: "average",
      editable: true,
    },
  }),
  column.accessor("seats", {
    meta: { type: "number", label: "Seats", aggregate: "sum", editable: true },
  }),
  column.accessor("lastContact", {
    meta: {
      type: "date",
      label: "Last contact",
      format: { relative: true },
      aggregate: "max",
      editable: true,
    },
  }),
  column.accessor("website", {
    meta: { type: "link", label: "Website", editable: true },
  }),
  column.accessor("contact", {
    meta: { type: "email", label: "Contact", editable: true },
  }),
  column.accessor("active", {
    meta: {
      type: "boolean",
      label: "Active",
      aggregate: "checked",
      editable: true,
    },
  }),
  column.display({
    id: "actions",
    meta: { kind: "actions" },
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-xs" />}
          aria-label={`Actions for ${row.original.company}`}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem>Open account</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(row.original.id)}
            >
              Copy account ID
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Archive</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }),
])

export function DataTableDemo() {
  const table = useDataTable({
    columns,
    load: fetchAccounts,
    now: NOW,
    getRowId: (row) => row.id,
    initialState: { sorting: [{ id: "value", desc: true }] },
    onCellChange: saveAccount,
  })

  return (
    <DataTable className="h-[640px] w-full" defaultView={{ numbered: true }}>
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder="Search accounts…" />
      </DataTableToolbar>
      <DataTableContent table={table}>
        <DataTableSelectionBar table={table}>
          <Button variant="ghost" size="sm">
            <DownloadIcon data-icon="inline-start" />
            Export
          </Button>
          <Button variant="ghost" size="sm">
            <ArchiveIcon data-icon="inline-start" />
            Archive
          </Button>
        </DataTableSelectionBar>
      </DataTableContent>
    </DataTable>
  )
}
