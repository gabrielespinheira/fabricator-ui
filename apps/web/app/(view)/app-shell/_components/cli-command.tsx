"use client"

import * as React from "react"
import { cn } from "cn"

import { usePackageManager } from "@/hooks/use-package-manager"
import { CopyButton } from "@/components/copy-button"
import { Segmented } from "@/components/fabricator/site-settings"
import { CardFooter } from "@/styles/base-fabricator/ui/card"
import { PACKAGE_MANAGERS } from "@/app/(app)/(create)/lib/setup"

const PACKAGE_MANAGER_OPTIONS = PACKAGE_MANAGERS.map((name) => ({
  value: name,
  label: name,
}))

/** A command to copy; it wraps rather than hide the choices at its end. */
export function CliCommand({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  return (
    <figure className={cn("relative rounded-lg bg-code", className)}>
      <pre className="py-2.5 ps-3 pe-10 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
      <CopyButton value={code} event="copy_npm_command" className="top-1" />
    </figure>
  )
}

/** A setup card's footer: what installs the card's choices. */
export function CardInstall({
  commands,
  children,
}: {
  commands: string[]
  /** What to know before or after running it. */
  children: React.ReactNode
}) {
  const { packageManager, setPackageManager } = usePackageManager()
  return (
    <CardFooter className="flex-col items-stretch gap-2 border-t">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-xs font-medium text-foreground">
          Install with the CLI
        </h2>
        <Segmented
          label="Package manager"
          value={packageManager}
          onValueChange={setPackageManager}
          options={PACKAGE_MANAGER_OPTIONS}
        />
      </div>
      <CliCommand code={commands.join("\n")} />
      <p className="text-xs text-muted-foreground">{children}</p>
    </CardFooter>
  )
}
