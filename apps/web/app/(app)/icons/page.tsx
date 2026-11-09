import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { IconsBrowser } from "./_components/icons-browser"
import { InstallCommand } from "./_components/install-command"

const title = "Icons"
const description =
  "Fabricator UI Icons for web, mobile and desktop: outline icons, brand marks, file and folder icons, plus animated icons for web and desktop apps."

const ogImage = `/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/icons" },
  openGraph: { images: [{ url: ogImage }] },
  twitter: { card: "summary_large_image", images: [{ url: ogImage }] },
}

const LINK_CLASS =
  "rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-1 focus-visible:ring-focus-ring"

export default function IconsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-5 px-4 pt-14 pb-10 text-center sm:pt-16">
        <h1 className="text-5xl leading-[1.06] font-medium tracking-[-0.022em] text-balance sm:text-6xl">
          Fabricator UI Icons
        </h1>
        <p className="max-w-[560px] text-[15px] leading-normal text-balance text-muted-foreground">
          Outline icons, brand marks, and file and folder icons for web, mobile
          and desktop. Use them in React and React Native, or as plain SVGs.
          Animated icons are available for web and desktop apps.
        </p>
        <div className="flex w-full max-w-md flex-col gap-2 text-start">
          <InstallCommand packages={["@fabricator-ui/icons"]} />
          <Link
            href="/docs/icons"
            className={`self-center text-[13px] ${LINK_CLASS}`}
          >
            Read the docs
          </Link>
        </div>
      </section>
      {/* The browser reads its filters from the URL. */}
      <React.Suspense fallback={null}>
        <IconsBrowser />
      </React.Suspense>
    </div>
  )
}
