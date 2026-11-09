import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { IconsBrowser } from "./_components/icons-browser"
import { InstallCommand } from "./_components/install-command"

const title = "Icons"
const description =
  "Outline, custom, brand, file and animated icons for React, React Native and plain SVG."

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
          Icons
        </h1>
        <p className="max-w-[560px] text-[15px] leading-normal text-balance text-muted-foreground">
          Every Lucide icon under its Lucide name, our own custom icons, brand
          marks in one colour or their own and{" "}
          <Link href="/docs/icons/animated" className={LINK_CLASS}>
            animated icons
          </Link>
          , plus{" "}
          <Link href="/docs/icons/files" className={LINK_CLASS}>
            file and folder icons
          </Link>
          . Switching from <code>lucide-react</code> is an import change. Also
          for{" "}
          <Link href="/docs/icons/react-native" className={LINK_CLASS}>
            React Native
          </Link>{" "}
          and{" "}
          <Link href="/docs/icons/static" className={LINK_CLASS}>
            plain SVG
          </Link>
          .
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
