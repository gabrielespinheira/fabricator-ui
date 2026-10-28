import { type Metadata } from "next"

import { siteConfig } from "@/lib/config"
import { Announcement } from "@/components/announcement"

import { Gallery } from "./_components/gallery"

const tagline = "Components that move with you"
const metadataTitle = `${siteConfig.name} - ${tagline}`
const description = siteConfig.description
const heroDescription =
  "Interface components with a design language of their own. Every button, menu and dialog moves, responds and sounds like part of the same product, and the code lives in your project so you can make it yours."

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteConfig.url}/#website`,
  url: siteConfig.url,
  name: siteConfig.name,
  alternateName: ["Fabricator", "fabricator-ui"],
  description: siteConfig.description,
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
          tagline
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
          tagline
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
        <h1 className="mt-4 max-w-[16ch] text-5xl leading-[1.06] font-medium tracking-[-0.022em] text-balance sm:max-w-none sm:text-6xl">
          {siteConfig.name}
        </h1>
        <p className="mt-4 max-w-[540px] text-[15px] leading-normal text-balance text-muted-foreground">
          {heroDescription}
        </p>
      </section>
      <Gallery />
    </div>
  )
}
