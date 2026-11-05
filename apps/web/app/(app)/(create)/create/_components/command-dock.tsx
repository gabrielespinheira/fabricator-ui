"use client"

import * as React from "react"
import { cn } from "cn"

import { trackEvent } from "@/lib/events"
import { CheckIcon, CopyIcon } from "@/lib/site-icons"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { usePackageManager } from "@/hooks/use-package-manager"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"
import {
  buildSetupCommand,
  getCommandParts,
  PACKAGE_MANAGERS,
  type Setup,
} from "@/app/(app)/(create)/lib/setup"

/** npm, pnpm, yarn or bun. The choice is stored for the whole site. */
export function PackageManagerSwitch() {
  const { isHydrated, packageManager, setPackageManager } = usePackageManager()

  return (
    <ToggleGroup
      // Its sliding selection doesn't follow a value set from outside,
      // so remount it once the stored choice is read.
      key={isHydrated ? "stored" : "default"}
      aria-label="Package manager"
      value={[packageManager]}
      onValueChange={(next) => {
        const selected = PACKAGE_MANAGERS.find((name) => name === next[0])
        if (selected) setPackageManager(selected)
      }}
      spacing={0.5}
      size="sm"
      className="rounded-lg bg-foreground/[0.06] p-0.5 [&_[data-slot^=fluid-hover]]:rounded-md"
    >
      {PACKAGE_MANAGERS.map((name) => (
        <ToggleGroupItem
          key={name}
          value={name}
          className="h-7 rounded-md! px-2.5 font-mono text-[12px] text-foreground/70 aria-pressed:text-foreground"
        >
          {name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** A long command wraps between flags, so each one stays with its value. */
export function CommandText({
  command,
  className,
  ...props
}: { command: string } & React.ComponentProps<"code">) {
  const [head, ...flags] = getCommandParts(command)

  return (
    <code
      className={cn(
        "block ps-4 -indent-4 font-mono text-foreground",
        className
      )}
      {...props}
    >
      {head}
      {flags.map((flag) => (
        <React.Fragment key={flag}>
          {" "}
          <span className="inline-block max-w-full indent-0 [overflow-wrap:anywhere] text-foreground/70">
            {flag}
          </span>
        </React.Fragment>
      ))}
    </code>
  )
}

function CopyCommandButton({ command }: { command: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    onCopy: () =>
      trackEvent({ name: "copy_npm_command", properties: { code: command } }),
  })

  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0 max-sm:size-8 max-sm:px-0 sm:min-w-20"
      onClick={() => copyToClipboard(command)}
    >
      {isCopied ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      <span className="max-sm:sr-only">{isCopied ? "Copied" : "Copy"}</span>
    </Button>
  )
}

/** The one command, live, under every step: copy it whenever you like. */
export function CommandDock({ setup }: { setup: Setup }) {
  const { packageManager } = usePackageManager()
  const command = buildSetupCommand(setup, packageManager)

  return (
    <section
      aria-label="Your install command"
      className="sticky bottom-3 z-20 mt-8 flex items-center gap-3 rounded-2xl bg-code py-2 ps-4 pe-2 shadow-surface-2 ring-1 ring-border"
    >
      <CommandText
        command={command}
        // Past this height it scrolls, and keys have to reach it. A phone keeps
        // to two lines, so the dock doesn't cover the step.
        tabIndex={0}
        className="no-scrollbar max-h-24 min-w-0 flex-1 scroll-fade-y overflow-y-auto rounded-sm py-1 text-[13px] leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 max-sm:max-h-12"
      />
      <div className="hidden shrink-0 sm:block">
        <PackageManagerSwitch />
      </div>
      <CopyCommandButton command={command} />
    </section>
  )
}
