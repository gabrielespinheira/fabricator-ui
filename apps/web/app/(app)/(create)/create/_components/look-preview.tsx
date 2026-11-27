"use client"

import * as React from "react"
import { cn } from "cn"
import { parseAsStringLiteral, useQueryState } from "nuqs"

import {
  CalendarIcon,
  Columns3Icon,
  LayoutDashboardIcon,
  MailIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
} from "@/lib/site-icons"
import { BlockBrowser } from "@/components/fabricator/block-browser"

// Screens from /blocks, so a look is judged on whole pages people ship: a
// dashboard, the dense views (board, mail, calendar), a chat, a form-heavy
// page and a page with no shell.
const LOOK_BLOCKS = [
  { name: "finance-01", label: "Dashboard", icon: LayoutDashboardIcon },
  { name: "board-01", label: "Board", icon: Columns3Icon },
  { name: "mail-01", label: "Mail", icon: MailIcon },
  { name: "calendar-app-01", label: "Calendar", icon: CalendarIcon },
  { name: "assistant-01", label: "Assistant", icon: SparklesIcon },
  { name: "settings-01", label: "Settings", icon: SettingsIcon },
  { name: "sign-in-01", label: "Sign in", icon: UserIcon },
] as const

const blockParser = parseAsStringLiteral(
  LOOK_BLOCKS.map(({ name }) => name)
).withDefault(LOOK_BLOCKS[0].name)

/**
 * The Look step's preview: real blocks on the project's primitives. They read
 * the site settings the step changes, so every choice shows as it's made.
 */
export function LookPreview({
  base,
  isPhone,
}: {
  base: "base" | "radix" | "aria"
  /** Draws the blocks at a phone's width, with their phone layouts. */
  isPhone: boolean
}) {
  const [block, setBlock] = useQueryState("block", blockParser)

  return (
    <BlockBrowser
      blocks={LOOK_BLOCKS}
      value={block}
      onValueChange={(name) => {
        const next = LOOK_BLOCKS.find((item) => item.name === name)
        if (next) void setBlock(next.name)
      }}
      blockStyle={`${base}-fabricator`}
      label="Blocks to preview"
      className={cn(
        "h-[80svh] min-h-[32rem] lg:h-[calc(100svh-11rem)]",
        isPhone ? "mx-auto w-full max-w-[24.375rem]" : "w-full"
      )}
      panelClassName="size-full"
    />
  )
}
