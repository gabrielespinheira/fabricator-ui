"use client"

import * as React from "react"

import { CheckIcon, CopyIcon } from "@/lib/site-icons"
import { useConfig } from "@/hooks/use-config"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

import { getInstallCommand, type PackageManager } from "../lib/icons"

const PACKAGE_MANAGERS: PackageManager[] = ["bun", "pnpm", "npm", "yarn"]

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

/** An install command in the reader's package manager, with a copy button. */
export function InstallCommand({ packages }: { packages: string[] }) {
  const [config, setConfig] = useConfig()
  const isHydrated = useIsHydrated()
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const packageManager = isHydrated ? config.packageManager : "bun"
  const command = getInstallCommand(packageManager, packages)

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-surface-2 p-1.5 shadow-surface-2">
      <ToggleGroup
        // Its sliding selection doesn't follow a value set from outside, so
        // remount it once the stored choice is read.
        key={isHydrated ? "stored" : "default"}
        aria-label="Package manager"
        value={[packageManager]}
        onValueChange={(next) => {
          const selected = PACKAGE_MANAGERS.find((name) => name === next[0])
          if (selected) setConfig({ ...config, packageManager: selected })
        }}
        spacing={0.5}
        size="sm"
        className="self-start rounded-lg p-0.5 [&_[data-slot^=fluid-hover]]:rounded-md"
      >
        {PACKAGE_MANAGERS.map((name) => (
          <ToggleGroupItem
            key={name}
            value={name}
            className="h-7 rounded-md! px-2.5 font-mono text-[12px] text-muted-foreground aria-pressed:text-foreground"
          >
            {name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex min-w-0 items-center gap-2 ps-2.5">
        <code className="min-w-0 flex-1 font-mono text-[13px] [overflow-wrap:anywhere]">
          {command}
        </code>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isCopied ? "Copied" : "Copy the install command"}
          onClick={() => void copyToClipboard(command)}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  )
}
