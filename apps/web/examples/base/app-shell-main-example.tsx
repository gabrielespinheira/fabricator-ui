import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/styles/base-fabricator/ui/app-shell"
import { Sidebar, SidebarContent } from "@/styles/base-fabricator/ui/sidebar"

export function AppShellMainExample() {
  return (
    <AppShell storage={null} sidebarWidth="7rem">
      <Sidebar collapsible="none">
        <SidebarContent className="p-3 text-sm">Projects</SidebarContent>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader trigger="never">Launch plan</AppShellHeader>
        <AppShellContent className="px-3 text-sm text-muted-foreground">
          Timeline and milestones
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
