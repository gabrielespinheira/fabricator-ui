import { type Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { Announcement } from "@/components/announcement"
import { HeroCommand } from "@/components/fabricator/hero-command"
import { Button } from "@/styles/base-fabricator/ui/button"

import { Gallery } from "./_components/gallery"

const title = "Components that move with you"
const metadataTitle = `${siteConfig.name} - ${title}`
const description = siteConfig.description
const heroDescription =
  "Fabricator UI is a React component library you add to your project as source code, with one command. Over 60 accessible components for Base UI, Radix or React Aria, each with fluid hover, motion at four speeds and its own interface sound. The code lives in your repo, so you can change any of it."

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
          title
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
          title
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
      <section className="flex flex-col items-center px-4 pt-20 pb-16 text-center sm:pt-24 sm:pb-20">
        <Announcement />
        <h1 className="mt-7 max-w-[16ch] text-[34px] leading-[1.06] font-medium tracking-[-0.022em] text-balance sm:max-w-none sm:text-[40px]">
          {title}
        </h1>
        <p className="mt-4 max-w-[540px] text-[15px] leading-normal text-balance text-muted-foreground">
          {heroDescription}
        </p>
        <div className="mt-7 flex items-center gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/create" />}
          >
            Get started
          </Button>
          <Button
            variant="ghost"
            size="lg"
            nativeButton={false}
            render={<Link href="/docs/components" />}
          >
            Browse components
          </Button>
        </div>
        <HeroCommand className="mt-10" />
      </section>
      <Gallery />
    </div>
  )
}
