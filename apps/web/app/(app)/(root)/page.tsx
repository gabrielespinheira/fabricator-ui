import { type Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { Announcement } from "@/components/announcement"
import { CodeBlockCommand } from "@/components/code-block-command"
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header"
import { Button } from "@/styles/radix-luma/ui/button"

import { CardsDemo } from "./cards"

const title = "The Foundation for your Design System"
const metadataTitle = `${siteConfig.name} - ${title}`
const description = siteConfig.description
const heroDescription =
  "Open-code React components on Base UI, Radix and React Aria. Drop-in compatible with the tools you already use, with extra components and a design language of its own."

const INIT_COMMAND = "fabricator-ui@latest init"

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
      <PageHeader className="md:**:[.container]:pb-8 lg:**:[.container]:pb-12">
        <Announcement />
        <PageHeaderHeading className="max-w-4xl">{title}</PageHeaderHeading>
        <PageHeaderDescription>{heroDescription}</PageHeaderDescription>
        <PageActions>
          <Button asChild className="h-[35px]">
            <Link href="/docs/installation">Get Started</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/docs/components">Browse Components</Link>
          </Button>
        </PageActions>
        <figure
          data-rehype-pretty-code-figure=""
          className="mt-4! w-full max-w-md text-left"
        >
          <CodeBlockCommand
            __npm__={`npx ${INIT_COMMAND}`}
            __yarn__={`yarn dlx ${INIT_COMMAND}`}
            __pnpm__={`pnpm dlx ${INIT_COMMAND}`}
            __bun__={`bunx --bun ${INIT_COMMAND}`}
          />
        </figure>
      </PageHeader>
      <div className="container-wrapper flex-1 p-0">
        <div className="container overflow-hidden md:px-0 lg:max-w-none">
          <section className="-mx-4 w-[140vw] overflow-hidden md:hidden">
            <Image
              src="/images/full-light.webp"
              width={1600}
              height={1382}
              alt="Dashboard"
              className="block h-auto w-full dark:hidden"
              priority
            />
            <Image
              src="/images/full-dark.webp"
              width={1600}
              height={1382}
              alt="Dashboard"
              className="hidden h-auto w-full dark:block"
              priority
            />
          </section>
          <section className="hidden md:block">
            <CardsDemo />
          </section>
        </div>
      </div>
    </div>
  )
}
