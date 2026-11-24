"use client"

import * as React from "react"

import { CheckIcon, CopyIcon } from "@/lib/site-icons"
import { useConfig } from "@/hooks/use-config"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/styles/base-fabricator/ui/tooltip"

import { getAddCommand } from "../_lib/blocks"

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

// The command that adds the block, in the reader's package manager once the
// page knows it (before that, npm's, so the server's text matches).
export function CopyCommand({ name }: { name: string }) {
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
            className="group/copy flex h-(--density-36) max-w-full min-w-0 items-center gap-2.5 rounded-lg bg-foreground/[0.05] ps-3 pe-2.5 font-mono text-[12px] text-foreground transition-colors duration-feedback ease-feedback outline-none hover:bg-foreground/[0.08] focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5 [&_svg]:shrink-0"
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
