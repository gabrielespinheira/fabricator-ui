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

export function AppShellPanelContentExample() {
  return (
    <AppShell minMainWidth={240} storage={null}>
      <AppShellMain>
        <AppShellHeader trigger="never" className="justify-between">
          Launch plan
          <AppShellPanelTrigger panel="preview" size="sm">
            Activity
          </AppShellPanelTrigger>
        </AppShellHeader>
        <AppShellContent className="px-3 text-sm text-muted-foreground">
          Timeline and milestones
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel id="preview" label="Activity" defaultOpen>
        <AppShellPanelHeader>
          <AppShellPanelTitle>Activity</AppShellPanelTitle>
        </AppShellPanelHeader>
        <AppShellPanelContent
          className="space-y-10 px-3 pb-4"
          tabIndex={0}
          role="region"
          aria-label="Project history"
        >
          <p>May 12 · Launch checklist approved</p>
          <p>May 10 · Design review scheduled</p>
          <p>May 8 · Scope agreed</p>
          <p>May 6 · Project created</p>
        </AppShellPanelContent>
      </AppShellPanel>
    </AppShell>
  )
}
