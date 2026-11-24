"use client"

import {
  getArtifactChartData,
  type AssistantArtifact,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-artifact-model"
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/registry/bases/__base__/ui/attachment"

// An artifact in the transcript: its name, what is in it, and its chart small
// enough to recognise. Pressing it opens the panel.

/** The chart's bars, from a shared zero line. */
function ArtifactThumbnail({ artifact }: { artifact: AssistantArtifact }) {
  const data = getArtifactChartData(artifact)
  const max = Math.max(...data.map(({ value }) => value), 0)
  const min = Math.min(...data.map(({ value }) => value), 0)
  const range = max - min || 1
  return (
    <span
      aria-hidden
      className="flex size-full items-stretch justify-center gap-0.5 p-(--density-8)"
    >
      {data.map(({ label, value }) => (
        <span key={label} className="relative w-1">
          <span
            className="absolute inset-x-0 min-h-0.5 rounded-[1px] bg-(--chart-series-1)"
            style={{
              top: `${((max - Math.max(value, 0)) / range) * 100}%`,
              height: `${(Math.abs(value) / range) * 100}%`,
            }}
          />
        </span>
      ))}
    </span>
  )
}

export function AssistantArtifactCard({
  artifact,
  onOpen,
}: {
  artifact: AssistantArtifact
  onOpen: () => void
}) {
  return (
    <Attachment className="w-full max-w-80">
      <AttachmentMedia>
        <ArtifactThumbnail artifact={artifact} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{artifact.title}</AttachmentTitle>
        <AttachmentDescription>
          Chart and table, {artifact.rows.length} rows
        </AttachmentDescription>
      </AttachmentContent>
      <AttachmentTrigger
        aria-label={`Open ${artifact.title}`}
        onClick={onOpen}
      />
    </Attachment>
  )
}
