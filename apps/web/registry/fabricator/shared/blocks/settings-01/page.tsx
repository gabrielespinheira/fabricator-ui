"use client"

import * as React from "react"

import {
  notifySaved,
  SettingsMenuItems,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import { SettingsGeneral } from "@/registry/bases/__base__/blocks/settings-01/components/settings-general"
import { SettingsSidebar } from "@/registry/bases/__base__/blocks/settings-01/components/settings-sidebar"
import { useWorkspaceSettings } from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import {
  SAMPLE_SETTINGS,
  WORKSPACE_ID,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
} from "@/registry/bases/__base__/ui/app-shell"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// An admin changes how the workspace behaves and trusts that it saved.
// Choices save as they are made, text has its own Save, and the danger comes
// last. Open the page with ?save=fail (or go offline) to see a refused save.

const noop = () => {}

export default function WorkspaceSettingsPage() {
  const workspace = useWorkspaceSettings(SAMPLE_SETTINGS)
  const [previewColor, setPreviewColor] = React.useState<string | null>(null)
  const { settings } = workspace
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
          <SettingsGeneral
            workspace={workspace}
            color={color}
            onColorPreview={setPreviewColor}
          />
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
