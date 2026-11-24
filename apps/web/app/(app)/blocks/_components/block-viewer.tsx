"use client"

import * as React from "react"

import { getBlockLayout } from "@/lib/block-page"
import { MonitorIcon, SmartphoneIcon, TabletIcon } from "@/lib/site-icons"
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

export type BlockFile = {
  /** Where the CLI writes it, e.g. "components/sign-in-form.tsx". */
  target: string
  code: string
  highlightedCode: string
}

const VIEWPORTS = [
  {
    id: "desktop",
    label: "Desktop",
    width: "100%",
    minWidth: 1280,
    Icon: MonitorIcon,
  },
  {
    id: "tablet",
    label: "Tablet",
    width: "820px",
    minWidth: 0,
    Icon: TabletIcon,
  },
  {
    id: "phone",
    label: "Phone",
    width: "390px",
    minWidth: 0,
    Icon: SmartphoneIcon,
  },
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

export function BlockViewer({
  title,
  route,
  categories,
  files,
  previewSrc,
}: {
  title: string
  /** The URL path its page installs to, shown in the window's address bar. */
  route: string
  categories: readonly string[]
  files: BlockFile[]
  previewSrc: string
}) {
  const [view, setView] = React.useState<View>("preview")
  const [viewport, setViewport] = React.useState<Viewport>("desktop")
  // Reloading remounts the frame, so the block starts over.
  const [frameKey, setFrameKey] = React.useState(0)
  const [activeFile, setActiveFile] = React.useState(files[0]?.target)
  const file = files.find(({ target }) => target === activeFile) ?? files[0]
  const { width, minWidth } =
    VIEWPORTS.find(({ id }) => id === viewport) ?? VIEWPORTS[0]

  return (
    <Tabs
      value={view}
      onValueChange={(next) => {
        if (isView(next)) setView(next)
      }}
      className="gap-4"
    >
      <div className="flex items-center justify-between gap-2">
        <TabsList aria-label={`${title} view`}>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        {view === "preview" && (
          <ViewportPicker value={viewport} onValueChange={setViewport} />
        )}
      </div>
      <TabsContent
        value="preview"
        keepMounted
        className="flex h-[44rem] flex-none justify-center data-hidden:hidden md:h-[50rem]"
      >
        <BrowserWindow
          path={route}
          href={previewSrc}
          onReload={() => setFrameKey((key) => key + 1)}
          className="h-full w-full transition-[max-width] duration-move ease-move"
          style={{ maxWidth: width }}
        >
          {/* Desktop is always a desktop: on a smaller screen the page is
                drawn at 1280px and scaled down. Tablet and phone are the
                page's real width. */}
          <FramePreview
            key={frameKey}
            src={previewSrc}
            title={`${title} preview`}
            minWidth={minWidth}
            scaleFrom={640}
            placeholder={<BlockSkeleton layout={getBlockLayout(categories)} />}
          />
        </BrowserWindow>
      </TabsContent>
      <TabsContent
        value="code"
        className="grid h-[44rem] flex-none grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl bg-surface-2 shadow-surface-2 md:h-[50rem] md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-1"
      >
        <nav
          aria-label={`${title} files`}
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
