import { FolderIcon, HomeIcon } from "@/lib/site-icons"
import {
  AppShell,
  AppShellBottomNav,
  AppShellBottomNavItem,
  AppShellContent,
  AppShellMain,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellBottomNavExample() {
  return (
    <AppShell className="mx-auto max-w-sm" storage={null}>
      <AppShellMain>
        <AppShellContent className="p-4">Projects</AppShellContent>
        <AppShellBottomNav aria-label="Workspace">
          <AppShellBottomNavItem href="/" icon={HomeIcon} label="Home" />
          <AppShellBottomNavItem
            href="/projects"
            icon={FolderIcon}
            label="Projects"
            isActive
          />
        </AppShellBottomNav>
      </AppShellMain>
    </AppShell>
  )
}
