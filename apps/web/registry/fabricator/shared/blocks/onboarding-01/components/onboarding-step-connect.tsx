"use client"

import * as React from "react"

import { OnboardingSwitchCard } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-controls"
import { type OnboardingSourceState } from "@/registry/bases/__base__/blocks/onboarding-01/hooks/use-onboarding-sources"
import { ONBOARDING_SOURCE_MARKS } from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-data"
import {
  ONBOARDING_USES,
  type OnboardingAnswers,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  FieldDescription,
  FieldError,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import { Kbd } from "@/registry/bases/__base__/ui/kbd"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"

/** Where the work already is. Each one connects, or says why it couldn't. */
export function OnboardingStepConnect({
  answers,
  getState,
  onToggle,
}: {
  answers: OnboardingAnswers
  getState: (id: string) => OnboardingSourceState
  onToggle: (id: string) => void
}) {
  const id = React.useId()
  const { sources } = ONBOARDING_USES[answers.use ?? "projects"]

  return (
    <ul className="flex flex-col gap-(--density-12)">
      {sources.map((source, index) => {
        const state = getState(source.id)
        const Mark = ONBOARDING_SOURCE_MARKS[source.id]
        return (
          <li key={source.id} className="flex flex-col gap-(--density-6)">
            <OnboardingSwitchCard
              id={`${id}-${source.id}`}
              checked={state === "connected" || state === "connecting"}
              isBusy={state === "connecting"}
              onCheckedChange={() => onToggle(source.id)}
            >
              <span className="flex items-center gap-(--density-12)">
                <span className="flex size-(--density-32) shrink-0 items-center justify-center">
                  {state === "connecting" ? (
                    <Spinner />
                  ) : (
                    Mark && <Mark size={20} color="brand" aria-hidden="true" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <FieldTitle>{source.name}</FieldTitle>
                  <FieldDescription
                    aria-live="polite"
                    className="text-foreground/70"
                  >
                    {state === "connecting" && "Connecting…"}
                    {state === "connected" && `Connected. ${source.detail}`}
                    {(state === "off" || state === "failed") && source.detail}
                  </FieldDescription>
                </span>
                <Kbd className="self-start pointer-coarse:hidden">
                  {index + 1}
                </Kbd>
              </span>
            </OnboardingSwitchCard>
            {state === "failed" && (
              <FieldError className="flex items-center justify-between gap-(--density-8) ps-(--density-12)">
                {source.name} didn&apos;t answer. Nothing was shared.
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggle(source.id)}
                >
                  Try again
                </Button>
              </FieldError>
            )}
          </li>
        )
      })}
    </ul>
  )
}
