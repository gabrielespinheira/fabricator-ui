"use client"

import * as React from "react"
import Link from "next/link"

import {
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
} from "@/lib/site-icons"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/styles/base-fabricator/ui/sheet"

import {
  buildSvgMarkup,
  getImportLine,
  getJsxSnippet,
  getPackages,
  toComponentName,
} from "../lib/icons"
import {
  AnimatedIconView,
  type AnimatedComponent,
  type AnimatedComponents,
} from "./animated-icon-view"
import {
  IconPreview,
  type LoadedIcon,
  type PreviewOptions,
} from "./icon-preview"
import { InstallCommand } from "./install-command"

const PNG_SIZE = 512
const SAMPLE_SIZES = [14, 16, 18, 24]

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
    <div className="flex flex-col gap-1">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap gap-1 text-[13px] [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  )
}

const PLAY_MILLISECONDS = 1800

/** Plays on opening, on hover and on request; the cell's hover has ended by then. */
function AnimatedDetailPreview({
  component,
  strokeWidth,
}: {
  component: AnimatedComponent
  strokeWidth: number
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isReplaying, setIsReplaying] = React.useState(true)
  React.useEffect(() => {
    if (!isReplaying) return
    const timer = setTimeout(() => setIsReplaying(false), PLAY_MILLISECONDS)
    return () => clearTimeout(timer)
  }, [isReplaying])
  const isPlaying = isHovered || isReplaying
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex flex-col items-center gap-5"
      >
        <AnimatedIconView
          component={component}
          isPlaying={isPlaying}
          size={96}
          strokeWidth={strokeWidth}
        />
        <div
          className="flex items-end gap-5 text-muted-foreground"
          aria-hidden="true"
        >
          {SAMPLE_SIZES.map((size) => (
            <AnimatedIconView
              key={size}
              component={component}
              isPlaying={isPlaying}
              size={size}
              strokeWidth={strokeWidth}
            />
          ))}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={isReplaying}
        onClick={() => setIsReplaying(true)}
      >
        Play
      </Button>
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
  animated: AnimatedComponents | null
}) {
  const previewRef = React.useRef<HTMLDivElement>(null)
  const { entry } = icon
  const title = entry.set === "brands" ? entry.title : entry.name
  const snippet = `${getImportLine(entry)}\n\n${getJsxSnippet(entry, options)}`
  const svg = buildSvgMarkup(icon.source, { ...options, color: "currentColor" })
  const moving =
    entry.set === "animated"
      ? animated?.get(toComponentName(entry.name))
      : undefined

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
    })
    downloadBlob(await svgToPng(markup, PNG_SIZE), `${entry.name}.png`)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
      <SheetHeader className="px-0">
        <SheetTitle className="font-mono">
          {toComponentName(entry.name)}
        </SheetTitle>
        <SheetDescription>
          {entry.set === "brands"
            ? `${title}, a trademark of its owner.`
            : entry.set === "animated"
              ? `Lucide's ${entry.name} icon, animated.`
              : `Lucide's ${entry.name} icon.`}
        </SheetDescription>
      </SheetHeader>

      <div
        ref={previewRef}
        className="flex flex-col items-center gap-5 rounded-xl bg-surface-2 py-8 text-foreground shadow-surface-2"
      >
        {moving ? (
          <AnimatedDetailPreview
            component={moving}
            strokeWidth={options.strokeWidth}
          />
        ) : (
          <>
            <IconPreview icon={icon} {...options} size={96} />
            <div
              className="flex items-end gap-5 text-muted-foreground"
              aria-hidden="true"
            >
              {SAMPLE_SIZES.map((size) => (
                <IconPreview key={size} icon={icon} {...options} size={size} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <pre className="rounded-xl bg-surface-2 p-3 font-mono text-[12px] leading-relaxed break-all whitespace-pre-wrap shadow-surface-2">
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
      </div>

      <InstallCommand packages={getPackages(entry.set)} />

      <dl className="flex flex-col gap-4">
        {entry.set !== "brands" ? (
          <>
            {entry.set === "animated" && (
              <Fact label="Animation">
                <a
                  href="https://lucide-animated.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-4"
                >
                  lucide-animated, MIT
                  <ArrowUpRightIcon className="size-3.5" />
                </a>
              </Fact>
            )}
            {entry.set === "animated" && entry.isOlderDrawing && (
              <Fact label="Drawing">
                Animates an older Lucide drawing, so at rest it differs slightly
                from the outline icon.
              </Fact>
            )}
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
        <p className="text-[12px] text-muted-foreground">
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
  )
}
