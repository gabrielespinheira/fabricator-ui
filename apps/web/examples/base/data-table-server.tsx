"use client"

import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableOption,
  type DataTablePage,
  type DataTableQuery,
} from "@/styles/base-fabricator/hooks/use-data-table"
import {
  queryRows,
  summarizeRows,
  type DataTableColumnType,
} from "@/styles/base-fabricator/lib/data-table-model"
import {
  DataTable,
  DataTableContent,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
} from "@/styles/base-fabricator/ui/data-table"

type Member = {
  id: string
  name: string
  email: string
  role: string
  seats: number
  joined: string
  verified: boolean
}

const ROLES: DataTableOption[] = [
  { value: "owner", label: "Owner", tone: "warning" },
  { value: "admin", label: "Admin", tone: "info" },
  { value: "member", label: "Member", tone: "neutral" },
  { value: "guest", label: "Guest", tone: "neutral" },
]

const FIRST = [
  "Ava",
  "Leo",
  "Mia",
  "Kai",
  "Zoe",
  "Eli",
  "Noa",
  "Ren",
  "Ivy",
  "Jude",
]
const LAST = [
  "Cole",
  "Frost",
  "Vale",
  "Reyes",
  "Okafor",
  "Sato",
  "Lund",
  "Marsh",
]
const NOW = Date.UTC(2026, 10, 12, 12)

// MARK: A stand-in for your API: 2,500 members it sorts, filters and pages

const members: Member[] = Array.from({ length: 2_500 }, (_, index) => {
  const first = FIRST[index % FIRST.length]
  const last = LAST[(index * 7) % LAST.length]
  return {
    id: `mem-${index + 1}`,
    name: `${first} ${last}`,
    email: `${first}.${last}${index}@example.com`.toLowerCase(),
    role: ROLES[(index * 5) % 13 === 0 ? 0 : (index % 3) + 1].value,
    seats: 1 + ((index * 17) % 40),
    joined: new Date(NOW - ((index * 53) % 900) * 86_400_000).toISOString(),
    verified: index % 4 !== 0,
  }
})

const fields = {
  name: { type: "text" },
  email: { type: "email" },
  role: { type: "status", options: ROLES },
  seats: { type: "number" },
  joined: { type: "date" },
  verified: { type: "boolean" },
} satisfies Record<
  string,
  { type: DataTableColumnType; options?: DataTableOption[] }
>

function isField(id: string): id is keyof typeof fields {
  return id in fields
}

function readField(member: Member, id: string) {
  return isField(id) ? member[id] : undefined
}

/** Resolves after a delay, or rejects as soon as the table cancels. */
function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

async function fetchMembers(
  query: DataTableQuery,
  signal: AbortSignal
): Promise<DataTablePage<Member>> {
  await wait(600, signal)
  // queryRows answers like the table would, so the header filters, the
  // search and the sort all mean the same thing on the server.
  const matching = queryRows(members, query, fields, readField, NOW)
  return {
    rows: matching.slice(query.offset, query.offset + query.limit),
    total: matching.length,
    aggregates: summarizeRows(matching, fields, readField),
  }
}

const column = createDataTableColumnHelper<Member>()

const columns = column.columns([
  column.accessor("name", {
    meta: { type: "text", label: "Name", primary: true, pin: "start" },
    size: 180,
  }),
  column.accessor("email", { meta: { type: "email", label: "Email" } }),
  column.accessor("role", {
    meta: { type: "status", label: "Role", options: ROLES },
  }),
  column.accessor("seats", {
    meta: { type: "number", label: "Seats", aggregate: "sum" },
  }),
  column.accessor("joined", {
    meta: { type: "date", label: "Joined", format: { relative: true } },
  }),
  column.accessor("verified", { meta: { type: "boolean", label: "Verified" } }),
])

export default function DataTableServerExample() {
  const table = useDataTable({
    columns,
    load: fetchMembers,
    paginate: true,
    now: NOW,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  })

  return (
    <DataTable className="h-[560px] w-full">
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder="Search members…" />
      </DataTableToolbar>
      <DataTableContent table={table} />
      <DataTablePagination table={table} />
    </DataTable>
  )
}
