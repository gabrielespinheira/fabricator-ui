import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/styles/base-fabricator/ui/app-shell"
import { Sidebar, SidebarContent } from "@/styles/base-fabricator/ui/sidebar"

export function AppShellHeaderExample() {
  return (
    <AppShell
      defaultOpen={false}
      persist={false}
      storage={null}
      sidebarWidth="10rem"
      widthMobile="10rem"
    >
      <Sidebar variant="inset">
        <SidebarContent className="p-3 text-sm">Projects</SidebarContent>
      </Sidebar>
      <AppShellMain>
        <AppShellHeader trigger="always">Launch plan</AppShellHeader>
        <AppShellContent className="px-3 text-sm text-muted-foreground">
          Timeline and milestones
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
