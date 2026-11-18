"use client"

import { ElectronIcon, TauriIcon } from "@fabricator-ui/icons/brands"
import {
  getProjectTree,
  type ProjectSetup,
  type ProjectTreeNode,
  type TreeMark,
} from "@fabricator-ui/setup"

import { FileTree, FileTreeIcon } from "@/styles/base-fabricator/ui/file-tree"

import { FRAMEWORK_ICONS } from "./framework-icons"

function MarkIcon({ mark }: { mark: TreeMark }) {
  if (mark === "electron") return <ElectronIcon />
  if (mark === "tauri") return <TauriIcon />
  const Icon = FRAMEWORK_ICONS[mark]
  return <Icon />
}

function flatten(node: ProjectTreeNode): ProjectTreeNode[] {
  return [node, ...(node.children ?? []).flatMap(flatten)]
}

/** The folders and key files the command creates, following every choice. */
export function ProjectTree({ setup }: { setup: ProjectSetup }) {
  const tree = getProjectTree(setup)
  const nodes = flatten(tree)
  const marks = new Map(
    nodes.flatMap((node) => (node.mark ? [[node.id, node.mark] as const] : []))
  )
  const folderIds = nodes.filter((node) => node.children).map(({ id }) => id)

  return (
    <section
      aria-label="What gets created"
      className="rounded-2xl bg-surface-3 p-5 shadow-surface-1 dark:bg-surface-2 dark:shadow-surface-2"
    >
      <h2 className="pb-3 text-[13px] font-medium text-muted-foreground">
        What gets created
      </h2>
      <FileTree
        // A new set of folders starts expanded again.
        key={folderIds.join()}
        aria-label="What gets created"
        nodes={[tree]}
        selectionMode="none"
        defaultExpandedIds={folderIds}
        renderIcon={(node, expanded) => {
          const mark = marks.get(node.id)
          return mark ? (
            <MarkIcon mark={mark} />
          ) : (
            <FileTreeIcon node={node} expanded={expanded} />
          )
        }}
      />
    </section>
  )
}
