import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { FileTree, type FileTreeNode } from "@/registry/native/ui/file-tree"
import { Text } from "@/registry/native/ui/text"

const NODES: FileTreeNode[] = [
  {
    id: "src",
    name: "src",
    children: [
      { id: "src/app.tsx", name: "app.tsx" },
      {
        id: "src/ui",
        name: "ui",
        children: [{ id: "src/ui/button.tsx", name: "button.tsx" }],
      },
    ],
  },
  { id: "package.json", name: "package.json" },
  { id: "bun.lock", name: "bun.lock", muted: true },
  { id: "private", name: "private", disabled: true, children: [] },
]
function FileTreeExample() {
  const [opened, setOpened] = React.useState("Double tap a file to open it")
  return (
    <ExampleWrapper>
      <Example title="Files and folders">
        <FileTree
          nodes={NODES}
          defaultExpandedIds={["src"]}
          onOpen={(node) => setOpened(`Opened ${node.name}`)}
        />
        <Text className="text-muted-foreground">{opened}</Text>
      </Example>
      <Example title="Multiple selection">
        <FileTree
          nodes={NODES}
          selectionMode="multiple"
          defaultExpandedIds={["src", "src/ui"]}
          defaultSelectedIds={["src/app.tsx", "package.json"]}
        />
      </Example>
      <Example title="Disabled">
        <FileTree nodes={NODES} disabled />
      </Example>
      <Example title="Empty">
        <FileTree nodes={[]} />
      </Example>
    </ExampleWrapper>
  )
}
export { FileTreeExample }
