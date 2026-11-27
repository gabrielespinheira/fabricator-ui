"use client"

import * as React from "react"

import { getBlockLayout, getBlockPageRoute } from "@/lib/block-page"
import { type LayoutDashboardIcon } from "@/lib/site-icons"
import { BlockSkeleton } from "@/components/fabricator/block-skeleton"
import { BrowserWindow } from "@/components/fabricator/browser-window"
import { FramePreview } from "@/components/fabricator/frame-preview"
import { fabricatorBlocks } from "@/registry/fabricator/blocks"

export type BlockBrowserTab = {
  name: string
  label: string
  icon: typeof LayoutDashboardIcon
}

// Arrow keys move between tabs and open them, as WAI-ARIA's tabs pattern does.
const KEY_TARGETS: Record<string, (index: number, last: number) => number> = {
  ArrowLeft: (index, last) => (index === 0 ? last : index - 1),
  ArrowRight: (index, last) => (index === last ? 0 : index + 1),
  Home: () => 0,
  End: (_, last) => last,
}

function getDeclaration(name: string) {
  return fabricatorBlocks.find((block) => block.name === name)
}

/**
 * Whole blocks, one per tab of a Safari-like window. The tabs are plain
 * buttons styled after Safari's, not the library's Tabs. Only the open tab
 * mounts its frame, which renders the block at 1280px and scales it to the
 * window from 640px wide; narrower, it shows the block's phone layout.
 */
export function BlockBrowser({
  blocks,
  value,
  onValueChange,
  blockStyle,
  label,
  className,
  panelClassName,
}: {
  blocks: readonly BlockBrowserTab[]
  value: string
  onValueChange: (name: string) => void
  /** The compiled style the frames render, e.g. "base-fabricator". */
  blockStyle: string
  label: string
  className?: string
  panelClassName?: string
}) {
  const id = React.useId()
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const [frameKey, setFrameKey] = React.useState(0)
  const activeBlock = blocks.find(({ name }) => name === value) ?? blocks[0]
  const declaration = getDeclaration(activeBlock.name)
  const src = `/view/${blockStyle}/${activeBlock.name}`

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const getTarget = KEY_TARGETS[event.key]
    if (!getTarget) return
    event.preventDefault()
    const target = getTarget(index, blocks.length - 1)
    onValueChange(blocks[target].name)
    tabRefs.current[target]?.focus()
  }

  return (
    <BrowserWindow
      path={getBlockPageRoute(declaration?.files ?? [])}
      href={src}
      onReload={() => setFrameKey((key) => key + 1)}
      className={className}
      tabs={
        <div role="tablist" aria-label={label} className="block-browser-tabs">
          {blocks.map(({ name, label: tabLabel, icon: Icon }, index) => {
            const isActive = name === activeBlock.name
            return (
              <button
                key={name}
                ref={(element) => {
                  tabRefs.current[index] = element
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${name}`}
                aria-selected={isActive}
                aria-controls={isActive ? `${id}-panel` : undefined}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onValueChange(name)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <Icon aria-hidden="true" />
                <span className="truncate">{tabLabel}</span>
              </button>
            )
          })}
        </div>
      }
    >
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${activeBlock.name}`}
        className={panelClassName}
      >
        <FramePreview
          key={`${src}-${frameKey}`}
          src={src}
          title={`${activeBlock.label} block`}
          minWidth={1280}
          scaleFrom={640}
          placeholder={
            <BlockSkeleton
              layout={getBlockLayout(declaration?.categories ?? [])}
            />
          }
        />
      </div>
    </BrowserWindow>
  )
}
