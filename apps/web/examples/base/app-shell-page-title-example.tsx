import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPageTitle,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellPageTitleExample() {
  return (
    <AppShell storage={null}>
      <AppShellMain>
        <AppShellHeader trigger="never">
          <AppShellBreadcrumb
            items={[
              { label: "Projects", href: "/projects" },
              { label: "Launch" },
            ]}
          />
        </AppShellHeader>
        <AppShellContent
          size="sm"
          tabIndex={0}
          role="region"
          aria-label="Launch plan"
        >
          <AppShellPageTitle>Launch plan</AppShellPageTitle>
          <p className="min-h-64 text-sm text-muted-foreground">
            Design review on May 12.
          </p>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
