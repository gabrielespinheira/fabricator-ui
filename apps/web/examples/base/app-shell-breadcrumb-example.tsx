import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellBreadcrumbExample() {
  return (
    <AppShell storage={null}>
      <AppShellMain>
        <AppShellHeader trigger="never">
          <AppShellBreadcrumb
            items={[
              { label: "Workspace", href: "/" },
              { label: "Projects", href: "/projects" },
              { label: "Launch plan" },
            ]}
          />
        </AppShellHeader>
        <AppShellContent className="px-3 text-sm text-muted-foreground">
          Timeline and milestones
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
