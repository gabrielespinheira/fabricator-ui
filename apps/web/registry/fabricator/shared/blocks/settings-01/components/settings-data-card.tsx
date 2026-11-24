"use client"

import * as React from "react"

import {
  notifySaved,
  SettingsButton,
  SettingsProgress,
  SettingsSlider,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import {
  SettingsRow,
  SettingsSaveMark,
  SettingsSection,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-section"
import {
  type SaveSetting,
  type SaveStatus,
} from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import { TRASH } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import {
  describeRetention,
  getExportStep,
  getExportTimeLeft,
  getRetentionIndex,
  getRetentionLabel,
  RETENTION_STOPS,
  type ExportState,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"
import {
  Field,
  FieldDescription,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const EXPORT_SECONDS = 8
const TICK = 120

/** A copy of everything, and how long deleted files are kept. */
export function SettingsDataCard({
  id,
  retentionDays,
  statuses,
  onSave,
}: {
  id: string
  retentionDays: number
  statuses: { retentionDays?: SaveStatus }
  onSave: SaveSetting
}) {
  return (
    <SettingsSection
      id={id}
      title="Data"
      description="248 customers, 36 projects and 1,204 files."
    >
      <ExportRow />
      <RetentionRow
        days={retentionDays}
        status={statuses.retentionDays}
        onChange={(days) =>
          void onSave("retentionDays", days, {
            undo: `Deleted files kept ${days === Infinity ? "forever" : `for ${getRetentionLabel(days)}`}`,
          })
        }
      />
    </SettingsSection>
  )
}

function ExportRow() {
  const [state, setState] = React.useState<ExportState>({ kind: "idle" })
  const isRunning = state.kind === "running"

  // Swap for the progress your server reports.
  React.useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(() => {
      setState((current) => {
        if (current.kind !== "running") return current
        const progress =
          current.progress + (100 * TICK) / (EXPORT_SECONDS * 1000)
        return progress >= 100
          ? { kind: "ready" }
          : { kind: "running", progress }
      })
    }, TICK)
    return () => clearInterval(timer)
  }, [isRunning])

  if (state.kind === "running") {
    return (
      <Field>
        <div className="flex items-center gap-(--density-16)">
          <div className="flex min-w-0 flex-1 flex-col gap-(--density-2)">
            <FieldTitle>{getExportStep(state.progress)}</FieldTitle>
            <FieldDescription className="tabular-nums">
              {getExportTimeLeft(state.progress, EXPORT_SECONDS)}. You can leave
              this page.
            </FieldDescription>
          </div>
          <SettingsButton
            variant="outline"
            onClick={() => setState({ kind: "idle" })}
          >
            Cancel
          </SettingsButton>
        </div>
        <SettingsProgress label="Export" value={Math.round(state.progress)} />
      </Field>
    )
  }

  if (state.kind === "ready") {
    return (
      <SettingsRow
        title="Your export is ready"
        description="acme-2026-11-24.zip, 184 MB. Kept until December 1."
        isInline
      >
        <SettingsButton
          variant="outline"
          onClick={() => notifySaved("Downloading acme-2026-11-24.zip")}
        >
          <IconPlaceholder
            lucide="DownloadIcon"
            tabler="IconDownload"
            hugeicons="DownloadIcon"
            phosphor="DownloadIcon"
            remixicon="RiDownloadLine"
            data-icon="inline-start"
          />
          Download
        </SettingsButton>
      </SettingsRow>
    )
  }

  return (
    <SettingsRow
      title="Export everything"
      description="A ZIP of CSV and original files, about 184 MB."
      isInline
    >
      <SettingsButton
        variant="outline"
        onClick={() => setState({ kind: "running", progress: 0 })}
      >
        Export
      </SettingsButton>
    </SettingsRow>
  )
}

function RetentionRow({
  days,
  status,
  onChange,
}: {
  days: number
  status?: SaveStatus
  onChange: (days: number) => void
}) {
  // While the thumb moves, the numbers follow it; the setting waits for it.
  const [moving, setMoving] = React.useState<number | null>(null)
  const index = moving ?? getRetentionIndex(days)
  const shownDays = RETENTION_STOPS[index]?.days ?? days

  return (
    <Field>
      <div className="flex items-baseline justify-between gap-(--density-16)">
        <FieldTitle>
          Keep deleted files
          <SettingsSaveMark status={status} />
        </FieldTitle>
        <span
          aria-live="polite"
          className="font-medium text-foreground tabular-nums"
        >
          {getRetentionLabel(shownDays)}
        </span>
      </div>
      <SettingsSlider
        label="Keep deleted files"
        value={index}
        max={RETENTION_STOPS.length - 1}
        onValueChange={setMoving}
        onValueCommit={(next) => {
          setMoving(null)
          onChange(RETENTION_STOPS[next]?.days ?? days)
        }}
      />
      <FieldDescription aria-live="polite">
        {describeRetention(TRASH, shownDays, "December 1")}
      </FieldDescription>
    </Field>
  )
}
