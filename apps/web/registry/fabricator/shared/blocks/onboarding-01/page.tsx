"use client"

import * as React from "react"
import { cn } from "cn"

import { notifyOnboarding } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-controls"
import { OnboardingPreview } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-preview"
import { OnboardingStepConnect } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-step-connect"
import { OnboardingStepInvite } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-step-invite"
import { OnboardingStepReady } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-step-ready"
import { OnboardingStepReview } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-step-review"
import { OnboardingStepTeam } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-step-team"
import {
  ONBOARDING_USE_KEYS,
  OnboardingStepUse,
} from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-step-use"
import { OnboardingStepWorkspace } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-step-workspace"
import { OnboardingTopBar } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-top-bar"
import {
  useOnboarding,
  useOnboardingKeys,
} from "@/registry/bases/__base__/blocks/onboarding-01/hooks/use-onboarding"
import { useOnboardingSources } from "@/registry/bases/__base__/blocks/onboarding-01/hooks/use-onboarding-sources"
import {
  ONBOARDING_COLLEAGUES,
  ONBOARDING_OWNER,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-data"
import {
  getOpenStep,
  getStepIssue,
  getStepPosition,
  ONBOARDING_USES,
  toggleValue,
  withUse,
  type OnboardingAnswers,
  type OnboardingQuestion,
  type OnboardingStep,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { useIsMobile } from "@/registry/bases/__base__/hooks/use-mobile"
import { Button } from "@/registry/bases/__base__/ui/button"
import { FieldError } from "@/registry/bases/__base__/ui/field"
import { Kbd } from "@/registry/bases/__base__/ui/kbd"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"

// A new owner goes from sign-up to a useful workspace in under two minutes,
// mostly by choosing. The signature is the workspace itself, beside the
// question, redrawn by every answer.

// Swap the timer for the call that creates the workspace.
const CREATE_TIME = 1100

// Phones have room for a glimpse of the workspace on the short steps.
const PEEK_STEPS: OnboardingStep[] = ["use", "team", "workspace", "ready"]
const OPTIONAL_STEPS: OnboardingStep[] = ["connect", "invite"]

function getContinueLabel({
  isReview,
  isCreating,
  editing,
}: {
  isReview: boolean
  isCreating: boolean
  editing: OnboardingQuestion | null
}) {
  if (!isReview) return "Continue"
  if (editing) return "Done"
  return isCreating ? "Creating…" : "Create workspace"
}

function getCopy(step: OnboardingStep, answers: OnboardingAnswers) {
  const name = answers.name.trim() || "The workspace"
  const invited = answers.size > 0 ? answers.invites.length : 0
  const copy = {
    use: {
      title: "What will you run here first?",
      lead: "The rest can join later.",
    },
    team: {
      title: "How does your team work?",
      lead: "We guessed from acme.com.",
    },
    workspace: {
      title: "Make it yours",
      lead: "What people see when they sign in.",
    },
    connect: {
      title: "Bring your work along",
      lead: "It stays where it is and shows up here too.",
    },
    invite: {
      title: "Who else is in?",
      lead: "They join with the same view as you.",
    },
    review: {
      title: "Ready to create it?",
      lead:
        invited > 0
          ? `This sends ${invited} ${invited === 1 ? "invitation" : "invitations"} from ada@acme.com.`
          : "Nothing is sent to anyone.",
    },
    ready: {
      title: `${name} is ready`,
      lead:
        invited > 0
          ? `${invited} ${invited === 1 ? "invitation is" : "invitations are"} on the way.`
          : "It's just you for now.",
    },
  } satisfies Record<OnboardingStep, { title: string; lead: string }>
  return copy[step]
}

export default function OnboardingPage() {
  const id = React.useId()
  const isMobile = useIsMobile()
  const { answers, step, isBackward, setAnswers, goNext, goBack } =
    useOnboarding(ONBOARDING_OWNER.email)
  const sources = useOnboardingSources(answers.sources, (connected) =>
    setAnswers({ sources: connected })
  )
  const [triedStep, setTriedStep] = React.useState<OnboardingStep | null>(null)
  const [editing, setEditing] = React.useState<OnboardingQuestion | null>(null)
  const [isCreating, setCreating] = React.useState(false)
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const shownStep = React.useRef<OnboardingStep | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  // A new question is read out from its heading, and the first is left alone.
  React.useEffect(() => {
    if (shownStep.current && shownStep.current !== step) {
      headingRef.current?.focus()
    }
    shownStep.current = step
  }, [step])
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const { title, lead } = getCopy(step, answers)
  const hasTried = triedStep === step
  const issue = getStepIssue(step, answers, ONBOARDING_OWNER.email)
  const isFirst = step === "use"
  const isReady = step === "ready"
  const isReview = step === "review"
  const openStep = isReview ? getOpenStep(answers) : null
  const open = openStep === "review" ? null : openStep
  const isOptional = OPTIONAL_STEPS.includes(step)
  const hasAnswer =
    (step === "connect" && answers.sources.length > 0) ||
    (step === "invite" && answers.invites.length > 0)

  const advance = () => {
    setTriedStep(null)
    setEditing(null)
    goNext()
  }

  const submit = () => {
    if (isCreating || isReady) return
    if (isReview && open) {
      setTriedStep(step)
      setEditing(open)
      return
    }
    if (isReview && editing) {
      setTriedStep(null)
      setEditing(null)
      return
    }
    if (issue) {
      setTriedStep(step)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()
      )
      return
    }
    if (!isReview) {
      advance()
      return
    }
    setCreating(true)
    timer.current = setTimeout(() => {
      setCreating(false)
      advance()
    }, CREATE_TIME)
  }

  const pick = (index: number) => {
    const question = isReview ? editing : step
    if (question === "use") {
      const use = ONBOARDING_USE_KEYS[index]
      if (use) setAnswers(withUse(answers, use))
    }
    if (question === "connect") {
      const source = ONBOARDING_USES[answers.use ?? "projects"].sources[index]
      if (source) sources.toggle(source.id)
    }
    if (question === "invite") {
      const person = ONBOARDING_COLLEAGUES[index]
      if (person) {
        setAnswers({ invites: toggleValue(answers.invites, person.email) })
      }
    }
  }

  useOnboardingKeys({ onPick: pick, onContinue: submit })

  const renderQuestion = (question: OnboardingQuestion, labelledBy: string) => {
    const props = { answers, onChange: setAnswers }
    switch (question) {
      case "use":
        return <OnboardingStepUse labelledBy={labelledBy} {...props} />
      case "team":
        return <OnboardingStepTeam {...props} />
      case "workspace":
        return <OnboardingStepWorkspace hasTried={hasTried} {...props} />
      case "connect":
        return (
          <OnboardingStepConnect
            answers={answers}
            getState={sources.getState}
            onToggle={sources.toggle}
          />
        )
      case "invite":
        return <OnboardingStepInvite {...props} />
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface-0 text-(length:--density-text-13) md:h-svh">
      <OnboardingTopBar
        step={step}
        position={getStepPosition(step, answers)}
        onExit={() =>
          notifyOnboarding("Saved", "Come back here to pick up where you left.")
        }
      />
      <div className="flex min-h-0 flex-1 md:gap-(--density-16)">
        <main className="flex min-w-0 flex-1 flex-col md:max-w-md md:shrink-0 md:basis-1/2 md:overflow-y-auto lg:w-md lg:basis-auto">
          <form
            noValidate
            className="flex flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <div
              key={step}
              className={cn(
                "flex flex-col gap-(--density-32) px-(--density-16) pt-(--density-24) pb-(--density-24) md:px-(--density-40) md:pt-[clamp(1.5rem,10svh,6rem)]",
                shownStepClass(isBackward)
              )}
            >
              <div className="flex flex-col gap-(--density-4)">
                <h1
                  id={`${id}-title`}
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl tracking-tight text-balance outline-none weight-semibold"
                >
                  {title}
                </h1>
                <p className="text-[15px] text-pretty text-muted-foreground">
                  {lead}
                </p>
              </div>
              <fieldset disabled={isCreating} className="flex min-w-0 flex-col">
                <legend className="sr-only">{title}</legend>
                {isReview && (
                  <OnboardingStepReview
                    answers={answers}
                    editing={editing}
                    onEditingChange={setEditing}
                    renderQuestion={renderQuestion}
                  />
                )}
                {isReady && (
                  <OnboardingStepReady answers={answers} onStart={() => {}} />
                )}
                {!isReview && !isReady && renderQuestion(step, `${id}-title`)}
                {hasTried && issue && step !== "workspace" && (
                  <FieldError className="pt-(--density-12)">{issue}</FieldError>
                )}
              </fieldset>
            </div>
            {isMobile && PEEK_STEPS.includes(step) && (
              <OnboardingPreview
                isCompact
                answers={answers}
                className="mx-(--density-16) max-h-80 min-h-48 flex-1"
              />
            )}
            {!isReady && (
              <div className="sticky bottom-0 mt-auto flex items-center gap-(--density-8) bg-surface-0 px-(--density-16) pt-(--density-12) pb-[max(var(--density-16),env(safe-area-inset-bottom))] md:mt-0 md:px-(--density-40) md:pb-(--density-40)">
                {!isFirst && (
                  <Button variant="ghost" className="-ms-4" onClick={goBack}>
                    Back
                  </Button>
                )}
                <span className="ms-auto flex items-center gap-(--density-8)">
                  {isOptional && !hasAnswer && (
                    <Button variant="ghost" onClick={advance}>
                      Skip for now
                    </Button>
                  )}
                  <fieldset disabled={isCreating} className="contents">
                    <Button type="submit">
                      {isCreating && <Spinner data-icon="inline-start" />}
                      {getContinueLabel({ isReview, isCreating, editing })}
                      {!isCreating && (
                        <Kbd className="bg-primary-foreground/15 text-primary-foreground pointer-coarse:hidden">
                          ↵
                        </Kbd>
                      )}
                    </Button>
                  </fieldset>
                </span>
              </div>
            )}
          </form>
        </main>
        {!isMobile && (
          <OnboardingPreview
            answers={answers}
            className="hidden min-w-0 flex-1 md:me-(--density-16) md:mb-(--density-16) md:block"
          />
        )}
      </div>
    </div>
  )
}

function shownStepClass(isBackward: boolean) {
  return cn(
    "animate-in duration-move ease-move fade-in-0",
    isBackward ? "slide-in-from-left-4" : "slide-in-from-right-4"
  )
}
