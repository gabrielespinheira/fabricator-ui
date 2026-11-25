"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsStringLiteral, useQueryState } from "nuqs"

import {
  FluidHoverHighlight,
  useFluidHover,
} from "@/styles/base-fabricator/lib/fluid-hover"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"

import { type GalleryBlock } from "../_lib/block-previews"
import {
  ALL_BLOCKS,
  BLOCK_FILTERS,
  filterBlocks,
  getBlockFilters,
  getHashHref,
  isBlockFilter,
  type BlockFilter,
  type BlockSummary,
} from "../_lib/blocks"

const filterParser = parseAsStringLiteral(BLOCK_FILTERS).withDefault(ALL_BLOCKS)

const THEMES = [
  { theme: "light", className: "dark:hidden" },
  { theme: "dark", className: "hidden dark:block" },
] as const

/**
 * The gallery, with its filter in the URL. The server can't know the filter of
 * a static page, so it sends every block (the page's Suspense fallback).
 */
export function BlocksGallery({ blocks }: { blocks: GalleryBlock[] }) {
  const [filter, setFilter] = useQueryState("category", filterParser)
  useHashRedirect(blocks)

  return (
    <BlocksGalleryView
      blocks={blocks}
      filter={filter}
      onFilterChange={(next) => void setFilter(next)}
    />
  )
}

// The page used to hold every block's viewer. Links to one (#finance-01) or to
// a category (#chat) still arrive, and only the browser sees a hash.
function useHashRedirect(blocks: BlockSummary[]) {
  const router = useRouter()

  React.useEffect(() => {
    function followHash() {
      const href = getHashHref(window.location.hash, blocks)
      if (href) router.replace(href, { scroll: false })
    }

    followHash()
    window.addEventListener("hashchange", followHash)
    return () => window.removeEventListener("hashchange", followHash)
  }, [blocks, router])
}

export function BlocksGalleryView({
  blocks,
  filter,
  onFilterChange,
}: {
  blocks: GalleryBlock[]
  filter: BlockFilter
  onFilterChange?: (filter: BlockFilter) => void
}) {
  const { attach, hover, props } = useFluidHover<HTMLDivElement>({
    items: "[data-block-card]",
    axis: "xy",
    gapClick: false,
  })

  return (
    <Tabs
      value={filter}
      onValueChange={(next) => {
        if (isBlockFilter(next)) onFilterChange?.(next)
      }}
      className="gap-6"
    >
      <div className="-mx-4 scrollbar-hide flex scroll-fade-x overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <TabsList aria-label="Filter by category">
          {getBlockFilters(blocks).map(({ id, title }) => (
            <TabsTrigger key={id} value={id}>
              {title}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={filter}>
        {/* The cards reach 12px past the column, so their pictures sit on its
            edge and the hover wash surrounds them. */}
        <div
          ref={attach}
          {...props}
          className="relative isolate -mx-3 grid gap-y-4 md:grid-cols-2"
        >
          <FluidHoverHighlight hover={hover} className="rounded-2xl" />
          {filterBlocks(blocks, filter).map((block) => (
            <BlockCard key={block.name} block={block} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}

function BlockCard({ block }: { block: GalleryBlock }) {
  return (
    <Link
      href={`/blocks/${block.name}`}
      data-block-card=""
      className="relative flex flex-col gap-3 rounded-2xl p-3 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      {/* The picture covers the dark surface's inner edge, so it is redrawn
          over it. */}
      <span className="relative block aspect-video overflow-hidden rounded-xl bg-surface-3 shadow-surface-3 dark:after:absolute dark:after:inset-0 dark:after:rounded-[inherit] dark:after:shadow-[inset_0_0_0_1px_var(--dm-ring-high)]">
        {THEMES.map(({ theme, className }) => (
          <Image
            key={theme}
            src={block.previews[theme]}
            alt=""
            width={1280}
            height={720}
            sizes="(min-width: 1152px) 552px, (min-width: 768px) 50vw, 100vw"
            className={`size-full object-cover ${className}`}
          />
        ))}
      </span>
      <span className="flex flex-col gap-0.5">
        <h2 className="text-[14px] font-medium">{block.title}</h2>
        <span className="text-[13px] text-muted-foreground">
          {block.summary}
        </span>
      </span>
    </Link>
  )
}
