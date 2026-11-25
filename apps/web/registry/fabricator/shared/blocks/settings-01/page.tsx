"use client"

import * as React from "react"

import { SettingsAccessCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-access-card"
import {
  notifySaved,
  SettingsButton,
  SettingsMenuItems,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import { SettingsDangerCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-danger-card"
import { SettingsDataCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-data-card"
import { SettingsIndex } from "@/registry/bases/__base__/blocks/settings-01/components/settings-index"
import { SettingsLookCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-look-card"
import { SettingsNotificationsCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-notifications-card"
import { SettingsRegionCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-region-card"
import { SettingsSidebar } from "@/registry/bases/__base__/blocks/settings-01/components/settings-sidebar"
import { SettingsWorkspaceCard } from "@/registry/bases/__base__/blocks/settings-01/components/settings-workspace-card"
import { useWorkspaceSettings } from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import {
  LAST_CHANGE,
  SAMPLE_SETTINGS,
  WORKSPACE_ID,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
} from "@/registry/bases/__base__/ui/app-shell"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// An admin changes how the workspace behaves and trusts that it saved.
// Choices save as they are made, text has its own Save, and the danger comes
// last. Open the page with ?save=fail (or go offline) to see a refused save.

const SECTIONS = [
  { id: "workspace", label: "Workspace" },
  { id: "look", label: "Look" },
  { id: "region", label: "Region" },
  { id: "access", label: "Access" },
  { id: "notifications", label: "Notifications" },
  { id: "data", label: "Data" },
  { id: "danger", label: "Danger zone" },
]

const noop = () => {}

export default function WorkspaceSettingsPage() {
  const { settings, statuses, hasSaved, save } =
    useWorkspaceSettings(SAMPLE_SETTINGS)
  const [previewColor, setPreviewColor] = React.useState<string | null>(null)
  const [isDeleting, setDeleting] = React.useState(false)
  const color = previewColor ?? settings.brandColor

  return (
    <AppShell storageKey="settings-01">
      <SettingsSidebar
        name={settings.name}
        logo={settings.logo}
        color={color}
      />
      <AppShellMain className="@container/settings">
        <AppShellHeader>
          <AppShellBreadcrumb
            items={[
              { label: "Settings", href: "/settings" },
              { label: "General" },
            ]}
          />
          <AppShellHeaderActions
            menuLabel="Settings options"
            menu={
              <SettingsMenuItems
                items={[
                  {
                    id: "copy",
                    label: "Copy workspace ID",
                    icon: (
                      <IconPlaceholder
                        lucide="CopyIcon"
                        tabler="IconCopy"
                        hugeicons="Copy01Icon"
                        phosphor="CopyIcon"
                        remixicon="RiFileCopyLine"
                      />
                    ),
                    onSelect: () => {
                      void navigator.clipboard?.writeText(WORKSPACE_ID)
                      notifySaved("Workspace ID copied")
                    },
                  },
                  {
                    id: "log",
                    label: "View change history",
                    icon: (
                      <IconPlaceholder
                        lucide="HistoryIcon"
                        tabler="IconHistory"
                        hugeicons="WorkHistoryIcon"
                        phosphor="ClockCounterClockwiseIcon"
                        remixicon="RiHistoryLine"
                      />
                    ),
                    onSelect: noop,
                  },
                ]}
              />
            }
          />
        </AppShellHeader>
        <AppShellContent size="sm">
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
                onColorPreview={setPreviewColor}
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
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
