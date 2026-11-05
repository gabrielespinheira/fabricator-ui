"use client"

import * as React from "react"
import Link from "next/link"
import {
  getNextSteps,
  getPrerequisites,
  getProjectTree,
} from "@fabricator-ui/setup"
import { LinkIcon } from "lucide-react"

import { CheckIcon, ExternalLinkIcon } from "@/lib/site-icons"
import {
  DENSITY_OPTIONS,
  ICON_LIBRARIES,
  MOTION_SPEEDS,
  SURFACE_PRESETS,
} from "@/lib/site-settings"
import { usePackageManager } from "@/hooks/use-package-manager"
import { CopyButton, copyToClipboardWithMeta } from "@/components/copy-button"
import { roleToHex } from "@/registry/fabricator/color-roles"
import { sameTint, tintToHex } from "@/registry/fabricator/surface-tint"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  ASSISTANTS,
  buildSetupCommand,
  FRAMEWORKS,
  getSetupPlan,
  isNativeFramework,
  SETUP_BASES,
  setupToParams,
  toProjectSetup,
  type Framework,
  type Setup,
} from "@/app/(app)/(create)/lib/setup"
import {
  SIDEBAR_COLLAPSE_CHOICES,
  SIDEBAR_VARIANT_CHOICES,
  TAB_PLACEMENT_CHOICES,
} from "@/app/(view)/app-shell/_lib/options"

import { CommandText, PackageManagerSwitch } from "./command-dock"
import { PlanList } from "./plan-list"
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
}: {
  setup: Setup
  onBack: () => void
}) {
  const { packageManager } = usePackageManager()
  const [copied, copy] = useCopied()

  const projectSetup = toProjectSetup(setup)
  const command = buildSetupCommand(setup, packageManager)
  const plan = getSetupPlan(setup)
  const prerequisites = getPrerequisites(projectSetup)
  const nextSteps = getNextSteps(projectSetup, packageManager)
  const isExisting = setup.project === "existing"
  const darkModeGuide =
    !isExisting && DARK_MODE_GUIDES[setup.framework]
      ? DARK_MODE_GUIDES[setup.framework]
      : "/docs/dark-mode"

  return (
    <div className="flex w-full max-w-3xl flex-col gap-10">
      <section aria-labelledby="command-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="command-title" className="text-[15px] font-semibold">
              Run this in your terminal
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {isExisting
                ? "From your project's root folder."
                : "From the folder you keep your projects in."}
            </p>
          </div>
          <PackageManagerSwitch />
        </div>
        <figure className="relative overflow-hidden rounded-xl bg-code">
          <CommandText
            command={command}
            className="my-4 ms-4 me-12 text-sm leading-relaxed"
          />
          <CopyButton
            value={command}
            event="copy_npm_command"
            className="top-2.5"
          />
        </figure>
        <div className="flex flex-wrap items-center gap-3">
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
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Not the one running it? The link opens this page with your look and
            choices.
          </p>
        </div>
      </section>

      <section aria-labelledby="plan-title" className="flex flex-col gap-4">
        <h2 id="plan-title" className="text-[15px] font-semibold">
          What this does
        </h2>
        <PlanList steps={plan} />
      </section>

      {prerequisites.length > 0 ? (
        <section
          aria-labelledby="prerequisites-title"
          className="flex flex-col gap-3"
        >
          <h2 id="prerequisites-title" className="text-[15px] font-semibold">
            Before you run it
          </h2>
          <ul className="flex flex-col gap-3">
            {prerequisites.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`${LINK_CLASS} flex w-fit items-center gap-1.5 text-sm font-medium [&_svg]:size-3.5`}
                >
                  {item.title}
                  <ExternalLinkIcon />
                </a>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="next-title" className="flex flex-col gap-3">
        <h2 id="next-title" className="text-[15px] font-semibold">
          Then
        </h2>
        {nextSteps.length > 0 ? (
          <dl className="flex flex-col gap-2">
            {nextSteps.map((item) => (
              <div
                key={item.code}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
              >
                <dt className="text-[13px] text-muted-foreground">
                  {item.label}
                </dt>
                <dd>
                  <code className="rounded-md bg-muted px-2 py-1 font-mono text-[13px]">
                    {item.code}
                  </code>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
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
            <Link
              href={darkModeGuide ?? "/docs/dark-mode"}
              className={LINK_CLASS}
            >
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

const STARTING_POINTS: Record<Setup["project"], string> = {
  new: "A new project",
  monorepo: "A new monorepo",
  existing: "An existing project",
}

function getProjectApps(setup: Setup) {
  if (setup.project !== "monorepo") return []
  return [
    "Web",
    ...(setup.mobile ? ["Mobile"] : []),
    ...(setup.desktop === "none"
      ? []
      : [`Desktop (${setup.desktop === "tauri" ? "Tauri" : "Electron"})`]),
  ]
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

export function SetupSummary({
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
  const assistants = ASSISTANTS.filter(({ value }) =>
    setup.assistants.includes(value)
  ).map(({ label }) => label)
  const extras = [
    setup.components === "all" ? "Every component" : null,
    setup.sound ? "Sounds" : null,
    ...assistants,
  ].filter(Boolean)
  const appNames = getProjectApps(setup)

  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-3">
      <h2 id="summary-title" className="text-[15px] font-semibold">
        Your setup
      </h2>
      <div className="grid gap-3">
        <SummaryCard title="Project" onEdit={() => onEdit("project")}>
          <SummaryRow label="Starting from">
            {STARTING_POINTS[setup.project]}
          </SummaryRow>
          {setup.project === "existing" ? null : (
            <SummaryRow label="Name">
              <code className="font-mono">
                {getProjectTree(toProjectSetup(setup)).name}
              </code>
            </SummaryRow>
          )}
          {setup.project === "existing" ? null : (
            <SummaryRow label="Framework">
              {FRAMEWORKS.find(({ value }) => value === setup.framework)?.label}
            </SummaryRow>
          )}
          {appNames.length > 1 ? (
            <SummaryRow label="Apps">{appNames.join(", ")}</SummaryRow>
          ) : null}
          {isNativeFramework(setup.framework) &&
          setup.project === "new" ? null : (
            <SummaryRow label="Primitives">
              {SETUP_BASES.find(({ value }) => value === setup.base)?.label}
            </SummaryRow>
          )}
        </SummaryCard>
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
          <SummaryRow label="Density">
            {DENSITY_OPTIONS.find(({ value }) => value === look.density)?.label}
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
        <SummaryCard title="App Shell" onEdit={() => onEdit("shell")}>
          {setup.appShell ? (
            <>
              <SummaryRow label="Sidebar">
                {
                  SIDEBAR_VARIANT_CHOICES.find(
                    ({ value }) => value === setup.shell.variant
                  )?.label
                }
              </SummaryRow>
              <SummaryRow label="Collapse">
                {
                  SIDEBAR_COLLAPSE_CHOICES.find(
                    ({ value }) => value === setup.shell.collapse
                  )?.label
                }
              </SummaryRow>
              <SummaryRow label="Tabs">
                {
                  TAB_PLACEMENT_CHOICES.find(
                    ({ value }) => value === setup.shell.tabs
                  )?.label
                }
              </SummaryRow>
              <SummaryRow label="Right panel">
                {setup.shell.panel ? "On" : "Off"}
              </SummaryRow>
              <SummaryRow label="Status bar">
                {setup.shell.status ? "On" : "Off"}
              </SummaryRow>
            </>
          ) : (
            <SummaryRow label="In your project">No</SummaryRow>
          )}
        </SummaryCard>
        <SummaryCard title="Extras" onEdit={() => onEdit("extras")}>
          <SummaryRow label="Included">
            {extras.length > 0 ? extras.join(", ") : "None"}
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
