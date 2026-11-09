"use client"

import * as React from "react"

import {
  getFileTreeDeleteNodes,
  removeFileTreeNodes,
} from "@/styles/base-fabricator/lib/file-tree-model"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/styles/base-fabricator/ui/empty"
import {
  FileTree,
  type FileTreeNode,
} from "@/styles/base-fabricator/ui/file-tree"

const initialNodes: FileTreeNode[] = [
  {
    id: ".changeset",
    name: ".changeset",
    children: [
      { id: ".changeset/README.md", name: "README.md" },
      { id: ".changeset/file-icons.md", name: "file-icons.md" },
      { id: ".changeset/config.json", name: "config.json" },
    ],
  },
  {
    id: ".github",
    name: ".github",
    children: [
      {
        id: ".github/workflows",
        name: "workflows",
        children: [
          { id: ".github/workflows/ci.yml", name: "ci.yml" },
          { id: ".github/workflows/release.yml", name: "release.yml" },
        ],
      },
      { id: ".github/CODEOWNERS", name: "CODEOWNERS" },
      {
        id: ".github/pull_request_template.md",
        name: "pull_request_template.md",
      },
    ],
  },
  {
    id: "apps",
    name: "apps",
    children: [
      {
        id: "apps/desktop",
        name: "desktop",
        children: [
          { id: "apps/desktop/main.ts", name: "main.ts" },
          { id: "apps/desktop/preload.ts", name: "preload.ts" },
          { id: "apps/desktop/package.json", name: "package.json" },
          {
            id: "apps/desktop/src-tauri",
            name: "src-tauri",
            children: [
              { id: "apps/desktop/src-tauri/main.rs", name: "main.rs" },
              { id: "apps/desktop/src-tauri/Cargo.toml", name: "Cargo.toml" },
              {
                id: "apps/desktop/src-tauri/tauri.conf.json",
                name: "tauri.conf.json",
              },
            ],
          },
        ],
      },
      {
        id: "apps/mobile",
        name: "mobile",
        children: [
          { id: "apps/mobile/App.tsx", name: "App.tsx" },
          { id: "apps/mobile/app.json", name: "app.json" },
          { id: "apps/mobile/metro.config.js", name: "metro.config.js" },
          { id: "apps/mobile/babel.config.js", name: "babel.config.js" },
        ],
      },
      {
        id: "apps/web",
        name: "web",
        children: [
          {
            id: "apps/web/.source",
            name: ".source",
            children: [
              { id: "apps/web/.source/index.ts", name: "index.ts" },
              { id: "apps/web/.source/manifest.json", name: "manifest.json" },
            ],
            muted: true,
          },
          {
            id: "apps/web/app",
            name: "app",
            children: [
              { id: "apps/web/app/layout.tsx", name: "layout.tsx" },
              { id: "apps/web/app/page.tsx", name: "page.tsx" },
              { id: "apps/web/app/globals.css", name: "globals.css" },
              { id: "apps/web/app/route.ts", name: "route.ts" },
              { id: "apps/web/app/not-found.tsx", name: "not-found.tsx" },
            ],
          },
          {
            id: "apps/web/components",
            name: "components",
            children: [
              {
                id: "apps/web/components/file-tree.tsx",
                name: "file-tree.tsx",
              },
              {
                id: "apps/web/components/file-tree.test.tsx",
                name: "file-tree.test.tsx",
              },
              {
                id: "apps/web/components/file-tree.stories.tsx",
                name: "file-tree.stories.tsx",
              },
              {
                id: "apps/web/components/theme-toggle.tsx",
                name: "theme-toggle.tsx",
              },
              { id: "apps/web/components/tokens.scss", name: "tokens.scss" },
            ],
          },
          {
            id: "apps/web/data",
            name: "data",
            children: [
              { id: "apps/web/data/components.json", name: "components.json" },
              { id: "apps/web/data/downloads.csv", name: "downloads.csv" },
              { id: "apps/web/data/schema.sql", name: "schema.sql" },
              { id: "apps/web/data/themes.yaml", name: "themes.yaml" },
            ],
          },
          {
            id: "apps/web/hooks",
            name: "hooks",
            children: [
              {
                id: "apps/web/hooks/use-file-selection.ts",
                name: "use-file-selection.ts",
              },
              {
                id: "apps/web/hooks/use-keyboard-shortcuts.ts",
                name: "use-keyboard-shortcuts.ts",
              },
              {
                id: "apps/web/hooks/use-media-query.ts",
                name: "use-media-query.ts",
              },
            ],
          },
          {
            id: "apps/web/lib",
            name: "lib",
            children: [
              { id: "apps/web/lib/file-icons.ts", name: "file-icons.ts" },
              {
                id: "apps/web/lib/file-icons.test.ts",
                name: "file-icons.test.ts",
              },
              { id: "apps/web/lib/utils.ts", name: "utils.ts" },
              { id: "apps/web/lib/constants.js", name: "constants.js" },
            ],
          },
          {
            id: "apps/web/public",
            name: "public",
            children: [
              { id: "apps/web/public/logo.svg", name: "logo.svg" },
              { id: "apps/web/public/cover.png", name: "cover.png" },
              { id: "apps/web/public/preview.webp", name: "preview.webp" },
              { id: "apps/web/public/favicon.ico", name: "favicon.ico" },
              {
                id: "apps/web/public/walkthrough.mp4",
                name: "walkthrough.mp4",
              },
              { id: "apps/web/public/intro.webm", name: "intro.webm" },
              {
                id: "apps/web/public/notification.mp3",
                name: "notification.mp3",
              },
              {
                id: "apps/web/public/interface.woff2",
                name: "interface.woff2",
              },
              { id: "apps/web/public/starter.zip", name: "starter.zip" },
            ],
          },
          {
            id: "apps/web/.env.local",
            name: ".env.local",
            muted: true,
            disabled: true,
          },
          { id: "apps/web/next.config.mjs", name: "next.config.mjs" },
          { id: "apps/web/package.json", name: "package.json" },
          { id: "apps/web/tsconfig.json", name: "tsconfig.json" },
          { id: "apps/web/README.md", name: "README.md" },
        ],
      },
    ],
  },
  {
    id: "docs",
    name: "docs",
    children: [
      { id: "docs/design.md", name: "design.md" },
      { id: "docs/getting-started.mdx", name: "getting-started.mdx" },
      { id: "docs/keyboard-shortcuts.pdf", name: "keyboard-shortcuts.pdf" },
      { id: "docs/release-notes.txt", name: "release-notes.txt" },
    ],
  },
  {
    id: "packages",
    name: "packages",
    children: [
      {
        id: "packages/icons",
        name: "icons",
        children: [
          {
            id: "packages/icons/src",
            name: "src",
            children: [
              { id: "packages/icons/src/index.ts", name: "index.ts" },
              {
                id: "packages/icons/src/file-type-icon.ts",
                name: "file-type-icon.ts",
              },
              { id: "packages/icons/src/icon.test.ts", name: "icon.test.ts" },
            ],
          },
          { id: "packages/icons/package.json", name: "package.json" },
          { id: "packages/icons/README.md", name: "README.md" },
        ],
      },
      {
        id: "packages/setup",
        name: "setup",
        children: [
          {
            id: "packages/setup/src",
            name: "src",
            children: [
              { id: "packages/setup/src/index.ts", name: "index.ts" },
              { id: "packages/setup/src/setup.ts", name: "setup.ts" },
              { id: "packages/setup/src/setup.test.ts", name: "setup.test.ts" },
            ],
          },
          { id: "packages/setup/package.json", name: "package.json" },
        ],
      },
    ],
  },
  {
    id: "scripts",
    name: "scripts",
    children: [
      { id: "scripts/build-registry.ts", name: "build-registry.ts" },
      { id: "scripts/capture-previews.mjs", name: "capture-previews.mjs" },
      { id: "scripts/release.sh", name: "release.sh" },
      { id: "scripts/resize-images.py", name: "resize-images.py" },
    ],
  },
  { id: ".gitignore", name: ".gitignore" },
  { id: "bun.lock", name: "bun.lock" },
  { id: "package.json", name: "package.json" },
  { id: "README.md", name: "README.md" },
]

export function FileTreeDemo() {
  const [nodes, setNodes] = React.useState(initialNodes)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [expandedIds, setExpandedIds] = React.useState<string[]>([
    "apps",
    "apps/web",
    "apps/web/app",
  ])
  const [snapshot, setSnapshot] = React.useState<FileTreeNode[] | null>(null)
  const [announcement, setAnnouncement] = React.useState("")

  function deleteNodes(targets: FileTreeNode[]) {
    setSnapshot(nodes)
    setNodes(
      removeFileTreeNodes(
        nodes,
        targets.map((node) => node.id)
      )
    )
    setSelectedIds([])
    setAnnouncement(
      `Deleted ${targets.length} ${targets.length === 1 ? "item" : "items"}`
    )
  }

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl bg-surface-2 shadow-surface-2">
      <div className="flex min-h-10 items-center gap-1 px-3 py-1">
        <span className="me-auto text-xs font-medium text-muted-foreground">
          Explorer
        </span>
        <Button variant="ghost" size="xs" onClick={() => setExpandedIds([])}>
          Collapse all
        </Button>
        <Button
          variant="ghost"
          size="xs"
          disabled={selectedIds.length === 0}
          onClick={() =>
            deleteNodes(getFileTreeDeleteNodes(nodes, selectedIds))
          }
        >
          Delete
        </Button>
        <Button
          variant="ghost"
          size="xs"
          disabled={!snapshot}
          onClick={() => {
            if (!snapshot) return
            setNodes(snapshot)
            setSnapshot(null)
            setAnnouncement("Restored deleted items")
          }}
        >
          Undo
        </Button>
      </div>
      <FileTree
        aria-label="Project files"
        nodes={nodes}
        selectionMode="multiple"
        selectedIds={selectedIds}
        onSelectionChange={(ids) => {
          setSelectedIds(ids)
          setAnnouncement("")
        }}
        expandedIds={expandedIds}
        onExpandedChange={setExpandedIds}
        onOpen={(node) => setAnnouncement(`Opened ${node.id}`)}
        onDelete={deleteNodes}
        className="max-h-96 min-h-64"
        emptyContent={
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No files</EmptyTitle>
              <EmptyDescription>
                Undo to restore the project files.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
      <div className="flex flex-col gap-1 px-3 py-3 text-xs text-muted-foreground">
        <span role="status">
          {announcement ||
            (selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : "Select a file to get started")}
        </span>
        <span>⌘ / Ctrl-click to select more. Shift-click for a range.</span>
      </div>
    </div>
  )
}
