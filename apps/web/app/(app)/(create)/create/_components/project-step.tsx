"use client"

import { FolderOpenIcon, FolderPlusIcon } from "@/lib/site-icons"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import { Input } from "@/styles/base-fabricator/ui/input"
import { RadioGroup } from "@/styles/base-fabricator/ui/radio-group"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  DEFAULT_PROJECT_NAME,
  FRAMEWORKS,
  SETUP_BASES,
  type SetupChoices,
} from "@/app/(app)/(create)/lib/setup"

import { FRAMEWORK_ICONS } from "./framework-icons"
import { ChoiceCard, StepFooter, StepSection } from "./step-parts"

type StepProps = {
  choices: SetupChoices
  onChange: (patch: Partial<SetupChoices>) => void
  onBack: () => void
  onNext: () => void
}

function pick<T extends string>(values: readonly T[], value: unknown) {
  return values.find((candidate) => candidate === value)
}

const PROJECTS = ["new", "existing"] as const
const FRAMEWORK_VALUES = FRAMEWORKS.map(({ value }) => value)
const BASE_VALUES = SETUP_BASES.map(({ value }) => value)

export function ProjectStep({ choices, onChange, onBack, onNext }: StepProps) {
  const isNew = choices.project === "new"
  const isLaravel = choices.framework === "laravel"

  return (
    <FieldGroup className="w-full max-w-2xl gap-10">
      <StepSection title="Where are you starting?">
        <RadioGroup
          value={choices.project}
          onValueChange={(value) => {
            const project = pick(PROJECTS, value)
            if (project) onChange({ project })
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <ChoiceCard
            value="new"
            title="A new project"
            description="Create an app with Fabricator UI already set up."
            icon={<FolderPlusIcon />}
          />
          <ChoiceCard
            value="existing"
            title="An existing project"
            description="Add Fabricator UI to a React app you already have."
            icon={<FolderOpenIcon />}
          />
        </RadioGroup>
      </StepSection>

      {isNew ? (
        <>
          <StepSection
            title="Framework"
            description="Not sure? Next.js suits most apps and sites."
          >
            <RadioGroup
              value={choices.framework}
              onValueChange={(value) => {
                const framework = pick(FRAMEWORK_VALUES, value)
                if (framework) onChange({ framework })
              }}
              className="grid gap-3 sm:grid-cols-2"
            >
              {FRAMEWORKS.map((framework) => {
                const Icon = FRAMEWORK_ICONS[framework.value]
                return (
                  <ChoiceCard
                    key={framework.value}
                    value={framework.value}
                    title={framework.label}
                    description={framework.description}
                    icon={<Icon />}
                  />
                )
              })}
            </RadioGroup>
          </StepSection>

          <Field>
            <FieldLabel htmlFor="project-name">Project name</FieldLabel>
            <Input
              id="project-name"
              value={choices.name}
              placeholder={DEFAULT_PROJECT_NAME}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) =>
                onChange({ name: event.target.value.replace(/\s/g, "-") })
              }
              className="max-w-sm"
            />
            <FieldDescription>
              The folder your project is created in.
            </FieldDescription>
          </Field>
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          The CLI finds your framework on its own. It works with Next.js, Vite,
          TanStack Start, React Router, Astro and Laravel apps that use React 19
          and Tailwind CSS v4.
        </p>
      )}

      <StepSection
        title="Component primitives"
        description="The library that handles keyboard, focus and screen readers under each component. Every one looks the same."
      >
        <RadioGroup
          value={choices.base}
          onValueChange={(value) => {
            const base = pick(BASE_VALUES, value)
            if (base) onChange({ base })
          }}
          className="grid gap-3 sm:grid-cols-3"
        >
          {SETUP_BASES.map((base) => (
            <ChoiceCard
              key={base.value}
              value={base.value}
              title={base.label}
              description={base.description}
            />
          ))}
        </RadioGroup>
      </StepSection>

      {isNew && !isLaravel ? (
        <FieldLabel htmlFor="monorepo">
          <Field orientation="horizontal">
            <FieldContent>
              <span className="text-[13px] font-medium">Monorepo</span>
              <FieldDescription>
                Puts the app in apps/web and the components in a shared package,
                for teams with several apps.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="monorepo"
              checked={choices.monorepo}
              onCheckedChange={(monorepo) => onChange({ monorepo })}
            />
          </Field>
        </FieldLabel>
      ) : null}

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Next: extras" />
    </FieldGroup>
  )
}
