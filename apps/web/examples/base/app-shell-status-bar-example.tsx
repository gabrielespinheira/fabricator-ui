import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellStatusBar,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellStatusBarExample() {
  return (
    <AppShell breakpoints={{ tablet: 0, desktop: 1024 }} storage={null}>
      <AppShellMain>
        <AppShellContent className="p-4">Launch notes</AppShellContent>
      </AppShellMain>
      <AppShellStatusBar className="px-4">All changes saved</AppShellStatusBar>
    </AppShell>
  )
}
