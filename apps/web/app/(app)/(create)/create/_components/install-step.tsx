"use client"

import * as React from "react"
import Link from "next/link"
import { LinkIcon } from "lucide-react"

import { CheckIcon, CopyIcon } from "@/lib/site-icons"
import {
  ICON_LIBRARIES,
  MOTION_SPEEDS,
  SURFACE_PRESETS,
} from "@/lib/site-settings"
import { useConfig } from "@/hooks/use-config"
import { CopyButton, copyToClipboardWithMeta } from "@/components/copy-button"
import { getFabricatorSiteUrl } from "@/registry/fabricator"
import { roleToHex } from "@/registry/fabricator/color-roles"
import { sameTint, tintToHex } from "@/registry/fabricator/surface-tint"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"
import {
  ASSISTANTS,
  buildSetupCommands,
  FRAMEWORKS,
  PACKAGE_MANAGERS,
  SETUP_BASES,
  setupToParams,
  type Framework,
  type Setup,
} from "@/app/(app)/(create)/lib/setup"

import type { StepName } from "./setup-wizard"
import { StepFooter } from "./step-parts"

const DARK_MODE_GUIDES: Partial<Record<Framework, string>> = {
  next: "/docs/dark-mode/next",
  vite: "/docs/dark-mode/vite",
  start: "/docs/dark-mode/tanstack-start",
  astro: "/docs/dark-mode/astro",
}

const LINK_CLASS =
  "rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-1 focus-visible:ring-focus-ring"

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

/** Copies text, and says so for two seconds. */
function useCopied() {
  const [copied, setCopied] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = React.useCallback(async (key: string, value: string) => {
    if (await copyToClipboardWithMeta(value)) setCopied(key)
  }, [])

  return [copied, copy] as const
}

/** A link to this step with the setup, look included. */
function shareLink(setup: Setup) {
  const params = setupToParams(setup)
  params.set("step", "install")
  return `${window.location.origin}/create?${params}`
}

export function InstallStep({
  setup,
  onBack,
  onEdit,
}: {
  setup: Setup
  onBack: () => void
  onEdit: (step: StepName) => void
}) {
  const [config, setConfig] = useConfig()
  // The stored choice is read on the client; the server renders bun.
  const isHydrated = useIsHydrated()
  const packageManager = isHydrated ? config.packageManager : "bun"
  const [copied, copy] = useCopied()

  const commands = buildSetupCommands(setup, {
    siteUrl: getFabricatorSiteUrl(),
    packageManager,
  })
  const script = commands
    .filter((command) => command.language === "bash")
    .map((command) => command.code)
    .join("\n")
  const darkModeGuide =
    setup.project === "new"
      ? (DARK_MODE_GUIDES[setup.framework] ?? "/docs/dark-mode")
      : "/docs/dark-mode"

  return (
    <div className="flex w-full max-w-2xl flex-col gap-10">
      <section aria-labelledby="commands-title" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="commands-title" className="text-[15px] font-semibold">
              Run these in your terminal
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {setup.project === "new"
                ? "In order, from the folder you keep your projects in."
                : "In order, from your project's root folder."}
            </p>
          </div>
          <ToggleGroup
            // Its sliding selection doesn't follow a value set from outside,
            // so remount it once the stored choice is read.
            key={isHydrated ? "stored" : "default"}
            aria-label="Package manager"
            value={[packageManager]}
            onValueChange={(next) => {
              const selected = PACKAGE_MANAGERS.find((name) => name === next[0])
              if (selected) setConfig({ ...config, packageManager: selected })
            }}
            spacing={0.5}
            size="sm"
            className="rounded-lg bg-foreground/[0.06] p-0.5 [&_[data-slot^=fluid-hover]]:rounded-md"
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
        </div>

        <ol className="flex flex-col gap-6">
          {commands.map((command, index) => (
            <li key={command.id} className="flex gap-3">
              <span
                aria-hidden
                className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-medium tabular-nums"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-medium">{command.title}</h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {command.description}
                  </p>
                </div>
                <figure className="relative overflow-hidden rounded-xl bg-code">
                  <pre className="overflow-x-auto py-3.5 ps-4 pe-12 font-mono text-[13px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-code-foreground">
                    <code>{command.code}</code>
                  </pre>
                  <CopyButton
                    value={command.code}
                    event="copy_npm_command"
                    className="top-2"
                  />
                </figure>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => copy("script", script)}>
            {copied === "script" ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <CopyIcon data-icon="inline-start" />
            )}
            {copied === "script" ? "Copied" : "Copy all commands"}
          </Button>
          <Button
            variant="outline"
            onClick={() => copy("link", shareLink(setup))}
          >
            {copied === "link" ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <LinkIcon data-icon="inline-start" />
            )}
            {copied === "link" ? "Link copied" : "Share this setup"}
          </Button>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Not the one running the commands? Share this setup with your
          developer: the link opens this page with your look and choices.
        </p>
      </section>

      <SetupSummary setup={setup} onEdit={onEdit} />

      <section aria-labelledby="next-title" className="flex flex-col gap-3">
        <h2 id="next-title" className="text-[15px] font-semibold">
          Then
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 ps-5 text-[13px] leading-relaxed text-muted-foreground marker:text-muted-foreground/60">
          <li>
            Browse the{" "}
            <Link href="/docs/components" className={LINK_CLASS}>
              components
            </Link>{" "}
            and add one with{" "}
            <code className="font-mono text-foreground">
              fabricator-ui add &lt;name&gt;
            </code>
            .
          </li>
          <li>
            Add a theme toggle with the{" "}
            <Link href={darkModeGuide} className={LINK_CLASS}>
              dark mode guide
            </Link>
            .
          </li>
          <li>
            Read{" "}
            <Link href="/docs/new" className={LINK_CLASS}>
              what to do next
            </Link>{" "}
            in your new project.
          </li>
        </ul>
      </section>

      <StepFooter onBack={onBack} />
    </div>
  )
}

/** A dot in one colour. */
function Swatch({ hex }: { hex: string }) {
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)]"
      style={{ backgroundColor: hex }}
    />
  )
}

function SummaryRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 text-end text-[13px]">
        {children}
      </dd>
    </div>
  )
}

function SetupSummary({
  setup,
  onEdit,
}: {
  setup: Setup
  onEdit: (step: StepName) => void
}) {
  const { look } = setup
  const surface =
    SURFACE_PRESETS.find(({ tint }) => sameTint(tint, look.surface))?.label ??
    "Custom"
  const assistant = ASSISTANTS.find(({ value }) => value === setup.assistant)
  const extras = [
    setup.components === "all" ? "Every component" : null,
    setup.sound ? "Sounds" : null,
    assistant && setup.skill ? `${assistant.label} skill` : null,
    assistant && setup.mcp ? `${assistant.label} MCP` : null,
  ].filter(Boolean)

  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-3">
      <h2 id="summary-title" className="text-[15px] font-semibold">
        Your setup
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard title="Look" onEdit={() => onEdit("look")}>
          <SummaryRow label="Primary">
            <Swatch hex={roleToHex(look.colors.primary)} />
          </SummaryRow>
          <SummaryRow label="Surface">
            <Swatch hex={tintToHex(look.surface)} />
            {surface}
          </SummaryRow>
          <SummaryRow label="Radius">
            {look.radius === "pill" ? "Pill" : "Rounded"}
          </SummaryRow>
          <SummaryRow label="Motion">
            {MOTION_SPEEDS.find(({ value }) => value === look.motion)?.label}
          </SummaryRow>
          <SummaryRow label="Icons">
            {
              ICON_LIBRARIES.find(({ value }) => value === setup.iconLibrary)
                ?.label
            }
          </SummaryRow>
        </SummaryCard>
        <SummaryCard title="Project" onEdit={() => onEdit("project")}>
          <SummaryRow label="Starting from">
            {setup.project === "new" ? "A new project" : "An existing project"}
          </SummaryRow>
          {setup.project === "new" ? (
            <SummaryRow label="Framework">
              {FRAMEWORKS.find(({ value }) => value === setup.framework)?.label}
            </SummaryRow>
          ) : null}
          <SummaryRow label="Primitives">
            {SETUP_BASES.find(({ value }) => value === setup.base)?.label}
          </SummaryRow>
          <SummaryRow label="Extras">
            <button
              type="button"
              onClick={() => onEdit("extras")}
              className="rounded-sm text-end outline-none hover:underline focus-visible:ring-1 focus-visible:ring-focus-ring"
            >
              {extras.length > 0 ? extras.join(", ") : "None"}
            </button>
          </SummaryRow>
        </SummaryCard>
      </div>
    </section>
  )
}

function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface-3 px-4 pt-2 pb-1 shadow-surface-1 dark:bg-surface-2 dark:shadow-surface-2">
      <div className="flex items-center justify-between py-1">
        <h3 className="text-[13px] font-medium">{title}</h3>
        <Button variant="ghost" size="xs" onClick={onEdit}>
          Edit
          <span className="sr-only"> {title.toLowerCase()}</span>
        </Button>
      </div>
      <dl className="flex flex-col divide-y divide-border">{children}</dl>
    </div>
  )
}
