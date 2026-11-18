"use client"

import * as React from "react"

import { getBlockLayout } from "@/lib/block-page"
import {
  CheckIcon,
  CopyIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
} from "@/lib/site-icons"
import { useConfig } from "@/hooks/use-config"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { CopyButton } from "@/components/copy-button"
import { BlockSkeleton } from "@/components/fabricator/block-skeleton"
import { BrowserWindow } from "@/components/fabricator/browser-window"
import { FramePreview } from "@/components/fabricator/frame-preview"
import { getIconForLanguageExtension } from "@/components/icons"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/styles/base-fabricator/ui/tooltip"

import { getAddCommand, type BlockSummary } from "../_lib/blocks"

export type BlockFile = {
  /** Where the CLI writes it, e.g. "components/sign-in-form.tsx". */
  target: string
  code: string
  highlightedCode: string
}

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: "100%", Icon: MonitorIcon },
  { id: "tablet", label: "Tablet", width: "820px", Icon: TabletIcon },
  { id: "phone", label: "Phone", width: "390px", Icon: SmartphoneIcon },
] as const

type Viewport = (typeof VIEWPORTS)[number]["id"]

function isViewport(value: unknown): value is Viewport {
  return VIEWPORTS.some(({ id }) => id === value)
}

const VIEWS = ["preview", "code"] as const

type View = (typeof VIEWS)[number]

function isView(value: unknown): value is View {
  return VIEWS.some((view) => view === value)
}

function subscribeNothing() {
  return () => {}
}

/** False during server rendering and hydration, true after. */
function useIsHydrated() {
  return React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  )
}

export function BlockViewer({
  block,
  files,
  previewSrc,
}: {
  block: BlockSummary
  files: BlockFile[]
  previewSrc: string
}) {
  const [view, setView] = React.useState<View>("preview")
  const [viewport, setViewport] = React.useState<Viewport>("desktop")
  // Reloading remounts the frame, so the block starts over.
  const [frameKey, setFrameKey] = React.useState(0)
  const [activeFile, setActiveFile] = React.useState(files[0]?.target)
  const file = files.find(({ target }) => target === activeFile) ?? files[0]
  const width = VIEWPORTS.find(({ id }) => id === viewport)?.width

  return (
    <article
      id={block.name}
      aria-labelledby={`${block.name}-title`}
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <Tabs
        value={view}
        onValueChange={(next) => {
          if (isView(next)) setView(next)
        }}
        className="gap-4"
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-1 basis-80 flex-col gap-0.5">
            <h3 id={`${block.name}-title`} className="text-[14px] font-medium">
              <a
                href={`#${block.name}`}
                className="rounded-sm outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {block.title}
              </a>
            </h3>
            <p className="text-[13px] text-pretty text-muted-foreground">
              {block.description}
            </p>
          </div>
          {/* Three controls of one height: what to see, at what width, and
              how to get it. Space parts them; no dividers. */}
          <div className="flex max-w-full min-w-0 items-center gap-2">
            <TabsList aria-label={`${block.title} view`}>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            {view === "preview" && (
              <ViewportPicker value={viewport} onValueChange={setViewport} />
            )}
            <CopyCommand name={block.name} />
          </div>
        </div>
        <TabsContent
          value="preview"
          keepMounted
          className="flex h-[44rem] flex-none justify-center data-hidden:hidden md:h-[50rem]"
        >
          <BrowserWindow
            path={block.route}
            href={previewSrc}
            onReload={() => setFrameKey((key) => key + 1)}
            className="h-full w-full transition-[max-width] duration-move ease-move"
            style={{ maxWidth: width }}
          >
            {/* Unscaled: the width picker sets the page's real width. */}
            <FramePreview
              key={frameKey}
              src={previewSrc}
              title={`${block.title} preview`}
              minWidth={0}
              scaleFrom={0}
              placeholder={
                <BlockSkeleton
                  layout={getBlockLayout(block.name, block.categories)}
                />
              }
            />
          </BrowserWindow>
        </TabsContent>
        <TabsContent
          value="code"
          className="grid h-[44rem] flex-none grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl bg-surface-2 shadow-surface-2 md:h-[50rem] md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-1"
        >
          <nav
            aria-label={`${block.title} files`}
            className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-y-auto"
          >
            {files.map(({ target }) => (
              <button
                key={target}
                type="button"
                aria-current={target === file?.target ? "true" : undefined}
                onClick={() => setActiveFile(target)}
                className="flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-start font-mono text-[12px] text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-current:bg-active aria-current:text-foreground [&_svg]:size-3.5 [&_svg]:shrink-0"
              >
                {getIconForLanguageExtension(target.split(".").pop() ?? "tsx")}
                <span className="truncate" title={target}>
                  {target.split("/").pop()}
                </span>
              </button>
            ))}
          </nav>
          {file && (
            <figure
              data-rehype-pretty-code-figure=""
              className="relative m-0! flex min-h-0 flex-col overflow-hidden rounded-none! [&_pre]:max-h-none! [&_pre]:min-h-full [&_pre]:rounded-none! [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-auto"
            >
              <figcaption
                data-rehype-pretty-code-title=""
                className="flex items-center gap-2 text-code-foreground [&_svg]:size-4 [&_svg]:text-code-foreground [&_svg]:opacity-70"
              >
                {getIconForLanguageExtension(
                  file.target.split(".").pop() ?? "tsx"
                )}
                {file.target}
              </figcaption>
              <CopyButton value={file.code} />
              <div
                data-not-typeset
                dangerouslySetInnerHTML={{ __html: file.highlightedCode }}
              />
            </figure>
          )}
        </TabsContent>
      </Tabs>
    </article>
  )
}

// The preview's width as a segmented control in the same track as the
// Preview and Code tabs. A phone screen has no room to compare widths.
function ViewportPicker({
  value,
  onValueChange,
}: {
  value: Viewport
  onValueChange: (viewport: Viewport) => void
}) {
  return (
    <ToggleGroup
      aria-label="Preview width"
      value={[value]}
      onValueChange={(next) => {
        const [selected] = next
        if (isViewport(selected)) onValueChange(selected)
      }}
      spacing={0}
      size="sm"
      // The selection is the Tabs' raised pill, so both tracks read alike.
      className="hidden h-(--density-36) rounded-xl bg-foreground/[0.05] p-(--density-4) md:flex [&_[data-slot^=fluid-hover]]:rounded-lg [&>[data-slot=fluid-hover-selection]]:bg-surface-4 [&>[data-slot=fluid-hover-selection]]:shadow-surface-4 dark:[&>[data-slot=fluid-hover-selection]]:bg-foreground/14"
    >
      {VIEWPORTS.map(({ id, label, Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger
            // The trigger's slot would replace the item's, and the group
            // finds its items, and draws the selection, by that slot.
            data-slot="toggle-group-item"
            render={
              <ToggleGroupItem
                value={id}
                aria-label={label}
                className="size-(--density-28) min-w-0 rounded-lg! px-0 text-muted-foreground aria-pressed:text-foreground"
              />
            }
          >
            <Icon />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}

// The command that adds the block, in the reader's package manager once the
// page knows it (before that, npm's, so the server's text matches).
function CopyCommand({ name }: { name: string }) {
  const [config] = useConfig()
  const isHydrated = useIsHydrated()
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const command = getAddCommand(
    isHydrated ? config.packageManager : "npm",
    name
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => void copyToClipboard(command)}
            className="group/copy flex h-(--density-36) min-w-0 items-center gap-2.5 rounded-lg bg-foreground/[0.05] ps-3 pe-2.5 font-mono text-[12px] text-foreground transition-colors duration-feedback ease-feedback outline-none hover:bg-foreground/[0.08] focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5 [&_svg]:shrink-0"
          />
        }
      >
        <span className="sr-only">
          {isCopied ? "Copied: " : "Copy the command: "}
        </span>
        <span className="truncate">{command}</span>
        {isCopied ? (
          <CheckIcon />
        ) : (
          <CopyIcon className="text-muted-foreground group-hover/copy:text-foreground" />
        )}
      </TooltipTrigger>
      <TooltipContent>{isCopied ? "Copied" : "Copy command"}</TooltipContent>
    </Tooltip>
  )
}
