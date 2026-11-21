import { ClockIcon, InfoIcon } from "@/lib/site-icons"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPanel,
  AppShellPanelHeader,
  AppShellPanelTabs,
  AppShellPanelTrigger,
  AppShellPanelView,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellPanelTabsExample() {
  return (
    <AppShell minMainWidth={240} storage={null}>
      <AppShellMain>
        <AppShellHeader trigger="never" className="justify-between">
          Launch plan
          <AppShellPanelTrigger panel="preview" size="sm">
            Inspector
          </AppShellPanelTrigger>
        </AppShellHeader>
        <AppShellContent className="px-3 text-sm text-muted-foreground">
          Timeline and milestones
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel
        id="preview"
        label="Inspector"
        defaultOpen
        defaultWidth={384}
        views={[
          { value: "details", label: "Details", icon: InfoIcon },
          { value: "activity", label: "Activity", icon: ClockIcon },
        ]}
      >
        <AppShellPanelHeader>
          <AppShellPanelTabs aria-label="Inspector views" />
        </AppShellPanelHeader>
        <AppShellPanelView value="details" className="px-3">
          Owner: Alex
        </AppShellPanelView>
        <AppShellPanelView value="activity" className="px-3">
          Launch checklist approved
        </AppShellPanelView>
      </AppShellPanel>
    </AppShell>
  )
}
