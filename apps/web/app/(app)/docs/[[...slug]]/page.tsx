import Link from "next/link"
import { notFound } from "next/navigation"
import { mdxComponents } from "@/mdx-components"
import { ArrowLeftIcon, ArrowRightIcon } from "@fabricator-ui/icons"
import { cn } from "cn"

import { getDateFromFile, isChangelogEntry } from "@/lib/changelog"
import { formatChangelogDate } from "@/lib/changelog-order"
import { getDocsNeighbours } from "@/lib/docs-explorer"
import { isWideDocsPage } from "@/lib/docs-wide-pages"
import { replaceComponentsList } from "@/lib/llm"
import { source } from "@/lib/source"
import { absoluteUrl } from "@/lib/utils"
import { DocsCopyPage } from "@/components/fabricator/docs-copy-page"
import { AppShellPageTitle } from "@/styles/base-fabricator/ui/app-shell"

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
  const changelogDate = isChangelogEntry(params.slug ?? [])
    ? getDateFromFile(params.slug)
    : null
  const neighbours = isChangelog
    ? { previous: null, next: null }
    : getDocsNeighbours(
        source
          .getPages()
          .map((page) => ({ url: page.url, title: page.data.title })),
        page.url
      )
  const raw = replaceComponentsList(await page.data.getText("raw"))
  // On /docs the overview above holds the page title and lead, so the
  // introduction reads as one more section of the page.
  const isOverview = page.url === "/docs"

  return (
    <div
      data-slot="docs"
      data-wide={isWideDocsPage(page.url) || undefined}
      className="flex items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "mx-auto flex w-full min-w-0 flex-1 flex-col gap-8 pb-16 text-foreground",
            isOverview && "gap-3"
          )}
        >
          <header className="flex flex-col gap-2">
            {changelogDate && (
              <time
                dateTime={changelogDate.toISOString().slice(0, 10)}
                className="text-[13px] font-medium text-muted-foreground"
              >
                {formatChangelogDate(changelogDate)}
              </time>
            )}
            <div
              className={cn(
                "flex items-start justify-between gap-4",
                isOverview && "items-center"
              )}
            >
              {isOverview ? (
                <h2 className="text-base font-semibold tracking-tight">
                  {doc.title}
                </h2>
              ) : (
                <AppShellPageTitle>{doc.title}</AppShellPageTitle>
              )}
              <div
                className={cn(
                  "docs-nav flex shrink-0 items-center gap-1 pt-1",
                  isOverview && "pt-0"
                )}
              >
                <div className="hidden sm:block">
                  <DocsCopyPage page={raw} url={absoluteUrl(page.url)} />
                </div>
                {neighbours.previous && (
                  <Link
                    href={neighbours.previous.url}
                    className={NAV_ICON_CLASS}
                  >
                    <ArrowLeftIcon />
                    <span className="sr-only">Previous</span>
                  </Link>
                )}
                {neighbours.next && (
                  <Link href={neighbours.next.url} className={NAV_ICON_CLASS}>
                    <span className="sr-only">Next</span>
                    <ArrowRightIcon />
                  </Link>
                )}
              </div>
            </div>
            {doc.description && !isOverview && (
              <p className="max-w-[85%] text-[14px] text-balance text-muted-foreground">
                {doc.description}
              </p>
            )}
          </header>
          <div className="typeset w-full flex-1 *:data-[slot=alert]:first:mt-0">
            <MDX components={mdxComponents} />
          </div>
          <nav className="hidden items-center gap-2 sm:flex">
            {neighbours.previous && (
              <Link href={neighbours.previous.url} className={NAV_LINK_CLASS}>
                <ArrowLeftIcon className="size-4" />
                {neighbours.previous.title}
              </Link>
            )}
            {neighbours.next && (
              <Link
                href={neighbours.next.url}
                className={cn(NAV_LINK_CLASS, "ms-auto")}
              >
                {neighbours.next.title}
                <ArrowRightIcon className="size-4" />
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
