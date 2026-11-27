"use client"

import * as React from "react"
import Link from "next/link"

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
import { BlockBrowser } from "@/components/fabricator/block-browser"

// Whole screens from /blocks, one per tab of a Safari-like window.
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

export function BlocksShowcase() {
  const [activeName, setActiveName] = React.useState<string>(SHOWCASE[0].name)
  const activeBlock =
    SHOWCASE.find(({ name }) => name === activeName) ?? SHOWCASE[0]

  return (
    <section
      aria-label="Blocks built with Fabricator UI"
      className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-16 sm:px-6"
    >
      {/* A 16:9 box from 640px wide: the first fold at 1280 by 720, whole, at
          every width. */}
      <BlockBrowser
        blocks={SHOWCASE}
        value={activeBlock.name}
        onValueChange={setActiveName}
        blockStyle={SITE_BLOCK_STYLE}
        label="Blocks"
        className="w-full"
        panelClassName="h-[32rem] w-full @[40rem]/browser-window:aspect-video @[40rem]/browser-window:h-auto"
      />
      <Link
        href={`/blocks/${activeBlock.name}`}
        className="flex items-center gap-1.5 self-center rounded-sm text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
      >
        Get the {activeBlock.noun} block
        <ArrowRightIcon />
      </Link>
    </section>
  )
}
