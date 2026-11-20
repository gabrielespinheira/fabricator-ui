import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellTitlebar,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellTitlebarExample() {
  return (
    <AppShell
      storage={null}
      titlebar={
        <AppShellTitlebar className="px-4 text-sm">
          Launch notes
        </AppShellTitlebar>
      }
    >
      <AppShellMain>
        <AppShellContent className="p-4 text-sm text-muted-foreground">
          Design review on May 12.
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
