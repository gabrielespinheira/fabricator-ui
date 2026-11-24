"use client"

import * as React from "react"

import {
  findOnboardingPerson,
  OnboardingAvatar,
} from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-avatar"
import { OnboardingMark } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-mark"
import { ONBOARDING_SOURCE_MARKS } from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-data"
import {
  getReviewRows,
  type OnboardingAnswers,
  type OnboardingQuestion,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Button } from "@/registry/bases/__base__/ui/button"

/** The answer as the thing it is: the mark, the sources, the people. */
function ReviewMedia({
  step,
  answers,
}: {
  step: OnboardingQuestion
  answers: OnboardingAnswers
}) {
  if (step === "workspace") {
    return <OnboardingMark name={answers.name || "A"} color={answers.color} />
  }
  if (step === "connect") {
    return (
      <span className="flex gap-(--density-8)">
        {answers.sources.map((source) => {
          const Mark = ONBOARDING_SOURCE_MARKS[source]
          return (
            Mark && (
              <Mark key={source} size={18} color="brand" aria-hidden="true" />
            )
          )
        })}
      </span>
    )
  }
  if (step === "invite") {
    return (
      <span aria-hidden="true" className="flex -space-x-1.5">
        {answers.invites.slice(0, 5).map((email) => (
          <OnboardingAvatar
            key={email}
            person={findOnboardingPerson(email)}
            className="ring-2 ring-surface-0"
          />
        ))}
      </span>
    )
  }
  return null
}

/** Every answer on one line, each opening in place to change it. */
export function OnboardingStepReview({
  answers,
  editing,
  onEditingChange,
  renderQuestion,
}: {
  answers: OnboardingAnswers
  editing: OnboardingQuestion | null
  onEditingChange: (step: OnboardingQuestion | null) => void
  renderQuestion: (
    step: OnboardingQuestion,
    labelledBy: string
  ) => React.ReactNode
}) {
  const id = React.useId()

  return (
    <ul className="flex flex-col gap-(--density-4)">
      {getReviewRows(answers).map((row) => {
        const isOpen = editing === row.step
        return (
          <li key={row.step} className="flex flex-col">
            <div className="flex items-center gap-(--density-12) py-(--density-8)">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  id={`${id}-${row.step}`}
                  className="text-(length:--density-text-12) text-muted-foreground"
                >
                  {row.label}
                </span>
                <span className="break-words">{row.value}</span>
              </span>
              <ReviewMedia step={row.step} answers={answers} />
              <Button
                variant="ghost"
                size="sm"
                className="-me-3"
                aria-expanded={isOpen}
                aria-controls={`${id}-${row.step}-panel`}
                aria-label={`${isOpen ? "Close" : "Change"} ${row.label.toLowerCase()}`}
                onClick={() => onEditingChange(isOpen ? null : row.step)}
              >
                {isOpen ? "Close" : "Change"}
              </Button>
            </div>
            {isOpen && (
              <div
                id={`${id}-${row.step}-panel`}
                className="animate-in pt-(--density-8) pb-(--density-20) duration-disclosure ease-enter fade-in-0"
              >
                {renderQuestion(row.step, `${id}-${row.step}`)}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
