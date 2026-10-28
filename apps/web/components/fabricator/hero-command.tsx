"use client"

import * as React from "react"
import { cn } from "cn"
import { CheckIcon, CopyIcon } from "lucide-react"

import { useConfig } from "@/hooks/use-config"
import { copyToClipboardWithMeta } from "@/components/copy-button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/styles/base-fabricator/ui/input-group"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

type PackageManager = ReturnType<typeof useConfig>[0]["packageManager"]

const INIT_COMMANDS: Record<PackageManager, string> = {
  npm: "npx fabricator-ui@latest init",
  pnpm: "pnpm dlx fabricator-ui@latest init",
  yarn: "yarn dlx fabricator-ui@latest init",
  bun: "bunx --bun fabricator-ui@latest init",
}

const PACKAGE_MANAGERS: PackageManager[] = ["npm", "pnpm", "yarn", "bun"]

function isPackageManager(value: unknown): value is PackageManager {
  return PACKAGE_MANAGERS.some((manager) => manager === value)
}

export function HeroCommand({ className }: { className?: string }) {
  const [config, setConfig] = useConfig()
  const [hasCopied, setHasCopied] = React.useState(false)
  const packageManager = config.packageManager
  const command = INIT_COMMANDS[packageManager]

  React.useEffect(() => {
    if (!hasCopied) return
    const timer = setTimeout(() => setHasCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [hasCopied])

  async function copyCommand() {
    const isCopied = await copyToClipboardWithMeta(command, {
      name: "copy_npm_command",
      properties: { command, pm: packageManager },
    })
    if (isCopied) setHasCopied(true)
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-sm flex-col items-center gap-2",
        className
      )}
    >
      <ToggleGroup
        aria-label="Package manager"
        value={[packageManager]}
        onValueChange={(next) => {
          // A segmented control always has one value: ignore deselection.
          const selected = next[0]
          if (isPackageManager(selected) && selected !== packageManager) {
            setConfig({ ...config, packageManager: selected })
          }
        }}
        spacing={0.5}
        size="sm"
        className="rounded-lg bg-foreground/[0.06] p-0.5 [&_[data-slot^=fluid-hover]]:rounded-md"
      >
        {PACKAGE_MANAGERS.map((manager) => (
          <ToggleGroupItem
            key={manager}
            value={manager}
            className="h-6 rounded-md! px-2.5 font-mono text-[12px] text-muted-foreground aria-pressed:text-foreground"
          >
            {manager}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <InputGroup className="font-mono">
        <InputGroupAddon className="hidden sm:flex">$</InputGroupAddon>
        <InputGroupInput
          readOnly
          value={command}
          aria-label="Install command"
          onFocus={(event) => event.currentTarget.select()}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={hasCopied ? "Copied" : "Copy command"}
            onClick={copyCommand}
          >
            {hasCopied ? <CheckIcon /> : <CopyIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <span aria-live="polite" className="sr-only">
        {hasCopied ? "Command copied to clipboard" : ""}
      </span>
    </div>
  )
}
