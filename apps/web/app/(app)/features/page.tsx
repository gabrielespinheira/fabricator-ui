import { type Metadata } from "next"
import Link from "next/link"

import { Button } from "@/styles/base-fabricator/ui/button"

import { BlueprintPreview } from "./_components/blueprint-preview"
import { BrandingPreview } from "./_components/branding-preview"
import { FeatureSection } from "./_components/feature-section"
import { FluidHoverPreview } from "./_components/fluid-hover-preview"
import { IconsPreview } from "./_components/icons-preview-loader"
import { ScrollFadePreview } from "./_components/scroll-fade-preview"
import { SoundsPreview } from "./_components/sounds-preview"
import { SquirclePreview } from "./_components/squircle-preview"
import { SubmenuAimPreview } from "./_components/submenu-aim-preview"
import { SurfacesPreview } from "./_components/surfaces-preview"
import { FEATURES, type FeatureId } from "./_lib/features"

const title = "Features"
const headline = "The details are built in"
const description =
  "Branding, fluid hover, squircle corners, safe submenus, surfaces, sounds, scroll fades, Blueprint and Fabricator Icons: the details Fabricator UI components ship with, and why they're there."

const ogImage = `/og?title=${encodeURIComponent(headline)}&description=${encodeURIComponent(description)}`

const PREVIEWS: Record<FeatureId, React.ReactNode> = {
  branding: <BrandingPreview />,
  "fluid-hover": <FluidHoverPreview />,
  squircle: <SquirclePreview />,
  "safe-submenus": <SubmenuAimPreview />,
  surfaces: <SurfacesPreview />,
  sounds: <SoundsPreview />,
  "scroll-fade": <ScrollFadePreview />,
  blueprint: <BlueprintPreview />,
  icons: <IconsPreview />,
}

export const dynamic = "force-static"
export const revalidate = false

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/features" },
  openGraph: { images: [{ url: ogImage }] },
  twitter: { card: "summary_large_image", images: [{ url: ogImage }] },
}

export default function FeaturesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col items-center px-4 pt-14 pb-12 text-center sm:pt-16">
        <p className="text-[15px] font-medium text-muted-foreground">{title}</p>
        <h1 className="mt-4 max-w-3xl text-5xl leading-[1.06] font-medium tracking-[-0.022em] text-balance sm:text-6xl">
          {headline}
        </h1>
        <p className="mt-5 max-w-[40rem] text-[17px]/relaxed text-balance text-muted-foreground sm:text-lg/relaxed">
          Fabricator UI components come with the details people feel before they
          notice them, like a highlight that glides between rows or a menu that
          waits while you reach for its submenu. Here is what each one does and
          why we built it.
        </p>
        <nav
          aria-label="Features on this page"
          className="mt-10 flex max-w-5xl flex-wrap justify-center gap-2"
        >
          {FEATURES.map((feature) => (
            <Button
              key={feature.id}
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={`#${feature.id}`} />}
            >
              {feature.name}
            </Button>
          ))}
        </nav>
      </section>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-12 pb-24 sm:px-6 lg:gap-32 lg:pt-16">
        {FEATURES.map((feature, index) => (
          <FeatureSection
            key={feature.id}
            feature={feature}
            index={index}
            preview={PREVIEWS[feature.id]}
          />
        ))}
      </div>
      <section className="flex flex-col items-center px-4 pt-8 pb-28 text-center">
        <h2 className="max-w-xl text-[28px] leading-tight font-semibold tracking-[-0.01em] text-balance">
          Every one of them ships with the components
        </h2>
        <p className="mt-3 max-w-[34rem] text-[15px] leading-relaxed text-balance text-muted-foreground">
          Start a project with the CLI and your menus, cards and lists have them
          from the first screen.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/create" />}>
            Get started
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/docs" />}
          >
            Browse components
          </Button>
        </div>
      </section>
    </div>
  )
}
