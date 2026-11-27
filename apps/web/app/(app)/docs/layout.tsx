import { Suspense } from "react"

import { getChangelogDay, isChangelogEntry } from "@/lib/changelog"
import { getChangelogReleases } from "@/lib/changelog-releases"
import { getPageReleaseBadge, getReleaseBadges } from "@/lib/release-badges"
import { source } from "@/lib/source"
import { DocsAppShell } from "@/components/fabricator/docs-app-shell"
import {
  AppShell,
  AppShellContent,
  AppShellMain,
} from "@/styles/base-fabricator/ui/app-shell"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const releaseBadges = getReleaseBadges(getChangelogReleases())
  return (
    <Suspense
      fallback={
        <div data-slot="docs-shell">
          <AppShell storage={null}>
            <AppShellMain>
              <AppShellContent>{children}</AppShellContent>
            </AppShellMain>
          </AppShell>
        </div>
      }
    >
      <DocsAppShell
        tree={source.pageTree}
        pages={source.getPages().map((page) => ({
          url: page.url,
          title: page.data.title,
          date: isChangelogEntry(page.slugs)
            ? getChangelogDay(page.slugs)
            : undefined,
          release: getPageReleaseBadge(releaseBadges, page.url),
        }))}
      >
        {children}
      </DocsAppShell>
    </Suspense>
  )
}
