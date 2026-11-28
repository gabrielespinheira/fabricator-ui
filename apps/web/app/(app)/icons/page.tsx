import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { BookOpenIcon } from "@/lib/site-icons"
import { buttonVariants } from "@/styles/base-fabricator/ui/button"

import { IconsBrowser } from "./_components/icons-browser"
import { InstallIconsPopover } from "./_components/install-command"

const title = "Icons"
const description =
  "Fabricator UI Icons for web, mobile and desktop: outline, fill and duotone icons, plus animated icons for web and desktop, brand marks and file icons."

const ogImage = `/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/icons" },
  openGraph: { images: [{ url: ogImage }] },
  twitter: { card: "summary_large_image", images: [{ url: ogImage }] },
}

export default function IconsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-5 px-4 pt-8 pb-10 sm:gap-8 sm:px-8 md:pt-12 lg:px-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
            Fabricator UI Icons
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            React, React Native, and standalone SVGs.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/docs/icons"
            className={buttonVariants({ variant: "ghost" })}
          >
            <BookOpenIcon data-icon="inline-start" />
            Documentation
          </Link>
          <InstallIconsPopover />
        </div>
      </header>
      {/* The browser reads its filters from the URL. */}
      <React.Suspense fallback={null}>
        <IconsBrowser />
      </React.Suspense>
    </div>
  )
}
