import { getColors } from "@/lib/colors"
import { source } from "@/lib/source"
import { DocsMobileBar } from "@/components/fabricator/docs-mobile-bar"
import { DocsShellSidebar } from "@/components/fabricator/docs-shell-sidebar"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const colors = getColors()

  return (
    <div data-slot="docs-shell" className="flex flex-1 items-start">
      <DocsShellSidebar
        tree={source.pageTree}
        colors={colors}
        className="hidden lg:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DocsMobileBar tree={source.pageTree} colors={colors} />
        {children}
      </div>
    </div>
  )
}
