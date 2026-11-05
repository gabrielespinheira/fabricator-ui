"use client"

import * as React from "react"
import { ElectronIcon, ExpoIcon, TauriIcon } from "@fabricator-ui/icons/brands"

import {
  FolderOpenIcon,
  FolderPlusIcon,
  GlobeIcon,
  LayersIcon,
} from "@/lib/site-icons"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import { Input } from "@/styles/base-fabricator/ui/input"
import { RadioGroup } from "@/styles/base-fabricator/ui/radio-group"
import {
  DEFAULT_PROJECT_NAME,
  FRAMEWORKS,
  isNativeFramework,
  MONOREPO_FRAMEWORKS,
  SETUP_BASES,
  type DesktopRuntime,
  type ProjectKind,
  type SetupChoices,
} from "@/app/(app)/(create)/lib/setup"

import { FRAMEWORK_ICONS } from "./framework-icons"
import { CheckCard, ChoiceCard, StepFooter, StepSection } from "./step-parts"

type StepProps = {
  choices: SetupChoices
  onChange: (patch: Partial<SetupChoices>) => void
  /** Turning Mobile on (or picking Expo) starts the phone tab bar on. */
  onMobileAdded: () => void
  /** Leaving Desktop clears what only a window can use. */
  onDesktopRemoved: () => void
  onNext: () => void
}

function pick<T extends string>(values: readonly T[], value: unknown) {
  return values.find((candidate) => candidate === value)
}

const PROJECTS: readonly ProjectKind[] = ["new", "monorepo", "existing"]
const FRAMEWORK_VALUES = FRAMEWORKS.map(({ value }) => value)
const BASE_VALUES = SETUP_BASES.map(({ value }) => value)
const DESKTOPS: readonly DesktopRuntime[] = ["none", "electron", "tauri"]

export function ProjectControls({
  choices,
  onChange,
  onMobileAdded,
  onDesktopRemoved,
  onNext,
}: StepProps) {
  const isExisting = choices.project === "existing"
  const isMonorepo = choices.project === "monorepo"
  const isNative = isNativeFramework(choices.framework)
  const frameworks = React.useMemo(
    () =>
      FRAMEWORKS.filter(
        ({ value }) => !isMonorepo || MONOREPO_FRAMEWORKS.includes(value)
      ),
    [isMonorepo]
  )
  const framework = FRAMEWORKS.find(({ value }) => value === choices.framework)

  const changeProject = (project: ProjectKind) => {
    const keepsApps = project === "monorepo"
    if (!keepsApps && choices.desktop !== "none") onDesktopRemoved()
    onChange({
      project,
      ...(keepsApps ? {} : { mobile: false, desktop: "none" }),
      ...(project === "monorepo" &&
      !MONOREPO_FRAMEWORKS.includes(choices.framework)
        ? { framework: "next" }
        : {}),
    })
  }

  return (
    <FieldGroup className="gap-8">
      <StepSection title="Where are you starting?">
        <RadioGroup
          value={choices.project}
          onValueChange={(value) => {
            const project = pick(PROJECTS, value)
            if (project) changeProject(project)
          }}
          className="grid gap-3"
        >
          <ChoiceCard
            value="new"
            title="A new project"
            description="One app, with Fabricator UI already set up."
            icon={<FolderPlusIcon />}
          />
          <ChoiceCard
            value="monorepo"
            title="A new monorepo"
            description="A web app and shared components, with room for mobile and desktop."
            icon={<LayersIcon />}
          />
          <ChoiceCard
            value="existing"
            title="An existing project"
            description="Add Fabricator UI to an app you already have."
            icon={<FolderOpenIcon />}
          />
        </RadioGroup>
      </StepSection>

      {isExisting ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          The CLI finds your framework on its own, and each app in a monorepo.
          It works with Next.js, Vite, TanStack Start, React Router, Astro and
          Laravel apps that use React 19 and Tailwind CSS v4, and with Expo
          apps.
        </p>
      ) : (
        <>
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
            />
            <FieldDescription>
              The folder your project is created in.
            </FieldDescription>
          </Field>

          <StepSection
            title={isMonorepo ? "Web framework" : "Framework"}
            description={framework?.description}
          >
            <RadioGroup
              value={choices.framework}
              onValueChange={(value) => {
                const next = pick(FRAMEWORK_VALUES, value)
                if (!next) return
                if (isNativeFramework(next)) onMobileAdded()
                onChange({ framework: next })
              }}
              className="grid gap-3 sm:grid-cols-2"
            >
              {frameworks.map((item) => {
                const Icon = FRAMEWORK_ICONS[item.value]
                return (
                  <ChoiceCard
                    key={item.value}
                    value={item.value}
                    title={item.label}
                    icon={<Icon />}
                  />
                )
              })}
            </RadioGroup>
          </StepSection>
        </>
      )}

      {isNative && !isExisting ? null : (
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
            className="grid gap-3"
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
      )}

      {isMonorepo ? (
        <StepSection
          title="Apps"
          description="Every app gets your look. Web and desktop share one codebase; mobile has its own React Native components."
        >
          <div className="flex flex-col gap-3">
            <CheckCard
              title="Web"
              description="Always there: mobile and desktop build beside it."
              icon={<GlobeIcon />}
              checked
              disabled
              onCheckedChange={() => {}}
            />
            <CheckCard
              title="Mobile"
              description="React Native and Expo, in apps/mobile."
              icon={<ExpoIcon />}
              checked={choices.mobile}
              onCheckedChange={(mobile) => {
                if (mobile) onMobileAdded()
                onChange({ mobile })
              }}
            />
          </div>
          <RadioGroup
            aria-label="Desktop"
            value={choices.desktop}
            onValueChange={(value) => {
              const desktop = pick(DESKTOPS, value)
              if (!desktop) return
              if (desktop === "none") onDesktopRemoved()
              onChange({ desktop })
            }}
            className="grid gap-3"
          >
            <ChoiceCard value="none" title="No desktop app" />
            <ChoiceCard
              value="electron"
              title="Electron"
              description="A window around apps/web. Ships its own browser."
              icon={<ElectronIcon />}
            />
            <ChoiceCard
              value="tauri"
              title="Tauri"
              description="A smaller window around apps/web. Needs Rust."
              icon={<TauriIcon />}
            />
          </RadioGroup>
        </StepSection>
      ) : null}

      <StepFooter onNext={onNext} nextLabel="Next: your look" />
    </FieldGroup>
  )
}
