import { type Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getBlockPageRoute } from "@/lib/block-page"
import { ArrowLeftIcon, ArrowRightIcon } from "@/lib/site-icons"
import { SITE_BLOCK_STYLE } from "@/lib/site-style"
import { source } from "@/lib/source"
import { FluidNav, FluidNavLink } from "@/components/fabricator/fluid-nav"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/styles/base-fabricator/ui/breadcrumb"
import { Button } from "@/styles/base-fabricator/ui/button"

import { BlockViewer } from "../_components/block-viewer"
import { CopyCommand } from "../_components/copy-command"
import { getBlockFiles } from "../_lib/block-files"
import { BLOCKS, getBlockDeclaration } from "../_lib/block-list"
import {
  getBlockCategory,
  getBlockNeighbours,
  getComponentLinks,
  getFilterHref,
} from "../_lib/blocks"

export const dynamic = "force-static"
export const revalidate = false
export const dynamicParams = false

type Props = { params: Promise<{ name: string }> }

export function generateStaticParams() {
  return BLOCKS.map(({ name }) => ({ name }))
}

function getBlock(name: string) {
  const block = BLOCKS.find((block) => block.name === name)
  const declaration = getBlockDeclaration(name)
  if (!block || !declaration) notFound()
  return { ...block, ...declaration }
}

function getComponentTitle(slug: string) {
  return source.getPage(["components", "base", slug])?.data.title
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const block = getBlock(name)
  const title = `${block.title} block`
  const url = `/blocks/${name}`
  const images = [
    {
      url: `/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(block.summary)}`,
    },
  ]

  return {
    title,
    description: block.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: block.description,
      type: "article",
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: block.description,
      images,
    },
  }
}

export default async function BlockPage({ params }: Props) {
  const { name } = await params
  const block = getBlock(name)
  const category = getBlockCategory(block)
  const { previous, next } = getBlockNeighbours(BLOCKS, name)
  const components = getComponentLinks(
    [
      ...block.registryDependencies,
      ...(block.meta.baseRegistryDependencies?.base ?? []),
    ],
    getComponentTitle
  )

  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-10 px-4 pt-6 pb-24 sm:px-5 sm:pt-10">
      <header className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/blocks" />}>
                Blocks
              </BreadcrumbLink>
            </BreadcrumbItem>
            {category && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={<Link href={getFilterHref(category.id)} />}
                  >
                    {category.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="flex max-w-[65ch] min-w-0 flex-1 basis-96 flex-col gap-3">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
              {block.title}
            </h1>
            <p className="text-[15px] text-pretty text-muted-foreground">
              {block.description}
            </p>
          </div>
          <CopyCommand name={name} />
        </div>
      </header>
      <BlockViewer
        title={block.title}
        route={getBlockPageRoute(block.files)}
        categories={block.categories}
        files={await getBlockFiles(name)}
        previewSrc={`/view/${SITE_BLOCK_STYLE}/${name}`}
      />
      {components.length > 0 && (
        <section
          aria-labelledby="components-used"
          className="flex flex-col gap-3"
        >
          <h2 id="components-used" className="text-base font-semibold">
            Components used
          </h2>
          <FluidNav
            axis="xy"
            aria-labelledby="components-used"
            className="-mx-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          >
            {components.map(({ title, href }) => (
              <FluidNavLink
                key={href}
                href={href}
                className="h-9 px-3 text-[13px]"
              >
                {title}
              </FluidNavLink>
            ))}
          </FluidNav>
        </section>
      )}
      <nav
        aria-label="More blocks"
        className="-mx-3 flex flex-wrap justify-between gap-2"
      >
        {previous && (
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href={`/blocks/${previous.name}`} rel="prev" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            <span className="sr-only">Previous block: </span>
            {previous.title}
          </Button>
        )}
        {next && (
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href={`/blocks/${next.name}`} rel="next" />}
            className="ms-auto"
          >
            <span className="sr-only">Next block: </span>
            {next.title}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        )}
      </nav>
    </div>
  )
}
