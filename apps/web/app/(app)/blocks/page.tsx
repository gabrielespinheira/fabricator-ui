import { type Metadata } from "next"
import Link from "next/link"

import { getBlockPageRoute } from "@/lib/block-page"
import { SITE_BLOCK_STYLE } from "@/lib/site-style"
import { fabricatorBlocks } from "@/registry/fabricator/blocks"
import { Button } from "@/styles/base-fabricator/ui/button"

import { BlockViewer } from "./_components/block-viewer"
import { getBlockFiles } from "./_lib/block-files"
import { groupBlocks, type BlockSummary } from "./_lib/blocks"

const title = "Blocks"
const description =
  "Ready-made screens built from Fabricator UI: sign in, dashboards, an AI assistant, a messenger, an email app and a calendar. Add one with the CLI or copy its code."

const ogImage = `/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`

export const dynamic = "force-static"
export const revalidate = false

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blocks" },
  openGraph: { images: [{ url: ogImage }] },
  twitter: { card: "summary_large_image", images: [{ url: ogImage }] },
}

// The screen blocks. The App Shell starters are documented with App Shell.
const BLOCKS: BlockSummary[] = fabricatorBlocks.map(
  ({ name, title, description, categories, files }) => ({
    name,
    title,
    description,
    categories,
    route: getBlockPageRoute(files),
  })
)

export default async function BlocksPage() {
  const groups = groupBlocks(BLOCKS)
  const files = new Map(
    await Promise.all(
      BLOCKS.map(
        async (block) => [block.name, await getBlockFiles(block.name)] as const
      )
    )
  )

  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-5 px-4 pt-14 pb-10 text-center sm:pt-16">
        <h1 className="text-5xl leading-[1.06] font-medium tracking-[-0.022em] text-balance sm:text-6xl">
          Blocks
        </h1>
        <p className="max-w-[560px] text-[15px] leading-normal text-balance text-muted-foreground">
          Whole screens built from the components and laid out by the design
          guide. Add one to your app with a single command, then make it yours.
        </p>
        <nav
          aria-label="Block categories"
          className="flex flex-wrap justify-center gap-1"
        >
          {groups.map((group) => (
            <Button
              key={group.id}
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={`#${group.id}`} />}
            >
              {group.title}
            </Button>
          ))}
        </nav>
      </section>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pb-24 sm:px-6">
        {groups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-heading`}
            className="flex scroll-mt-20 flex-col gap-10"
          >
            <div className="flex flex-col gap-3">
              <h2
                id={`${group.id}-heading`}
                className="text-[28px] leading-tight font-semibold tracking-tight"
              >
                {group.title}
              </h2>
              <p className="max-w-[65ch] text-[15px] text-pretty text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="flex flex-col gap-16">
              {group.blocks.map((block) => (
                <BlockViewer
                  key={block.name}
                  block={block}
                  files={files.get(block.name) ?? []}
                  previewSrc={`/view/${SITE_BLOCK_STYLE}/${block.name}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
