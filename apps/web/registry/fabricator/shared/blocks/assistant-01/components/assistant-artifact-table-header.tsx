"use client"

import { cn } from "cn"

import {
  isEndAligned,
  type AssistantArtifactColumn,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-artifact-model"
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/bases/__base__/ui/table"

// React Aria's header holds its columns directly and needs one to name the
// rows, so that base has its own copy of this file.

export function AssistantArtifactTableHeader({
  columns,
}: {
  columns: AssistantArtifactColumn[]
}) {
  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableHead
            key={column.key}
            className={cn(isEndAligned(column) && "text-end")}
          >
            {column.label}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}
