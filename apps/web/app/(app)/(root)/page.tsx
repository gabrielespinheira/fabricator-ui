import { type Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { Announcement } from "@/components/announcement"
import { Button } from "@/styles/base-fabricator/ui/button"

import { BlocksShowcase } from "./_components/blocks-showcase"
import { Gallery } from "./_components/gallery"
import { HeroHeading } from "./_components/hero-heading"

const headlinePrefix = "One design system for"
const headline = `${headlinePrefix} web, mobile, and desktop`
const metadataTitle = `${siteConfig.name} - Design system for cross-platform apps`
const description =
  "Open-source components with customizable colors, typography, icons, and built-in motion."
const heroDescription =
  "Fabricator UI is an open-source design system for web, mobile, and desktop apps. Use ready-made components with built-in motion, and keep your colors, typography, and icons consistent across platforms."

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteConfig.url}/#website`,
  url: siteConfig.url,
  name: siteConfig.name,
  alternateName: ["Fabricator", "fabricator-ui"],
  description,
  inLanguage: "en-US",
  sameAs: [siteConfig.links.github],
}

export const dynamic = "force-static"
export const revalidate = false

export const metadata: Metadata = {
  title: {
    absolute: metadataTitle,
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: metadataTitle,
    description,
    siteName: siteConfig.name,
    images: [
      {
        url: `/og?title=${encodeURIComponent(
          headline
        )}&description=${encodeURIComponent(description)}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: metadataTitle,
    description,
    images: [
      {
        url: `/og?title=${encodeURIComponent(
          headline
        )}&description=${encodeURIComponent(description)}`,
      },
    ],
  },
}

export default function IndexPage() {
  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="flex flex-col items-center px-4 pt-14 pb-12 text-center sm:pt-16 sm:pb-14">
        <Announcement />
        <HeroHeading headline={headline} prefix={headlinePrefix} />
        <p className="mt-5 max-w-[40rem] text-[17px]/relaxed text-balance text-muted-foreground sm:text-lg/relaxed">
          {heroDescription}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/create" />}>
            Get started
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/blocks" />}
          >
            Browse blocks
          </Button>
        </div>
      </section>
      <BlocksShowcase />
      <Gallery />
    </div>
  )
}
