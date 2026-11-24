import * as React from "react"
import { type Metadata } from "next"

import { BlocksGallery, BlocksGalleryView } from "./_components/blocks-gallery"
import { BLOCKS } from "./_lib/block-list"
import { ALL_BLOCKS } from "./_lib/blocks"

const title = "Blocks"
const description =
  "Ready-made screens built from Fabricator UI: dashboards, chat, email, a calendar, settings, onboarding and sign in. Add one with the CLI or copy its code."

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

export default function BlocksPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-5 px-4 pt-14 pb-10 text-center sm:pt-16">
        <h1 className="text-5xl leading-[1.06] font-medium tracking-[-0.022em] text-balance sm:text-6xl">
          Blocks
        </h1>
        <p className="max-w-[560px] text-[15px] leading-normal text-balance text-muted-foreground">
          Whole screens built from the components. Add one to your app with a
          single command, then make it yours.
        </p>
      </section>
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        {/* The gallery reads its filter from the URL. */}
        <React.Suspense
          fallback={<BlocksGalleryView blocks={BLOCKS} filter={ALL_BLOCKS} />}
        >
          <BlocksGallery blocks={BLOCKS} />
        </React.Suspense>
      </div>
    </div>
  )
}
