import * as React from "react"
import type { Metadata } from "next"

import { getComponentGroup } from "@/lib/component-groups"
import { source } from "@/lib/source"

import { ExplorerLoader } from "../_components/explorer-loader"

export const metadata: Metadata = {
  title: "Desktop example",
  description:
    "Every Fabricator UI component and its documentation in a desktop window.",
  robots: { index: false },
}

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const components = source
    .getPages()
    .filter((page) => page.url.startsWith("/docs/components/base/"))
    .map((page) => {
      const slug = page.slugs.at(-1) ?? ""
      return {
        slug,
        title: page.data.title,
        group: getComponentGroup(slug),
        toc: page.data.toc,
      }
    })

  return <ExplorerLoader components={components}>{children}</ExplorerLoader>
}
