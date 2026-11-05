"use client"

import { usePackageManager } from "@/hooks/use-package-manager"
import { CopyButton } from "@/components/copy-button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"
import {
  buildSetupCommand,
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

/** The one command, live, under every step: copy it whenever you like. */
export function CommandDock({ setup }: { setup: Setup }) {
  const { packageManager } = usePackageManager()
  const command = buildSetupCommand(setup, packageManager)

  return (
    <section
      aria-label="Your install command"
      className="sticky bottom-3 z-20 mt-8 flex items-center gap-3 rounded-2xl bg-code py-2 ps-4 pe-2 shadow-surface-2 ring-1 ring-border"
    >
      <code
        // On a phone the command scrolls sideways, and keys have to reach it.
        tabIndex={0}
        className="no-scrollbar min-w-0 flex-1 overflow-x-auto rounded-sm font-mono text-[13px] whitespace-nowrap text-code-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {command}
      </code>
      <div className="hidden shrink-0 sm:block">
        <PackageManagerSwitch />
      </div>
      <div className="relative size-8 shrink-0">
        <CopyButton
          value={command}
          event="copy_npm_command"
          className="static"
        />
      </div>
    </section>
  )
}
