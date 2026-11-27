"use client"

import * as React from "react"

import { SettingsChoice } from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import { SettingsLogo } from "@/registry/bases/__base__/blocks/settings-01/components/settings-logo"
import {
  SettingsRow,
  SettingsSaveMark,
  SettingsSection,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-section"
import {
  type SaveSetting,
  type SaveStatus,
} from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import { getBrandReport } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-color-model"
import { BRAND_SWATCHES } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import { type SettingsDensity } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { ColorPickerPopover } from "@/registry/bases/__base__/ui/color-picker"
import { DensityProvider } from "@/registry/bases/__base__/ui/density"
import {
  Field,
  FieldDescription,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const DENSITIES: { value: SettingsDensity; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "spacious", label: "Spacious" },
]

const COLOR_SAVE_DELAY = 600

/** The brand colour and the density, on the page a new member sees first. */
export function SettingsLookCard({
  id,
  name,
  logo,
  brandColor,
  density,
  statuses,
  onSave,
  onColorPreview,
}: {
  id: string
  name: string
  logo: string | null
  brandColor: string
  density: SettingsDensity
  statuses: { brandColor?: SaveStatus; density?: SaveStatus }
  onSave: SaveSetting
  /** The colour being picked, until it is saved. */
  onColorPreview: (color: string | null) => void
}) {
  const [color, setColor] = React.useState(brandColor)
  const [isPicking, setPicking] = React.useState(false)
  const shown = isPicking ? color : brandColor

  // Dragging through the picker saves once, when it rests.
  React.useEffect(() => {
    if (!isPicking) return
    const timer = setTimeout(() => {
      setPicking(false)
      onColorPreview(null)
      void onSave("brandColor", color, { undo: "Brand color changed" })
    }, COLOR_SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [color, isPicking, onColorPreview, onSave])

  return (
    <SettingsSection
      id={id}
      title="Look"
      description="Sign-in, invitations and the portal your customers see."
    >
      <div className="grid gap-(--density-24) @md/field-group:grid-cols-[1fr_1.25fr]">
        <div className="flex flex-col gap-(--density-20)">
          <SettingsRow
            title="Brand color"
            description="On buttons and links."
            status={isPicking ? undefined : statuses.brandColor}
            isInline
          >
            <ColorPickerPopover
              value={shown}
              onValueChange={(_value, parsed) => {
                const hex = parsed.hex.slice(0, 7)
                setColor(hex)
                setPicking(true)
                onColorPreview(hex)
              }}
              swatches={BRAND_SWATCHES}
              triggerShowValue={false}
              triggerLabel={shown.toUpperCase()}
              triggerLabelPosition="right"
            />
          </SettingsRow>
          <Field>
            <FieldTitle>
              Density
              <SettingsSaveMark status={statuses.density} />
            </FieldTitle>
            <SettingsChoice
              label="Density"
              value={density}
              options={DENSITIES}
              onValueChange={(next) => void onSave("density", next)}
            />
            <FieldDescription>
              Where people start. Everyone can change their own.
            </FieldDescription>
          </Field>
          <ContrastNote color={shown} />
        </div>
        <LookPreview name={name} logo={logo} color={shown} density={density} />
      </div>
    </SettingsSection>
  )
}

function LookPreview({
  name,
  logo,
  color,
  density,
}: {
  name: string
  logo: string | null
  color: string
  density: SettingsDensity
}) {
  const report = getBrandReport(color)
  const brand: React.CSSProperties & Record<`--${string}`, string> = {
    "--brand-link": report.linkOnLight,
    "--brand-link-dark": report.linkOnDark,
  }

  return (
    <div
      role="img"
      aria-label={`An invitation to ${name} in ${color}`}
      className="flex min-h-72 items-center justify-center rounded-(--radius-control) bg-hover p-(--density-20)"
    >
      <DensityProvider density={density}>
        <div
          inert
          className="flex w-full max-w-72 flex-col items-start gap-(--density-16) rounded-(--radius-surface) bg-surface-3 p-(--density-20) shadow-surface-3"
          style={brand}
        >
          <span className="size-(--density-36) rounded-(--radius-control) text-(length:--density-text-14)">
            <SettingsLogo name={name} logo={logo} color={color} />
          </span>
          <span className="flex flex-col gap-(--density-4)">
            <span className="text-(length:--density-text-16) text-balance text-foreground weight-semibold">
              Join {name}
            </span>
            <span className="text-(length:--density-text-13) text-pretty text-muted-foreground">
              Ada Lovelace invited you to 4 projects.
            </span>
          </span>
          <Button
            className="w-full"
            style={{ background: color, color: report.textOn }}
          >
            Accept invitation
          </Button>
          <span className="self-center text-(length:--density-text-13) font-medium text-(--brand-link) dark:text-(--brand-link-dark)">
            Use a different account
          </span>
        </div>
      </DensityProvider>
    </div>
  )
}

/** Whether people can read what sits on the colour, and links in it. */
function ContrastNote({ color }: { color: string }) {
  const { textOn, ratio, isLinkAdjusted } = getBrandReport(color)
  return (
    <p
      aria-live="polite"
      className="flex gap-(--density-6) text-(length:--density-text-12) text-pretty text-muted-foreground @md/field-group:mt-auto [&_svg]:mt-0.5 [&_svg]:size-(--density-icon-14) [&_svg]:shrink-0"
    >
      <IconPlaceholder
        lucide="CircleCheckIcon"
        tabler="IconCircleCheckFilled"
        hugeicons="CheckmarkCircle01Icon"
        phosphor="CheckCircleIcon"
        remixicon="RiCheckboxCircleFill"
        className="text-success"
      />
      <span>
        {textOn === "#ffffff" ? "White" : "Black"} text on it reads at{" "}
        <span className="tabular-nums">{ratio.toFixed(1)}:1</span>.{" "}
        {isLinkAdjusted
          ? "Links on white get a darker shade."
          : "Links use it as it is."}
      </span>
    </p>
  )
}
