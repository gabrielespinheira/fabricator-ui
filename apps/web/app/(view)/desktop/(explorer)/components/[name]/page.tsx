import { notFound } from "next/navigation"
import { mdxComponents } from "@/mdx-components"

import { source } from "@/lib/source"
import { AppShellPageTitle } from "@/styles/base-fabricator/ui/app-shell"

import { DesktopDocsLink } from "../../../_components/docs-link"

export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return source
    .getPages()
    .filter((page) => page.url.startsWith("/docs/components/base/"))
    .map((page) => ({ name: page.slugs.at(-1) }))
}

export default async function DesktopComponentPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const page = source.getPage(["components", "base", name])
  if (!page) notFound()
  const MDX = page.data.body

  return (
    <div data-slot="docs" className="flex min-w-0 flex-col gap-8 pb-16">
      <header className="flex flex-col gap-2">
        <AppShellPageTitle>{page.data.title}</AppShellPageTitle>
        <p className="text-sm text-muted-foreground">{page.data.description}</p>
      </header>
      <div className="typeset w-full min-w-0 *:data-[slot=alert]:first:mt-0">
        <MDX components={{ ...mdxComponents, a: DesktopDocsLink }} />
      </div>
    </div>
  )
}
