"use client"

import * as React from "react"

import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableOption,
} from "@/styles/aria-fabricator/hooks/use-data-table"
import {
  DataTable,
  DataTableContent,
  DataTableToolbar,
  type DataTableView,
} from "@/styles/aria-fabricator/ui/data-table"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/aria-fabricator/ui/toggle-group"

type Product = {
  id: string
  name: string
  category: string
  price: number
  stock: number
  margin: number
  published: boolean
}

const CATEGORIES: DataTableOption[] = [
  { value: "audio", label: "Audio", tone: "info" },
  { value: "wearables", label: "Wearables", tone: "success" },
  { value: "home", label: "Home", tone: "warning" },
  { value: "cables", label: "Cables", tone: "neutral" },
]

const PRODUCTS: Product[] = [
  "Studio Headphones",
  "Desk Speaker",
  "Smart Ring",
  "Fitness Band",
  "Air Purifier",
  "Floor Lamp",
  "USB-C Cable 2m",
  "Braided Lightning Cable",
  "Noise Cancelling Earbuds",
  "Sleep Tracker",
].map((name, index) => ({
  id: `sku-${index + 1}`,
  name,
  category: CATEGORIES[[0, 0, 1, 1, 2, 2, 3, 3, 0, 1][index]].value,
  price: [349, 199, 299, 89, 249, 129, 19, 29, 179, 149][index],
  stock: [42, 0, 18, 120, 7, 33, 860, 412, 64, 25][index],
  margin: [0.42, 0.38, 0.55, 0.31, 0.27, 0.44, 0.71, 0.66, 0.48, 0.52][index],
  published: index % 4 !== 1,
}))

const column = createDataTableColumnHelper<Product>()

const columns = column.columns([
  column.accessor("name", {
    meta: { type: "text", label: "Product", primary: true },
  }),
  column.accessor("category", {
    meta: { type: "status", label: "Category", options: CATEGORIES },
  }),
  column.accessor("price", { meta: { type: "currency", label: "Price" } }),
  column.accessor("stock", {
    meta: { type: "number", label: "Stock", aggregate: "sum" },
  }),
  column.accessor("margin", {
    meta: { type: "percent", label: "Margin", aggregate: "average" },
  }),
  column.accessor("published", {
    meta: { type: "boolean", label: "Published" },
  }),
])

type Variant = "card" | "flat"

export default function DataTableVariantsExample() {
  const [variant, setVariant] = React.useState<Variant>("flat")
  // Controlled, so the toggles here and the table's settings stay in step.
  const [view, setView] = React.useState<Partial<DataTableView>>({
    lines: "grid",
    striped: true,
    size: "sm",
  })
  const table = useDataTable({ data: PRODUCTS, columns })

  return (
    <DataTable
      variant={variant}
      view={view}
      onViewChange={setView}
      className="w-full"
    >
      <DataTableToolbar>
        <ToggleGroup
          variant="outline"
          size="sm"
          selectedKeys={[variant]}
          onSelectionChange={(keys) => {
            const [next] = keys
            if (next === "card" || next === "flat") setVariant(next)
          }}
          aria-label="Variant"
        >
          <ToggleGroupItem id="card">Card</ToggleGroupItem>
          <ToggleGroupItem id="flat">Flat</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          size="sm"
          selectedKeys={[view.lines ?? "rows"]}
          onSelectionChange={(keys) => {
            const [next] = keys
            if (next === "rows" || next === "grid") {
              setView((current) => ({ ...current, lines: next }))
            }
          }}
          aria-label="Lines"
        >
          <ToggleGroupItem id="rows">Rows</ToggleGroupItem>
          <ToggleGroupItem id="grid">Grid</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          size="sm"
          selectedKeys={[view.size ?? "default"]}
          onSelectionChange={(keys) => {
            const [next] = keys
            if (next === "sm" || next === "default" || next === "lg") {
              setView((current) => ({ ...current, size: next }))
            }
          }}
          aria-label="Size"
        >
          <ToggleGroupItem id="sm">Compact</ToggleGroupItem>
          <ToggleGroupItem id="default">Default</ToggleGroupItem>
          <ToggleGroupItem id="lg">Comfortable</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          size="sm"
          selectionMode="multiple"
          selectedKeys={[
            ...(view.striped ? ["striped"] : []),
            ...(view.footer === false ? [] : ["footer"]),
          ]}
          onSelectionChange={(keys) =>
            setView((current) => ({
              ...current,
              striped: keys.has("striped"),
              footer: keys.has("footer"),
            }))
          }
          aria-label="Rows and footer"
        >
          <ToggleGroupItem id="striped">Striped</ToggleGroupItem>
          <ToggleGroupItem id="footer">Footer</ToggleGroupItem>
        </ToggleGroup>
      </DataTableToolbar>
      <DataTableContent table={table} />
    </DataTable>
  )
}
