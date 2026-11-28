"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"

import {
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  PlayIcon,
  RefreshCwIcon,
  XIcon,
} from "@/lib/site-icons"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/styles/base-fabricator/ui/drawer"

import {
  buildSvgMarkup,
  getIconDescription,
  getImportLine,
  getJsxSnippet,
  getPackages,
  toComponentName,
} from "../lib/icons"
import { AnimatedIconView, type AnimatedRenderer } from "./animated-icon-view"
import {
  IconPreview,
  type LoadedIcon,
  type PreviewOptions,
} from "./icon-preview"
import { InstallCommand } from "./install-command"

const PNG_SIZE = 512
const SAMPLE_SIZES = [14, 16, 18, 24, 32, 48] as const

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

class PngExportError extends Error {
  override name = "PngExportError"
}

/** Rasterises SVG markup in the browser: no server, no dependency. */
async function svgToPng(markup: string, pixels: number) {
  const image = new Image(pixels, pixels)
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  await image.decode()
  const canvas = document.createElement("canvas")
  canvas.width = pixels
  canvas.height = pixels
  const context = canvas.getContext("2d")
  if (!context) throw new PngExportError("This browser can't draw to a canvas")
  context.drawImage(image, 0, 0, pixels, pixels)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new PngExportError("PNG encoding failed")),
      "image/png"
    )
  )
}

function CopyAction({ label, value }: { label: string; value: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  return (
    <Button variant="outline" onClick={() => void copyToClipboard(value)}>
      {isCopied ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      {isCopied ? "Copied" : label}
    </Button>
  )
}

function Fact({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap gap-1 text-[13px] [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  )
}

function IconSizeSamples({
  renderPreview,
}: {
  renderPreview: (size: number) => React.ReactNode
}) {
  return (
    <ul
      aria-label="Sample sizes"
      className="grid w-full grid-cols-3 gap-x-1 gap-y-4 min-[390px]:grid-cols-6"
    >
      {SAMPLE_SIZES.map((size) => (
        <li key={size} className="flex flex-col items-center gap-2">
          <span className="flex h-12 items-center justify-center" aria-hidden>
            {renderPreview(size)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {size} px
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Plays on opening, on hover and on request; the cell's hover has ended by then. */
function AnimatedDetailPreview({
  component,
  strokeWidth,
  data,
  recipe,
}: Pick<React.ComponentProps<AnimatedRenderer>, "data" | "recipe"> & {
  component: AnimatedRenderer
  strokeWidth: number
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isLooping, setIsLooping] = React.useState(false)
  const [open, setOpen] = React.useState<boolean>()
  const [playCount, setPlayCount] = React.useState(1)
  const isPanel =
    recipe === "sidebar-toggle" ||
    recipe === "panel-left" ||
    recipe === "panel-right"
  const renderPreview = (size: number) => (
    <AnimatedIconView
      component={component}
      data={data}
      recipe={recipe}
      isPlaying={isHovered || isLooping}
      playCount={playCount}
      loop={isLooping}
      open={open}
      size={size}
      strokeWidth={strokeWidth}
    />
  )
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex w-full flex-col items-center gap-6"
      >
        {renderPreview(96)}
        <IconSizeSamples renderPreview={renderPreview} />
      </div>
      {isPanel ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          {open ? "Close panel" : "Open panel"}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlayCount((count) => count + 1)}
          >
            <PlayIcon data-icon="inline-start" />
            Play
          </Button>
          <Button
            variant={isLooping ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={isLooping}
            onClick={() => setIsLooping(!isLooping)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Loop
          </Button>
        </div>
      )}
    </div>
  )
}

/** The selected icon: previews, names, snippets, downloads and provenance. */
export function IconDetail({
  icon,
  options,
  categoryTitles,
  animated,
}: {
  icon: LoadedIcon
  options: PreviewOptions
  /** Category titles by name, from the catalog. */
  categoryTitles: Map<string, string>
  /** The animated icons, once loaded. */
  animated: AnimatedRenderer | null
}) {
  const previewRef = React.useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const scheme = resolvedTheme === "dark" ? "dark" : "light"
  const { entry } = icon
  const title = entry.set === "brands" ? entry.title : entry.name
  const snippet = `${getImportLine(entry)}\n\n${getJsxSnippet(entry, options)}`
  const svg = buildSvgMarkup(icon.source, {
    ...options,
    color: "currentColor",
    scheme,
  })
  const recipe = entry.set === "animated" ? entry.motion : undefined

  const downloadPng = async () => {
    // A standalone PNG can't follow the text colour: paint it with the
    // colour the preview is showing in the current theme.
    const color = previewRef.current
      ? getComputedStyle(previewRef.current).color
      : "#171717"
    const markup = buildSvgMarkup(icon.source, {
      ...options,
      size: PNG_SIZE,
      color,
      scheme,
    })
    downloadBlob(await svgToPng(markup, PNG_SIZE), `${entry.name}.png`)
  }

  return (
    <>
      <DrawerHeader className="flex-row items-start justify-between gap-3 px-4 py-4 group-data-[swipe-axis=y]/drawer-popup:text-start sm:px-6">
        <div className="min-w-0 space-y-1">
          <DrawerTitle className="font-mono [overflow-wrap:anywhere]">
            {toComponentName(entry.name)}
          </DrawerTitle>
          <DrawerDescription>{getIconDescription(entry)}</DrawerDescription>
        </div>
        <DrawerClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close preview"
              title="Close preview"
            />
          }
        >
          <XIcon />
        </DrawerClose>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <div
            ref={previewRef}
            className="flex min-w-0 flex-col items-center gap-5 rounded-(--radius-surface) bg-surface-2 px-4 pt-6 pb-4 text-foreground shadow-surface-2"
          >
            {animated && recipe && icon.set === "animated" ? (
              <AnimatedDetailPreview
                component={animated}
                data={icon.data}
                recipe={recipe}
                strokeWidth={options.strokeWidth}
              />
            ) : (
              <>
                <IconPreview icon={icon} {...options} size={96} />
                <IconSizeSamples
                  renderPreview={(size) => (
                    <IconPreview icon={icon} {...options} size={size} />
                  )}
                />
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <pre className="rounded-(--radius-surface) bg-surface-2 p-3 font-mono text-[12px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap shadow-surface-2">
              <code>{snippet}</code>
            </pre>
            <div className="grid grid-cols-2 gap-2">
              <CopyAction label="Copy JSX" value={snippet} />
              {entry.set === "animated" ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/icons?icon=${entry.name}`} />}
                >
                  Static icon
                </Button>
              ) : (
                <>
                  <CopyAction label="Copy SVG" value={svg} />
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadBlob(
                        new Blob([svg], { type: "image/svg+xml" }),
                        `${entry.name}.svg`
                      )
                    }
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Download SVG
                  </Button>
                  <Button variant="outline" onClick={() => void downloadPng()}>
                    <DownloadIcon data-icon="inline-start" />
                    Download PNG
                  </Button>
                </>
              )}
            </div>
            <InstallCommand packages={getPackages(entry.set)} />
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-3 pt-4">
          {entry.set === "files" && (
            <Fact label="Source">
              <a
                href="https://github.com/littensy/charmed-icons/tree/v0.10.0"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Charmed Icons v0.10.0 · MIT
              </a>
            </Fact>
          )}
          {entry.set !== "brands" ? (
            <>
              {entry.aliases.length > 0 && (
                <Fact label="Also exported as">
                  {entry.aliases.map((alias) => (
                    <code key={alias} className="font-mono">
                      {toComponentName(alias)}
                    </code>
                  ))}
                </Fact>
              )}
              <Fact label="Categories">
                {entry.categories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {categoryTitles.get(category) ?? category}
                  </Badge>
                ))}
              </Fact>
            </>
          ) : (
            <>
              <Fact label="Brand colour">
                <span
                  aria-hidden="true"
                  className="size-4 rounded-sm"
                  style={{ backgroundColor: entry.hex }}
                />
                <code className="font-mono">{entry.hex}</code>
              </Fact>
              <Fact label="Source">
                {entry.artSource
                  ? `${entry.source}; art: ${entry.artSource}`
                  : entry.source}
              </Fact>
              <Fact label="Licence">{entry.license}</Fact>
              {entry.credit && <Fact label="Credit">{entry.credit}</Fact>}
              {entry.guidelines && (
                <Fact label="Guidelines">
                  <a
                    href={entry.guidelines}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    {title} brand guidelines
                    <ArrowUpRightIcon className="size-3.5" />
                  </a>
                </Fact>
              )}
            </>
          )}
          {entry.tags.length > 0 && (
            <Fact label="Tags">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </Fact>
          )}
        </dl>

        {entry.set === "brands" && (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Brand marks belong to their owners. Read the{" "}
            <Link
              href="/docs/icons/brands"
              className="underline underline-offset-4"
            >
              brands policy
            </Link>{" "}
            before using one.
          </p>
        )}
      </div>
    </>
  )
}
