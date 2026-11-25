"use client"

import * as React from "react"

import {
  OnboardingLayoutChoice,
  OnboardingSizeSlider,
} from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-controls"
import {
  ONBOARDING_SIZES,
  ONBOARDING_USES,
  type OnboardingAnswers,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"

function getSizeNote(size: number) {
  const teams = ONBOARDING_SIZES[size]?.teams ?? 0
  if (teams === 0) return "Just your own work, with nothing to set up."
  if (teams === 1) return "One team that sees everything."
  return `Starts with ${teams} teams. Each has its own page.`
}

/** How many people, and how they like to see their work. */
export function OnboardingStepTeam({
  answers,
  onChange,
}: {
  answers: OnboardingAnswers
  onChange: (answers: OnboardingAnswers) => void
}) {
  const id = React.useId()
  const layouts = ONBOARDING_USES[answers.use ?? "projects"].layouts
  const size = ONBOARDING_SIZES[answers.size]

  return (
    <FieldGroup className="gap-(--density-32)">
      <Field className="gap-(--density-12)">
        <span className="flex items-baseline justify-between gap-(--density-8)">
          <FieldTitle>People</FieldTitle>
          <span aria-live="polite" className="tabular-nums">
            {size?.label}
          </span>
        </span>
        <OnboardingSizeSlider
          label="People"
          value={answers.size}
          max={ONBOARDING_SIZES.length - 1}
          valueText={size?.label ?? ""}
          onValueChange={(next) => onChange({ ...answers, size: next })}
        />
        <FieldDescription>{getSizeNote(answers.size)}</FieldDescription>
      </Field>
      <Field className="gap-(--density-12)">
        <FieldTitle id={`${id}-layout`}>Show work as</FieldTitle>
        <OnboardingLayoutChoice
          labelledBy={`${id}-layout`}
          value={answers.layout}
          options={layouts}
          onValueChange={(layout) => onChange({ ...answers, layout })}
        />
        <FieldDescription>
          Anyone can switch it for themselves.
        </FieldDescription>
      </Field>
    </FieldGroup>
  )
}
