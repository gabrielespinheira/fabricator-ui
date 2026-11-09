"use client"

import * as React from "react"

import { FileTree } from "@/styles/base-fabricator/ui/file-tree"

export function FileTreeSingle() {
  const [opened, setOpened] = React.useState("No file open")
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <FileTree
        aria-label="Source files"
        nodes={[
          {
            id: "src",
            name: "src",
            children: [
              { id: "src/app.tsx", name: "app.tsx" },
              { id: "src/styles.css", name: "styles.css" },
            ],
          },
          { id: "package.json", name: "package.json" },
        ]}
        defaultExpandedIds={["src"]}
        defaultSelectedIds={["src/app.tsx"]}
        onOpen={(node) => setOpened(`Opened ${node.name}`)}
      />
      <p role="status" className="text-xs text-muted-foreground">
        {opened}. Double-click or press Enter to open.
      </p>
    </div>
  )
}
