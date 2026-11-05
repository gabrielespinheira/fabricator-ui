"use client"

import Link from "next/link"

import { getShellPreviewQuery } from "@/app/(app)/(create)/lib/shell-preview"
import {
  AppShellOptionFields,
  OptionSwitch,
  ResetOptionsButton,
} from "@/app/(view)/app-shell/_components/options-card"
import {
  countChangedOptions,
  DEFAULT_PLAYGROUND_OPTIONS,
  getHiddenShellOptions,
  getShellOptionNotes,
  getTabChoices,
  type PlaygroundOptions,
  type ShellProject,
} from "@/app/(view)/app-shell/_lib/options"

import { StepFooter } from "./step-parts"

const LINK_CLASS =
  "rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-1 focus-visible:ring-focus-ring"

const CARD_CLASS =
  "rounded-2xl bg-surface-3 px-3 shadow-surface-1 dark:bg-surface-2 dark:shadow-surface-2"

/** What the step says it writes, for the apps a project has. */
function describeTargets({ hasWeb, hasDesktop, hasMobile }: ShellProject) {
  if (!hasWeb) return "Your choices write one file, in React Native."
  if (hasMobile && hasDesktop) {
    return "Your choices write one file for web and desktop, and one for mobile in React Native."
  }
  if (hasMobile) {
    return "Your choices write one file for web, and one for mobile in React Native."
  }
  if (hasDesktop) {
    return "Your choices write one file: it runs in a browser and in your desktop window."
  }
  return "Your choices write one file, yours to edit."
}

/** The options that follow the project. The preview follows them, and so does the command. */
export function ShellControls({
  options,
  onOptionsChange,
  isIncluded,
  onIncludedChange,
  project,
  onBack,
  onNext,
}: {
  options: PlaygroundOptions
  onOptionsChange: (options: Partial<PlaygroundOptions> | null) => void
  isIncluded: boolean
  onIncludedChange: (isIncluded: boolean) => void
  project: ShellProject
  onBack: () => void
  onNext: () => void
}) {
  const hidden = getHiddenShellOptions(project)
  // What Reset counts: an option the step doesn't show isn't a change to undo.
  const hiddenNames: ReadonlySet<string> = hidden
  const visibleOptions = Object.fromEntries(
    Object.entries(options).filter(
      ([key]) =>
        Object.hasOwn(DEFAULT_PLAYGROUND_OPTIONS, key) && !hiddenNames.has(key)
    )
  )
  const changed = countChangedOptions({
    ...DEFAULT_PLAYGROUND_OPTIONS,
    ...visibleOptions,
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        The wrapper around your pages: sidebar, header, tabs, right panel and
        status bar. {describeTargets(project)}
      </p>
      <div className={`${CARD_CLASS} py-1`}>
        <OptionSwitch
          label="Add to my project"
          checked={isIncluded}
          onChange={onIncludedChange}
        />
      </div>
      {/* A shell that won't install has nothing to set, only a look to judge. */}
      <fieldset
        disabled={!isIncluded}
        className={`${CARD_CLASS} @container border-0 py-3 disabled:opacity-50`}
      >
        <AppShellOptionFields
          options={options}
          setOptions={onOptionsChange}
          hidden={hidden}
          notes={getShellOptionNotes(project)}
          tabChoices={getTabChoices(project)}
        />
      </fieldset>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Or{" "}
          <Link
            href={`/app-shell${getShellPreviewQuery(options)}`}
            className={LINK_CLASS}
          >
            try it full screen
          </Link>
          .
        </p>
        <ResetOptionsButton
          changed={changed}
          onReset={() => onOptionsChange(null)}
        />
      </div>
      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Next: extras" />
    </div>
  )
}
