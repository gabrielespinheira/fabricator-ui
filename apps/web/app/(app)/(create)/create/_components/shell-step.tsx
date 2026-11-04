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
  type PlaygroundOptions,
} from "@/app/(view)/app-shell/_lib/options"

import { StepFooter } from "./step-parts"

const LINK_CLASS =
  "rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-1 focus-visible:ring-focus-ring"

const CARD_CLASS =
  "rounded-2xl bg-surface-3 px-3 shadow-surface-1 dark:bg-surface-2 dark:shadow-surface-2"

/** The App Shell's options. The preview follows them, and so does the command. */
export function ShellControls({
  options,
  onOptionsChange,
  isIncluded,
  onIncludedChange,
  isAvailable,
  onBack,
  onNext,
}: {
  options: PlaygroundOptions
  onOptionsChange: (options: Partial<PlaygroundOptions> | null) => void
  isIncluded: boolean
  onIncludedChange: (isIncluded: boolean) => void
  /** Whether the project's framework has an App Shell. */
  isAvailable: boolean
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        The wrapper around your pages: sidebar, header, tabs, right panel and
        status bar. The preview is the real thing, and your choices go into the
        install command.
      </p>
      <div className={`${CARD_CLASS} py-1`}>
        <OptionSwitch
          label="Add to my project"
          checked={isAvailable && isIncluded}
          disabled={!isAvailable}
          onChange={onIncludedChange}
        />
      </div>
      {!isAvailable && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          The React Native library has no App Shell yet, so Expo projects skip
          it.
        </p>
      )}
      <div className={`${CARD_CLASS} py-3`}>
        <AppShellOptionFields options={options} setOptions={onOptionsChange} />
      </div>
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
          changed={countChangedOptions(options)}
          onReset={() => onOptionsChange(null)}
        />
      </div>
      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel="Next: your project"
      />
    </div>
  )
}
