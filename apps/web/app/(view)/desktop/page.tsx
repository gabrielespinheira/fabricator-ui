import type { Metadata } from "next"

import { getComponentGroup } from "@/lib/component-groups"
import { getExplorerExamples } from "@/lib/explorer-examples"
import { source } from "@/lib/source"

import { ExplorerLoader } from "./_components/explorer-loader"

// The desktop example's window: `bun run desktop` (Electron) and
// `bun run desktop:tauri` open it from apps/desktop. In a browser it is the
// same explorer without native window controls.
export const metadata: Metadata = {
  title: "Desktop example",
  description:
    "Every Fabricator UI component in a desktop window built with the App Shell.",
  robots: { index: false },
}

export default async function DesktopExamplePage() {
  const pages = source
    .getPages()
    .filter((page) => page.url.startsWith("/docs/components/base/"))
  const examples = Object.fromEntries(
    await Promise.all(
      pages.map(async (page) => [
        page.url.split("/").at(-1),
        getExplorerExamples(await page.data.getText("raw")),
      ])
    )
  )
  const components = pages.map((page) => {
    const slug = page.url.split("/").at(-1) ?? ""
    return { slug, title: page.data.title, group: getComponentGroup(slug) }
  })
  return <ExplorerLoader examples={examples} components={components} />
}
