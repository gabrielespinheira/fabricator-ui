"use client"

import { ElectronIcon, TauriIcon } from "@fabricator-ui/icons/brands"
import {
  getProjectTree,
  type ProjectSetup,
  type ProjectTreeNode,
} from "@fabricator-ui/setup"
import { cn } from "cn"

import { FolderIcon } from "@/lib/site-icons"

import { FRAMEWORK_ICONS } from "./framework-icons"

function Mark({ mark }: { mark: ProjectTreeNode["mark"] }) {
  if (mark === "electron") return <ElectronIcon />
  if (mark === "tauri") return <TauriIcon />
  if (mark) {
    const Icon = FRAMEWORK_ICONS[mark]
    return <Icon />
  }
  return <FolderIcon />
}

function TreeNode({
  node,
  isRoot,
}: {
  node: ProjectTreeNode
  isRoot?: boolean
}) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-3.5">
          <Mark mark={node.mark} />
        </span>
        <span
          className={cn("font-mono text-[13px]", isRoot && "font-semibold")}
        >
          {node.name}
          {node.children.length > 0 || isRoot ? "/" : ""}
        </span>
        {node.note ? (
          <span className="min-w-0 truncate text-[13px] text-muted-foreground">
            {node.note}
          </span>
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul className="ms-3 flex flex-col gap-2 border-s border-border ps-4">
          {node.children.map((child) => (
            <TreeNode key={child.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/** The folders the command creates, following every choice. */
export function ProjectTree({ setup }: { setup: ProjectSetup }) {
  return (
    <section
      aria-label="What gets created"
      className="rounded-2xl bg-surface-3 p-5 shadow-surface-1 dark:bg-surface-2 dark:shadow-surface-2"
    >
      <h2 className="pb-4 text-[13px] font-medium text-muted-foreground">
        What gets created
      </h2>
      <ul>
        <TreeNode node={getProjectTree(setup)} isRoot />
      </ul>
    </section>
  )
}
