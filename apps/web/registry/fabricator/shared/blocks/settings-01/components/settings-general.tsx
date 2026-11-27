"use client"

import * as React from "react"

import { SettingsAccessCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-access-card"
import { SettingsButton } from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import { SettingsDangerCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-danger-card"
import { SettingsDataCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-data-card"
import { SettingsIndex } from "@/registry/bases/__base__/blocks/settings-01/components/settings-index"
import { SettingsLookCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-look-card"
import { SettingsNotificationsCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-notifications-card"
import { SettingsRegionCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-region-card"
import { SettingsWorkspaceCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-workspace-card"
import { type useWorkspaceSettings } from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import { LAST_CHANGE } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
import { AppShellPageTitle } from "@/registry/bases/__base__/ui/app-shell"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The General settings page without the App Shell around it, so it can sit in
// a shell of your own: put it in your AppShellContent (size="sm"). The page
// owns the settings, because the sidebar shows the workspace's name, logo and
// colour too. The section index shows beside the column inside an
// @container/settings that has the room for both.

const SECTIONS = [
  { id: "workspace", label: "Workspace" },
  { id: "look", label: "Look" },
  { id: "region", label: "Region" },
  { id: "access", label: "Access" },
  { id: "notifications", label: "Notifications" },
  { id: "data", label: "Data" },
  { id: "danger", label: "Danger zone" },
]

export function SettingsGeneral({
  workspace: { settings, statuses, hasSaved, save },
  color,
  onColorPreview,
}: {
  workspace: ReturnType<typeof useWorkspaceSettings>
  /** The brand colour, or the one being tried before it saves. */
  color: string
  onColorPreview: (color: string | null) => void
}) {
  const [isDeleting, setDeleting] = React.useState(false)

  return (
    <div className="relative flex flex-col gap-(--density-24)">
      <div className="flex flex-col gap-(--density-4)">
        <AppShellPageTitle>General</AppShellPageTitle>
        <p
          aria-live="polite"
          className="text-[15px] text-pretty text-muted-foreground"
        >
          {hasSaved ? "Last changed by you just now." : LAST_CHANGE}
        </p>
      </div>
      {isDeleting && (
        <Alert variant="error">
          <IconPlaceholder
            lucide="TriangleAlertIcon"
            tabler="IconAlertTriangle"
            hugeicons="Alert02Icon"
            phosphor="WarningIcon"
            remixicon="RiErrorWarningLine"
          />
          <AlertTitle>{settings.name} is being deleted</AlertTitle>
          <AlertDescription>
            Nobody else can sign in. Everything is erased on December 24.
          </AlertDescription>
          <AlertAction>
            <SettingsButton
              variant="outline"
              size="sm"
              onClick={() => setDeleting(false)}
            >
              Keep workspace
            </SettingsButton>
          </AlertAction>
        </Alert>
      )}
      <div className="flex flex-col gap-(--density-16)">
        <SettingsWorkspaceCard
          id="workspace"
          name={settings.name}
          address={settings.address}
          logo={settings.logo}
          color={color}
          statuses={statuses}
          onSave={save}
        />
        <SettingsLookCard
          id="look"
          name={settings.name}
          logo={settings.logo}
          brandColor={settings.brandColor}
          density={settings.density}
          statuses={statuses}
          onSave={save}
          onColorPreview={onColorPreview}
        />
        <SettingsRegionCard
          id="region"
          language={settings.language}
          timeZone={settings.timeZone}
          weekStart={settings.weekStart}
          numberStyle={settings.numberStyle}
          currency={settings.currency}
          statuses={statuses}
          onSave={save}
        />
        <SettingsAccessCard
          id="access"
          joinPolicy={settings.joinPolicy}
          domains={settings.domains}
          requiresTwoFactor={settings.requiresTwoFactor}
          statuses={statuses}
          onSave={save}
        />
        <SettingsNotificationsCard
          id="notifications"
          digest={settings.digest}
          alerts={settings}
          statuses={statuses}
          onSave={save}
        />
        <SettingsDataCard
          id="data"
          retentionDays={settings.retentionDays}
          statuses={statuses}
          onSave={save}
        />
        <SettingsDangerCard
          id="danger"
          name={settings.name}
          isDeleting={isDeleting}
          onDelete={() => setDeleting(true)}
        />
      </div>
      {/* Beside the column once the page has the room for both. */}
      <div className="absolute inset-y-0 start-full hidden ps-(--density-40) @6xl/settings:block">
        <SettingsIndex items={SECTIONS} className="sticky top-0 w-36" />
      </div>
    </div>
  )
}
