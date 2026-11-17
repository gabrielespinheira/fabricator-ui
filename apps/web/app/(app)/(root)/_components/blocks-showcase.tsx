"use client"

import * as React from "react"
import Link from "next/link"

import { getBlockLayout, getBlockPageRoute } from "@/lib/block-page"
import {
  ArrowRightIcon,
  CalendarIcon,
  LayoutDashboardIcon,
  MailIcon,
  MessageCircleIcon,
  SparklesIcon,
  UserIcon,
} from "@/lib/site-icons"
import { SITE_BLOCK_STYLE } from "@/lib/site-style"
import { BlockSkeleton } from "@/components/fabricator/block-skeleton"
import { BrowserWindow } from "@/components/fabricator/browser-window"
import { FramePreview } from "@/components/fabricator/frame-preview"
import { fabricatorBlocks } from "@/registry/fabricator/blocks"

// Whole screens from /blocks, one per tab of a Safari-like window. The tabs are
// plain buttons styled after Safari's, not the library's Tabs.
const SHOWCASE = [
  {
    name: "finance-01",
    label: "Dashboard",
    noun: "finance dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    name: "assistant-01",
    label: "AI assistant",
    noun: "AI assistant",
    icon: SparklesIcon,
  },
  {
    name: "messenger-01",
    label: "Messenger",
    noun: "messenger",
    icon: MessageCircleIcon,
  },
  { name: "mail-01", label: "Mail", noun: "mail", icon: MailIcon },
  {
    name: "calendar-app-01",
    label: "Calendar",
    noun: "calendar",
    icon: CalendarIcon,
  },
  { name: "sign-in-01", label: "Sign in", noun: "sign-in", icon: UserIcon },
] as const

const LAST_INDEX = SHOWCASE.length - 1

// Arrow keys move between tabs and open them, as WAI-ARIA's tabs pattern does.
const KEY_TARGETS: Record<string, (index: number) => number> = {
  ArrowLeft: (index) => (index === 0 ? LAST_INDEX : index - 1),
  ArrowRight: (index) => (index === LAST_INDEX ? 0 : index + 1),
  Home: () => 0,
  End: () => LAST_INDEX,
}

function getCategories(name: string) {
  return fabricatorBlocks.find((block) => block.name === name)?.categories ?? []
}

export function BlocksShowcase() {
  const id = React.useId()
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [frameKey, setFrameKey] = React.useState(0)
  const activeBlock = SHOWCASE[activeIndex]
  const files =
    fabricatorBlocks.find((block) => block.name === activeBlock.name)?.files ??
    []

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const getTarget = KEY_TARGETS[event.key]
    if (!getTarget) return
    event.preventDefault()
    const target = getTarget(index)
    setActiveIndex(target)
    tabRefs.current[target]?.focus()
  }

  return (
    <section
      aria-label="Blocks built with Fabricator UI"
      className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-16 sm:px-6"
    >
      <BrowserWindow
        path={getBlockPageRoute(files)}
        href={`/view/${SITE_BLOCK_STYLE}/${activeBlock.name}`}
        onReload={() => setFrameKey((key) => key + 1)}
        className="h-[36rem] w-full sm:h-[44rem]"
        tabs={
          <div
            role="tablist"
            aria-label="Blocks"
            className="homepage-browser-tabs"
          >
            {SHOWCASE.map(({ name, label, icon: Icon }, index) => {
              const isActive = index === activeIndex
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
                  onClick={() => setActiveIndex(index)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  <Icon aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </button>
              )
            })}
          </div>
        }
      >
        {/* Only the open tab mounts its frame, so the homepage loads a single
            block. Desktop widths render the block at 1280px and scale it to
            fit; a phone shows the block's own phone layout. */}
        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${activeBlock.name}`}
          className="size-full"
        >
          <FramePreview
            key={`${activeBlock.name}-${frameKey}`}
            src={`/view/${SITE_BLOCK_STYLE}/${activeBlock.name}`}
            title={`${activeBlock.label} block`}
            minWidth={1280}
            scaleFrom={640}
            placeholder={
              <BlockSkeleton
                layout={getBlockLayout(
                  activeBlock.name,
                  getCategories(activeBlock.name)
                )}
              />
            }
          />
        </div>
      </BrowserWindow>
      <Link
        href={`/blocks#${activeBlock.name}`}
        className="flex items-center gap-1.5 self-center rounded-sm text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
      >
        Get the {activeBlock.noun} block
        <ArrowRightIcon />
      </Link>
    </section>
  )
}
