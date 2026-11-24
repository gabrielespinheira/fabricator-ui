"use client"

import {
  SettingsSelect,
  SettingsSwitch,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import {
  SettingsRow,
  SettingsSection,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-section"
import {
  type SaveSetting,
  type SaveStatus,
} from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import { type DigestFrequency } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"

const DIGESTS: { value: DigestFrequency; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Every morning" },
  { value: "weekly", label: "Mondays at 8:00 AM" },
  { value: "monthly", label: "First of the month" },
]

const ALERTS = [
  {
    key: "notifiesFailedPayments",
    title: "Failed payments",
    description: "To owners, as soon as a charge fails.",
  },
  {
    key: "notifiesNewSignIns",
    title: "New sign-ins",
    description: "To the person, when a new device is used.",
  },
  {
    key: "notifiesMentions",
    title: "Mentions",
    description: "To people who haven't opened the app for an hour.",
  },
] as const

type AlertKey = (typeof ALERTS)[number]["key"]

/** What the workspace emails people about. */
export function SettingsNotificationsCard({
  id,
  digest,
  alerts,
  statuses,
  onSave,
}: {
  id: string
  digest: DigestFrequency
  alerts: Record<AlertKey, boolean>
  statuses: Partial<Record<AlertKey | "digest", SaveStatus>>
  onSave: SaveSetting
}) {
  return (
    <SettingsSection
      id={id}
      title="Notifications"
      description="Emails the workspace sends. People can mute their own."
    >
      <SettingsRow
        title="Digest"
        description="What changed, in one email to admins."
        htmlFor="workspace-digest"
        status={statuses.digest}
      >
        <SettingsSelect
          id="workspace-digest"
          label="Digest"
          value={digest}
          options={DIGESTS}
          onValueChange={(next) => void onSave("digest", next)}
        />
      </SettingsRow>
      {ALERTS.map((alert) => (
        <SettingsRow
          key={alert.key}
          title={alert.title}
          description={alert.description}
          htmlFor={alert.key}
          status={statuses[alert.key]}
          isInline
        >
          <SettingsSwitch
            id={alert.key}
            checked={alerts[alert.key]}
            onCheckedChange={(next) => void onSave(alert.key, next)}
          />
        </SettingsRow>
      ))}
    </SettingsSection>
  )
}
