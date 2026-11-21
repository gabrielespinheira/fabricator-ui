import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellContentExample() {
  return (
    <AppShell storage={null}>
      <AppShellMain>
        <AppShellHeader trigger="never">Launch timeline</AppShellHeader>
        <AppShellContent
          size="sm"
          tabIndex={0}
          role="region"
          aria-label="Milestones"
        >
          <section className="min-h-40">
            <h2 className="font-medium">May 12</h2>
            <p>Design review</p>
          </section>
          <section className="min-h-40">
            <h2 className="font-medium">May 19</h2>
            <p>Beta release</p>
          </section>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
