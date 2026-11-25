"use client"

import * as React from "react"

import {
  SettingsChoice,
  SettingsCombobox,
  SettingsSelect,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import {
  SettingsRow,
  SettingsSection,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-section"
import {
  type SaveSetting,
  type SaveStatus,
} from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import {
  CURRENCIES,
  LANGUAGES,
  SAMPLE_NOW,
  TIME_ZONES,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import {
  formatAmount,
  formatLongDate,
  formatTimeIn,
  getZoneCity,
  getZoneOptions,
  NUMBER_STYLES,
  type NumberStyle,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-format-model"
import { type WeekStart } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const WEEK_STARTS: { value: WeekStart; label: string }[] = [
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
]

const ZONE_OPTIONS = getZoneOptions(TIME_ZONES, SAMPLE_NOW)

/** Language, time and numbers, with an invoice that follows each choice. */
export function SettingsRegionCard({
  id,
  language,
  timeZone,
  weekStart,
  numberStyle,
  currency,
  statuses,
  onSave,
}: {
  id: string
  language: string
  timeZone: string
  weekStart: WeekStart
  numberStyle: NumberStyle
  currency: string
  statuses: {
    language?: SaveStatus
    timeZone?: SaveStatus
    weekStart?: SaveStatus
    numberStyle?: SaveStatus
    currency?: SaveStatus
  }
  onSave: SaveSetting
}) {
  return (
    <SettingsSection
      id={id}
      title="Region"
      description="Emails, reports and exports follow it."
    >
      <SettingsRow
        title="Language"
        description="For emails, and for people who haven't chosen."
        htmlFor="workspace-language"
        status={statuses.language}
      >
        <SettingsSelect
          id="workspace-language"
          label="Language"
          value={language}
          options={LANGUAGES}
          onValueChange={(next) =>
            void onSave("language", next, { undo: "Language changed" })
          }
        />
      </SettingsRow>
      <SettingsRow
        title="Time zone"
        description={
          <>
            It&apos;s{" "}
            <span className="tabular-nums">
              {formatTimeIn(timeZone, SAMPLE_NOW)}
            </span>{" "}
            in {getZoneCity(timeZone)}.
          </>
        }
        htmlFor="workspace-zone"
        status={statuses.timeZone}
      >
        <SettingsCombobox
          id="workspace-zone"
          label="Time zone"
          value={timeZone}
          options={ZONE_OPTIONS}
          emptyLabel="No city with that name."
          onValueChange={(next) =>
            void onSave("timeZone", next, {
              undo: `Time zone is ${getZoneCity(next)}`,
            })
          }
        />
      </SettingsRow>
      <SettingsRow
        title="Week starts on"
        description="In calendars and weekly reports."
        status={statuses.weekStart}
      >
        <SettingsChoice
          label="Week starts on"
          value={weekStart}
          options={WEEK_STARTS}
          onValueChange={(next) => void onSave("weekStart", next)}
        />
      </SettingsRow>
      <SettingsRow
        title="Numbers"
        description="How thousands and decimals are written."
        htmlFor="workspace-numbers"
        status={statuses.numberStyle}
      >
        <SettingsSelect
          id="workspace-numbers"
          label="Numbers"
          value={numberStyle}
          options={NUMBER_STYLES}
          onValueChange={(next) => void onSave("numberStyle", next)}
        />
      </SettingsRow>
      <SettingsRow
        title="Currency"
        description="For new invoices. Sent ones keep theirs."
        htmlFor="workspace-currency"
        status={statuses.currency}
      >
        <SettingsSelect
          id="workspace-currency"
          label="Currency"
          value={currency}
          options={CURRENCIES}
          onValueChange={(next) =>
            void onSave("currency", next, { undo: "Currency changed" })
          }
        />
      </SettingsRow>
      <Item variant="muted" size="sm">
        <ItemMedia variant="icon">
          <IconPlaceholder
            lucide="FileTextIcon"
            tabler="IconFileDescription"
            hugeicons="File01Icon"
            phosphor="FileTextIcon"
            remixicon="RiFileTextLine"
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Invoice INV-2048</ItemTitle>
          <ItemDescription className="text-foreground/70">
            {formatLongDate(SAMPLE_NOW, language, timeZone)}
          </ItemDescription>
        </ItemContent>
        <ItemActions className="font-medium text-foreground tabular-nums">
          {formatAmount(12480.5, { currency, numberStyle })}
        </ItemActions>
      </Item>
    </SettingsSection>
  )
}
