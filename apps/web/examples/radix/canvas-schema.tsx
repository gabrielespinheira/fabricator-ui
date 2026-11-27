"use client"

import { TableIcon } from "@fabricator-ui/icons"

import {
  Canvas,
  CanvasControls,
  CanvasHandle,
  CanvasNode,
  CanvasNodeContent,
  CanvasNodeHeader,
  CanvasNodeIcon,
  CanvasNodeTitle,
  type CanvasEdgeRecord,
  type CanvasNodeComponent,
  type CanvasNodeProps,
} from "@/styles/radix-fabricator/ui/canvas"

type Column = { name: string; type: string; key?: "primary" | "foreign" }

function isColumns(value: unknown): value is Column[] {
  return Array.isArray(value)
}

// A table: one row per column, and a handle on each key so relations join
// the exact columns.
function TableNode({ data }: CanvasNodeProps) {
  const columns = isColumns(data.columns) ? data.columns : []
  return (
    <CanvasNode className="gap-0 p-0">
      <CanvasNodeHeader className="px-3 py-2">
        <CanvasNodeIcon>
          <TableIcon />
        </CanvasNodeIcon>
        <CanvasNodeTitle>{String(data.title)}</CanvasNodeTitle>
      </CanvasNodeHeader>
      <CanvasNodeContent>
        <ul className="border-t border-border/60">
          {columns.map((column) => (
            <li
              key={column.name}
              className="relative flex items-center gap-3 px-3 py-1.5 text-xs"
            >
              <span className={column.key ? "font-medium" : undefined}>
                {column.name}
              </span>
              <span className="ms-auto font-mono text-muted-foreground">
                {column.type}
              </span>
              {column.key === "primary" && (
                <CanvasHandle
                  kind="source"
                  side="right"
                  id={column.name}
                  produces="id"
                />
              )}
              {column.key === "foreign" && (
                <CanvasHandle
                  kind="target"
                  side="left"
                  id={column.name}
                  accepts={["id"]}
                  max={1}
                />
              )}
            </li>
          ))}
        </ul>
      </CanvasNodeContent>
    </CanvasNode>
  )
}

const nodeTypes: Record<string, CanvasNodeComponent> = { table: TableNode }

const nodes = [
  {
    id: "customers",
    type: "table",
    position: { x: 0, y: 40 },
    data: {
      title: "customers",
      columns: [
        { name: "id", type: "uuid", key: "primary" },
        { name: "name", type: "text" },
        { name: "email", type: "text" },
      ],
    },
  },
  {
    id: "orders",
    type: "table",
    position: { x: 360, y: 0 },
    data: {
      title: "orders",
      columns: [
        { name: "id", type: "uuid", key: "primary" },
        { name: "customer_id", type: "uuid", key: "foreign" },
        { name: "total", type: "numeric" },
        { name: "placed_at", type: "timestamptz" },
      ],
    },
  },
  {
    id: "items",
    type: "table",
    position: { x: 720, y: 60 },
    data: {
      title: "order_items",
      columns: [
        { name: "id", type: "uuid", key: "primary" },
        { name: "order_id", type: "uuid", key: "foreign" },
        { name: "quantity", type: "int" },
      ],
    },
  },
]

const edges: CanvasEdgeRecord[] = [
  {
    id: "1",
    source: "customers",
    sourceHandle: "id",
    target: "orders",
    targetHandle: "customer_id",
    type: "smoothstep",
  },
  {
    id: "2",
    source: "orders",
    sourceHandle: "id",
    target: "items",
    targetHandle: "order_id",
    type: "smoothstep",
  },
]

export function CanvasSchema() {
  return (
    <Canvas
      defaultNodes={nodes}
      defaultEdges={edges}
      nodeTypes={nodeTypes}
      edgeDefaults={{ type: "smoothstep" }}
      label="Store schema"
      className="h-[440px] w-full rounded-xl"
    >
      <CanvasControls />
    </Canvas>
  )
}
