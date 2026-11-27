"use client"

import { UserIcon } from "@fabricator-ui/icons"

import {
  Canvas,
  CanvasControls,
  type CanvasEdgeRecord,
} from "@/styles/radix-fabricator/ui/canvas"

// A read-only org chart: drag to pan, pinch or ⌘ scroll to zoom, select to
// read. The page scrolls past it until it's clicked.
const people = [
  ["ada", "Ada Okafor", "CEO", null],
  ["ben", "Ben Moreau", "Head of Product", "ada"],
  ["chloe", "Chloé Silva", "Head of Engineering", "ada"],
  ["dan", "Dan Ito", "Designer", "ben"],
  ["eva", "Eva Lind", "Product Manager", "ben"],
  ["finn", "Finn Weber", "Engineer", "chloe"],
  ["gia", "Gia Rossi", "Engineer", "chloe"],
] as const

const nodes = people.map(([id, title, description], index) => ({
  id,
  position: {
    x:
      index === 0
        ? 300
        : index < 3
          ? (index - 1) * 480 + 60
          : (index - 3) * 240,
    y: index === 0 ? 0 : index < 3 ? 160 : 320,
  },
  data: { title, description, icon: <UserIcon />, orientation: "vertical" },
}))

const edges: CanvasEdgeRecord[] = people.flatMap(([id, , , manager]) =>
  manager
    ? [
        {
          id: `${manager}-${id}`,
          source: manager,
          target: id,
          type: "smoothstep",
          marker: "none",
        },
      ]
    : []
)

export function CanvasReadonly() {
  return (
    <Canvas
      defaultNodes={nodes}
      defaultEdges={edges}
      mode="view"
      label="Team"
      className="h-[480px] w-full rounded-xl"
    >
      <CanvasControls />
    </Canvas>
  )
}
