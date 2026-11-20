import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
  AppShellPanelTrigger,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellPanelHeaderExample() {
  return (
    <AppShell minMainWidth={240} storage={null}>
      <AppShellPanel id="preview" label="Details" defaultOpen side="left">
        <AppShellPanelHeader>
          <AppShellPanelTitle>Details</AppShellPanelTitle>
          <AppShellPanelClose />
        </AppShellPanelHeader>
        <AppShellPanelContent className="px-3">
          Owner: Alex
        </AppShellPanelContent>
      </AppShellPanel>
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
    </AppShell>
  )
}
