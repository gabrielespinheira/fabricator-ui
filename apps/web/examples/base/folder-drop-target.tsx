"use client"

import * as React from "react"

import {
  Folder,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/styles/base-fabricator/ui/folder"

export function FolderDropTarget() {
  const [isOver, setIsOver] = React.useState(false)
  const [count, setCount] = React.useState(2)

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        draggable
        onDragStart={(event) =>
          event.dataTransfer.setData("text/plain", "file")
        }
        className="cursor-grab rounded-lg bg-card px-3 py-2 text-sm shadow-surface-2 active:cursor-grabbing"
      >
        Drag me: Q4 report.pdf
      </div>
      <Folder
        color="purple"
        open={isOver}
        onDragEnter={() => setIsOver(true)}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          const target = event.relatedTarget
          if (
            !(target instanceof Node) ||
            !event.currentTarget.contains(target)
          ) {
            setIsOver(false)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsOver(false)
          setCount((value) => value + 1)
        }}
      >
        <FolderPreview>
          <FolderFiles>
            {Array.from({ length: count }, (_, index) => (
              <FolderFile key={index} />
            ))}
          </FolderFiles>
        </FolderPreview>
        <FolderTitle>Reports</FolderTitle>
        <FolderDescription aria-live="polite">{count} files</FolderDescription>
      </Folder>
    </div>
  )
}
