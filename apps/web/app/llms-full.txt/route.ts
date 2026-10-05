import { NextResponse } from "next/server"

import { siteConfig } from "@/lib/config"
import { processMdxForLLMs } from "@/lib/llm"
import { toSiteStyle } from "@/lib/site-style"
import { source } from "@/lib/source"
import { type Style } from "@/registry/_legacy-styles"

export const revalidate = false
export const dynamic = "force-static"

// Every docs page as one Markdown file for AI tools. Component pages are
// included once, for the default base (Base UI); the Radix and React Aria
// variants are available per page at /docs/components/<base>/<name>.md.
const SKIPPED_PREFIXES = ["components/radix/", "components/aria/", "changelog/"]

export async function GET() {
  const pages = source
    .getPages()
    .filter(
      (page) =>
        !SKIPPED_PREFIXES.some((prefix) =>
          page.slugs.join("/").startsWith(prefix)
        )
    )

  const sections = await Promise.all(
    pages.map(async (page) => {
      const content = processMdxForLLMs(
        (await page.data.getText("raw")).replace(/^---\n[\s\S]*?\n---\n/, ""),
        toSiteStyle("base-nova") as Style["name"]
      )
      return [
        `# ${page.data.title}`,
        `URL: ${siteConfig.url}${page.url}`,
        page.data.description ?? "",
        content.trim(),
      ]
        .filter(Boolean)
        .join("\n\n")
    })
  )

  const header = `# ${siteConfig.name}\n\n> ${siteConfig.description}\n\nFull documentation in one file. An index of pages is at ${siteConfig.url}/llms.txt.`

  return new NextResponse([header, ...sections].join("\n\n---\n\n") + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}
