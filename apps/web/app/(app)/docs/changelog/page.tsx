import Link from "next/link"
import { IconRss } from "@tabler/icons-react"

import { getChangelogPages, type ChangelogPageData } from "@/lib/changelog"
import { formatChangelogDate } from "@/lib/changelog-order"
import { absoluteUrl } from "@/lib/utils"
import { Button } from "@/styles/radix-nova/ui/button"

export const revalidate = false
export const dynamic = "force-static"

const DESCRIPTION =
  "Every Fabricator UI release, newest first, with the components it added and changed."

export function generateMetadata() {
  return {
    title: "Changelog",
    description: DESCRIPTION,
    openGraph: {
      title: "Changelog",
      description: DESCRIPTION,
      type: "article",
      url: absoluteUrl("/docs/changelog"),
      images: [
        {
          url: `/og?title=${encodeURIComponent(
            "Changelog"
          )}&description=${encodeURIComponent(DESCRIPTION)}`,
        },
      ],
    },
  }
}

export default function ChangelogPage() {
  const pages = getChangelogPages()

  return (
    <div
      data-slot="docs"
      className="flex scroll-mt-24 items-stretch pb-8 text-[1.05rem] sm:text-[15px] xl:w-full"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-(--top-spacing) shrink-0" />
        <div className="mx-auto flex w-full max-w-160 min-w-0 flex-1 flex-col gap-6 px-4 py-6 text-foreground md:px-0 lg:py-8 dark:text-foreground">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h1 className="scroll-m-24 text-4xl font-semibold tracking-tight sm:text-3xl">
                Changelog
              </h1>
              <Button variant="secondary" size="sm" asChild>
                <a href="/rss.xml" target="_blank" rel="noopener noreferrer">
                  <IconRss />
                  RSS
                </a>
              </Button>
            </div>
            <p className="text-[1.05rem] text-muted-foreground sm:text-base">
              {DESCRIPTION}
            </p>
          </div>
          <ol className="flex w-full flex-col gap-3 pb-16 sm:pb-0">
            {pages.map((page) => {
              const data = page.data as ChangelogPageData
              return (
                <li key={page.url}>
                  <Link
                    href={page.url}
                    className="flex w-full flex-col rounded-2xl bg-surface px-4 py-3 text-surface-foreground transition-colors hover:bg-surface/80"
                  >
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="text-sm font-medium">{data.title}</span>
                      {page.date && (
                        <time
                          dateTime={page.date.toISOString().slice(0, 10)}
                          className="shrink-0 text-xs text-muted-foreground"
                        >
                          {formatChangelogDate(page.date)}
                        </time>
                      )}
                    </span>
                    {data.description && (
                      <span className="mt-1 text-[13px] text-muted-foreground">
                        {data.description}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
