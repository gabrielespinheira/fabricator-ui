"use client"

import * as React from "react"

import { OnboardingAvatar } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-avatar"
import { OnboardingEmailsField } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-controls"
import {
  ONBOARDING_COLLEAGUES,
  ONBOARDING_OWNER,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-data"
import {
  getInviteProblem,
  toggleValue,
  type OnboardingAnswers,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { Kbd } from "@/registry/bases/__base__/ui/kbd"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** People from the domain to add with one press, and a box for the rest. */
export function OnboardingStepInvite({
  answers,
  onChange,
}: {
  answers: OnboardingAnswers
  onChange: (answers: OnboardingAnswers) => void
}) {
  const id = React.useId()
  const { invites } = answers
  const setInvites = (next: string[]) => onChange({ ...answers, invites: next })
  const problems = invites.flatMap((email) => {
    const problem = getInviteProblem(email, ONBOARDING_OWNER.email)
    return problem ? [{ email, ...problem }] : []
  })

  return (
    <FieldGroup>
      <Field>
        <FieldLabel id={`${id}-label`} htmlFor={`${id}-emails`}>
          Emails
        </FieldLabel>
        <OnboardingEmailsField
          id={`${id}-emails`}
          labelledBy={`${id}-label`}
          describedBy={`${id}-help`}
          values={invites}
          isInvalid={(email) =>
            getInviteProblem(email, ONBOARDING_OWNER.email) !== undefined
          }
          onValuesChange={setInvites}
        />
        <FieldDescription id={`${id}-help`}>
          Paste a list. Invitations go out when you create the workspace.
        </FieldDescription>
      </Field>
      {problems.length > 0 && (
        <ItemGroup aria-live="polite">
          {problems.map((problem) => (
            <Item key={problem.email} role="listitem" variant="muted" size="sm">
              <ItemContent>
                <ItemTitle className="break-all">{problem.email}</ItemTitle>
                <ItemDescription className="text-foreground/70">
                  {problem.message}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInvites(
                      problem.suggestion
                        ? [
                            ...new Set(
                              invites.map((email) =>
                                email === problem.email
                                  ? (problem.suggestion ?? email)
                                  : email
                              )
                            ),
                          ]
                        : invites.filter((email) => email !== problem.email)
                    )
                  }
                >
                  {problem.suggestion ? "Fix" : "Remove"}
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
      <div className="flex flex-col gap-(--density-8)">
        <FieldTitle>At acme.com</FieldTitle>
        <ItemGroup className="-mx-(--density-12) w-auto gap-0!">
          {ONBOARDING_COLLEAGUES.map((person, index) => {
            const isInvited = invites.includes(person.email)
            return (
              <Item key={person.email} role="listitem" size="sm">
                <ItemMedia>
                  <OnboardingAvatar person={person} size="default" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{person.name}</ItemTitle>
                  <ItemDescription>{person.email}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Kbd className="pointer-coarse:hidden">{index + 1}</Kbd>
                  <Button
                    variant={isInvited ? "secondary" : "outline"}
                    size="sm"
                    className="w-20"
                    aria-pressed={isInvited}
                    aria-label={`${isInvited ? "Added" : "Add"} ${person.name}`}
                    onClick={() =>
                      setInvites(toggleValue(invites, person.email))
                    }
                  >
                    {isInvited && (
                      <IconPlaceholder
                        lucide="CheckIcon"
                        tabler="IconCheck"
                        hugeicons="Tick02Icon"
                        phosphor="CheckIcon"
                        remixicon="RiCheckLine"
                        data-icon="inline-start"
                      />
                    )}
                    {isInvited ? "Added" : "Add"}
                  </Button>
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>
      </div>
    </FieldGroup>
  )
}
