"use client"

import * as React from "react"
import { cn } from "cn"

import { usePackageManager } from "@/hooks/use-package-manager"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"
import {
  getCommandParts,
  PACKAGE_MANAGERS,
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
}: {
  command: string
  className?: string
}) {
  const [head, ...flags] = getCommandParts(command)

  return (
    <code
      className={cn(
        "block ps-4 -indent-4 font-mono text-foreground",
        className
      )}
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
