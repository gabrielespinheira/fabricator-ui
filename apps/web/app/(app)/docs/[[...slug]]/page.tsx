import Link from "next/link"
import { notFound } from "next/navigation"
import { mdxComponents } from "@/mdx-components"
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react"
import { cn } from "cn"
import { findNeighbour } from "fumadocs-core/page-tree"

import { replaceComponentsList } from "@/lib/llm"
import { source } from "@/lib/source"
import { absoluteUrl } from "@/lib/utils"
import { DocsBaseSwitcher } from "@/components/docs-base-switcher"
import { DocsCopyPage } from "@/components/fabricator/docs-copy-page"

export const revalidate = false
export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page) {
    notFound()
  }

  const doc = page.data

  if (!doc.title || !doc.description) {
    notFound()
  }

  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: page.url,
    },
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: "article",
      url: absoluteUrl(page.url),
      images: [
        {
          url: `/og?title=${encodeURIComponent(
            doc.title
          )}&description=${encodeURIComponent(doc.description)}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: doc.title,
      description: doc.description,
      images: [
        {
          url: `/og?title=${encodeURIComponent(
            doc.title
          )}&description=${encodeURIComponent(doc.description)}`,
        },
      ],
    },
  }
}

export default async function Page(props: {
  params: Promise<{ slug: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) {
    notFound()
  }

  const doc = page.data
  const MDX = doc.body
  const isChangelog = params.slug?.[0] === "changelog"
  const neighbours = isChangelog
    ? { previous: null, next: null }
    : findNeighbour(source.pageTree, page.url)
  const raw = replaceComponentsList(await page.data.getText("raw"))

  const isComponentPage =
    params.slug?.[0] === "components" && !!params.slug[1] && !!params.slug[2]

  return (
    <div data-slot="docs" className="flex items-start">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col gap-8 px-4 pt-8 pb-16 text-foreground md:px-0 lg:pt-24">
          <header className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="scroll-m-24 text-[28px] leading-tight font-semibold tracking-tight text-balance">
                {doc.title}
              </h1>
              <div className="docs-nav flex shrink-0 items-center gap-1 pt-1">
                <div className="hidden sm:block">
                  <DocsCopyPage page={raw} url={absoluteUrl(page.url)} />
                </div>
                {neighbours.previous && (
                  <Link
                    href={neighbours.previous.url}
                    className={NAV_ICON_CLASS}
                  >
                    <IconArrowLeft />
                    <span className="sr-only">Previous</span>
                  </Link>
                )}
                {neighbours.next && (
                  <Link href={neighbours.next.url} className={NAV_ICON_CLASS}>
                    <span className="sr-only">Next</span>
                    <IconArrowRight />
                  </Link>
                )}
              </div>
            </div>
            {doc.description && (
              <p className="max-w-[85%] text-[14px] text-balance text-muted-foreground">
                {doc.description}
              </p>
            )}
          </header>
          <div className="typeset w-full flex-1 *:data-[slot=alert]:first:mt-0">
            {isComponentPage && (
              <DocsBaseSwitcher
                base={params.slug[1]}
                component={params.slug[2]}
                className="mb-6"
              />
            )}
            <MDX components={mdxComponents} />
          </div>
          <nav className="hidden items-center gap-2 sm:flex">
            {neighbours.previous && (
              <Link href={neighbours.previous.url} className={NAV_LINK_CLASS}>
                <IconArrowLeft className="size-4" />
                {neighbours.previous.name}
              </Link>
            )}
            {neighbours.next && (
              <Link
                href={neighbours.next.url}
                className={cn(NAV_LINK_CLASS, "ms-auto")}
              >
                {neighbours.next.name}
                <IconArrowRight className="size-4" />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}

const NAV_ICON_CLASS =
  "flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-feedback ease-feedback hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring [&_svg]:size-4"

const NAV_LINK_CLASS =
  "flex h-9 items-center gap-2 rounded-lg px-3 text-[14px] font-medium text-muted-foreground outline-none transition-colors duration-feedback ease-feedback hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring"
