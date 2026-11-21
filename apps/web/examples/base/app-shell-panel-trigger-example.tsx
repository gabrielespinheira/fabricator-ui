import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPanel,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
  AppShellPanelTrigger,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellPanelTriggerExample() {
  return (
    <AppShell minMainWidth={240} storage={null}>
      <AppShellMain>
        <AppShellHeader trigger="never" className="justify-between">
          Launch plan
          <AppShellPanelTrigger panel="preview" size="sm">
            Details
          </AppShellPanelTrigger>
        </AppShellHeader>
        <AppShellContent className="px-3 text-sm text-muted-foreground">
          Timeline and milestones
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel id="preview" label="Details">
        <AppShellPanelHeader>
          <AppShellPanelTitle>Details</AppShellPanelTitle>
        </AppShellPanelHeader>
        <AppShellPanelContent className="px-3">
          Owner: Alex
        </AppShellPanelContent>
      </AppShellPanel>
    </AppShell>
  )
}
