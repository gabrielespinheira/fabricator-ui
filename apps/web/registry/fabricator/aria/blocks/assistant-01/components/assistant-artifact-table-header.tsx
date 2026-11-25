"use client"

import { cn } from "cn"

import {
  isEndAligned,
  type AssistantArtifactColumn,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-artifact-model"
import { TableHead, TableHeader } from "@/registry/bases/aria/ui/table"

// React Aria's header holds its columns directly and needs one to name the
// rows; the other bases share a copy with a row in it.

export function AssistantArtifactTableHeader({
  columns,
}: {
  columns: AssistantArtifactColumn[]
}) {
  return (
    <TableHeader>
      {columns.map((column, index) => (
        <TableHead
          key={column.key}
          id={column.key}
          isRowHeader={index === 0}
          className={cn(isEndAligned(column) && "text-end")}
        >
          {column.label}
        </TableHead>
      ))}
    </TableHeader>
  )
}
