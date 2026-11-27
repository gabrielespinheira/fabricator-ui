"use client"

import * as React from "react"

import { FinanceOverview } from "@/styles/base-fabricator/blocks/finance-01/components/finance-overview"
import { SettingsGeneral } from "@/styles/base-fabricator/blocks/settings-01/components/settings-general"
import { useWorkspaceSettings } from "@/styles/base-fabricator/blocks/settings-01/hooks/use-workspace-settings"
import { SAMPLE_SETTINGS } from "@/styles/base-fabricator/blocks/settings-01/lib/settings-data"
import { PlaceholderPage } from "@/app/(view)/app-shell/_components/shell-demo"

function SettingsPage() {
  const workspace = useWorkspaceSettings(SAMPLE_SETTINGS)
  const [previewColor, setPreviewColor] = React.useState<string | null>(null)

  // Settings read best in a narrow column at any content width.
  return (
    <div className="mx-auto w-full max-w-2xl">
      <SettingsGeneral
        workspace={workspace}
        color={previewColor ?? workspace.settings.brandColor}
        onColorPreview={setPreviewColor}
      />
    </div>
  )
}

/**
 * What each page of the preview shows: the Finance and Settings blocks where
 * the nav has a page for them, so the shell is judged around real screens.
 */
export function PreviewPage({
  pathname,
  title,
}: {
  pathname: string
  title: string
}) {
  if (pathname === "/") return <FinanceOverview isComparing />
  if (pathname === "/settings") return <SettingsPage />
  return (
    <PlaceholderPage title={title}>
      A page of your own goes here. Press F6 to move between the sidebar, the
      page and the panel.
    </PlaceholderPage>
  )
}
