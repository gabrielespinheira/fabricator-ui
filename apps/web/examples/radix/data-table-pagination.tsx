"use client"

import * as React from "react"

import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableOption,
} from "@/styles/radix-fabricator/hooks/use-data-table"
import {
  createDataTableSelectColumn,
  DataTable,
  DataTableContent,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
} from "@/styles/radix-fabricator/ui/data-table"

type Invoice = {
  id: string
  number: string
  customer: string
  status: string
  amount: number
  issued: string
  due: string
}

const STATUSES: DataTableOption[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "sent", label: "Sent", tone: "info" },
  { value: "paid", label: "Paid", tone: "success" },
  { value: "overdue", label: "Overdue", tone: "destructive" },
]

const CUSTOMERS = [
  "Ana Souza",
  "Ben Carter",
  "Chloé Martin",
  "Dev Patel",
  "Eva Novak",
  "Finn Walsh",
]

const NOW = Date.UTC(2026, 10, 12, 12)
const DAY = 86_400_000

const INVOICES: Invoice[] = Array.from({ length: 1_000 }, (_, index) => {
  const issued = NOW - ((index * 37) % 360) * DAY
  return {
    id: `inv-${index + 1}`,
    number: `INV-${String(4_000 + index).padStart(5, "0")}`,
    customer: CUSTOMERS[(index * 7) % CUSTOMERS.length],
    status: STATUSES[(index * 3 + (index >> 3)) % STATUSES.length].value,
    amount: 120 + ((index * 7_919) % 9_800),
    issued: new Date(issued).toISOString(),
    due: new Date(issued + 30 * DAY).toISOString(),
  }
})

const column = createDataTableColumnHelper<Invoice>()

const columns = column.columns([
  createDataTableSelectColumn<Invoice>(),
  column.accessor("number", {
    meta: { type: "text", label: "Invoice", primary: true, pin: "start" },
    size: 150,
  }),
  column.accessor("customer", {
    meta: {
      type: "person",
      label: "Customer",
      options: CUSTOMERS.map((name) => ({ value: name, label: name })),
      editable: true,
    },
  }),
  column.accessor("status", {
    meta: {
      type: "status",
      label: "Status",
      options: STATUSES,
      editable: true,
    },
  }),
  column.accessor("amount", {
    meta: {
      type: "currency",
      label: "Amount",
      aggregate: "sum",
      editable: true,
    },
  }),
  column.accessor("issued", { meta: { type: "date", label: "Issued" } }),
  column.accessor("due", {
    meta: {
      type: "date",
      label: "Due",
      format: { relative: true },
      editable: true,
    },
  }),
])

export default function DataTablePaginationExample() {
  const [invoices, setInvoices] = React.useState(INVOICES)
  const table = useDataTable({
    data: invoices,
    columns,
    now: NOW,
    paginate: true,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    // Rows in memory edit in place: swap the row and the table re-sorts.
    onCellChange: ({ rowId, columnId, value }) =>
      setInvoices((current) =>
        current.map((invoice) =>
          invoice.id === rowId ? { ...invoice, [columnId]: value } : invoice
        )
      ),
  })

  return (
    <DataTable className="w-full">
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder="Search invoices…" />
      </DataTableToolbar>
      <DataTableContent table={table} />
      <DataTablePagination table={table} />
    </DataTable>
  )
}
