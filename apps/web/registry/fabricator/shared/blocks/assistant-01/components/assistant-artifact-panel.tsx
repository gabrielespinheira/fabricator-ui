"use client"

import * as React from "react"
import { cn } from "cn"

import { AssistantArtifactTableHeader } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-artifact-table-header"
import { AssistantIconButton } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-controls"
import { useAssistantCopy } from "@/registry/bases/__base__/blocks/assistant-01/hooks/use-assistant-copy"
import {
  formatArtifactValue,
  getArtifactChartData,
  isEndAligned,
  toArtifactCsv,
  toArtifactFileName,
  toArtifactText,
  type AssistantArtifact,
  type AssistantArtifactColumn,
  type AssistantArtifactRow,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-artifact-model"
import { downloadAssistantFile } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-download"
import {
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
} from "@/registry/bases/__base__/ui/app-shell"
import { BarChart } from "@/registry/bases/__base__/ui/bar-chart"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableRow,
} from "@/registry/bases/__base__/ui/table"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// What the assistant made, beside the conversation: the chart, the numbers
// under it, and the two ways to take them elsewhere. A drawer on phones.

export const ASSISTANT_ARTIFACT_PANEL = "artifact"

function ArtifactCell({
  column,
  row,
}: {
  column: AssistantArtifactColumn
  row: AssistantArtifactRow
}) {
  const value = row[column.key]
  const isChange = column.format === "change" && typeof value === "number"
  return (
    <TableCell
      className={cn(
        isEndAligned(column) ? "text-end tabular-nums" : "text-foreground",
        isChange && value > 0 && "text-success-text",
        isChange && value < 0 && "text-destructive-text"
      )}
    >
      {formatArtifactValue(value, column.format)}
    </TableCell>
  )
}

function ArtifactTable({ artifact }: { artifact: AssistantArtifact }) {
  const { columns, rows, total } = artifact
  return (
    // Bleeds by the cells' padding, so the text sits on the panel's edge.
    <div className="-mx-(--density-12)">
      <Table aria-label={artifact.title}>
        <AssistantArtifactTableHeader columns={columns} />
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <ArtifactCell key={column.key} column={column} row={row} />
              ))}
            </TableRow>
          ))}
        </TableBody>
        {total && (
          <TableFooter>
            <TableRow>
              {columns.map((column) => (
                <ArtifactCell key={column.key} column={column} row={total} />
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  )
}

function ArtifactChart({ artifact }: { artifact: AssistantArtifact }) {
  const { chart, columns } = artifact
  const data = React.useMemo(() => getArtifactChartData(artifact), [artifact])
  const config = React.useMemo(
    () => ({ value: { label: chart.label } }),
    [chart.label]
  )
  const format =
    columns.find((column) => column.key === chart.value)?.format ?? "count"
  return (
    <BarChart
      data={data}
      config={config}
      index="label"
      layout="horizontal"
      label={`${artifact.title}: ${artifact.scope}`}
      formatValue={(value) => formatArtifactValue(value, format)}
      className="h-56"
    />
  )
}

export function AssistantArtifactPanel({
  artifact,
}: {
  artifact: AssistantArtifact
}) {
  const { isCopied, copy } = useAssistantCopy()
  return (
    <AppShellPanel
      id={ASSISTANT_ARTIFACT_PANEL}
      label={artifact.title}
      defaultOpen
      defaultWidth={400}
      minWidth={340}
      maxWidth={560}
      // Phones open it as a drawer once the shell has measured itself; until
      // then the server's docked panel would cover the conversation.
      className="max-md:data-[placement=inline]:hidden"
    >
      <AppShellPanelHeader>
        <AppShellPanelTitle>{artifact.title}</AppShellPanelTitle>
        <AssistantIconButton
          label={isCopied ? "Copied" : "Copy table"}
          onClick={() => copy(toArtifactText(artifact))}
        >
          {isCopied ? (
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
            />
          ) : (
            <IconPlaceholder
              lucide="CopyIcon"
              tabler="IconCopy"
              hugeicons="Copy01Icon"
              phosphor="CopyIcon"
              remixicon="RiFileCopyLine"
            />
          )}
        </AssistantIconButton>
        <AssistantIconButton
          label="Download CSV"
          onClick={() =>
            downloadAssistantFile(
              toArtifactFileName(artifact.title),
              "text/csv",
              toArtifactCsv(artifact)
            )
          }
        >
          <IconPlaceholder
            lucide="DownloadIcon"
            tabler="IconDownload"
            hugeicons="Download01Icon"
            phosphor="DownloadSimpleIcon"
            remixicon="RiDownloadLine"
          />
        </AssistantIconButton>
        <AppShellPanelClose />
      </AppShellPanelHeader>
      <AppShellPanelContent>
        <div className="flex flex-col gap-(--density-24) px-(--density-12) pt-(--density-4) pb-(--density-24)">
          <div className="flex flex-col gap-(--density-12)">
            <p className="text-muted-foreground">{artifact.scope}</p>
            <ArtifactChart artifact={artifact} />
          </div>
          <ArtifactTable artifact={artifact} />
          <p className="text-(length:--density-text-12) text-muted-foreground">
            From {artifact.source}
          </p>
        </div>
      </AppShellPanelContent>
    </AppShellPanel>
  )
}
