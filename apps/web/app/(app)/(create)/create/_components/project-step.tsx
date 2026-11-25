"use client"

import * as React from "react"
import Link from "next/link"
import {
  BiomeIcon,
  ElectronIcon,
  ReactIcon,
  TauriIcon,
  TurborepoIcon,
  ViteIcon,
} from "@fabricator-ui/icons/brands"

import {
  CodeIcon,
  GitBranchIcon,
  GlobeIcon,
  MonitorIcon,
  RocketIcon,
  SmartphoneIcon,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/styles/base-fabricator/ui/select"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  DEFAULT_PROJECT_NAME,
  FRAMEWORKS,
  getShellProject,
  isNativeFramework,
  MONOREPO_FRAMEWORKS,
  RUNNERS,
  STARTING_POINTS,
  TOOLINGS,
  type Runner,
  type SetupChoices,
  type Tooling,
} from "@/app/(app)/(create)/lib/setup"

import { FRAMEWORK_ICONS } from "./framework-icons"
import {
  CardIcon,
  ChoiceCard,
  ChoiceTile,
  StepFooter,
  StepSection,
} from "./step-parts"

type StepProps = {
  choices: SetupChoices
  showDistribution: boolean
  packageError: string | null
  onChange: (patch: Partial<SetupChoices>) => void
  /** The phone tab bar follows Mobile: on with it, off without it. */
  onMobileChange: (hasMobile: boolean) => void
  /** Leaving Desktop clears what only a window can use. */
  onDesktopRemoved: () => void
  onNext: () => void
}

type AppOption<T extends string> = {
  value: T
  label: string
  icon: React.ReactNode
}

function pick<T extends string>(values: readonly T[], value: unknown) {
  return values.find((candidate) => candidate === value)
}

const WEB_FRAMEWORKS = FRAMEWORKS.filter(({ value }) =>
  MONOREPO_FRAMEWORKS.includes(value)
).map(({ value, label }) => {
  const Icon = FRAMEWORK_ICONS[value]
  return { value, label, icon: <Icon /> }
})
const WEB_FRAMEWORK_VALUES = WEB_FRAMEWORKS.map(({ value }) => value)

const MOBILE_FRAMEWORKS = [
  { value: "react-native", label: "React Native", icon: <ReactIcon /> },
] as const

const DESKTOP_RUNTIMES = [
  { value: "electron", label: "Electron", icon: <ElectronIcon /> },
  { value: "tauri", label: "Tauri", icon: <TauriIcon /> },
] as const
const DESKTOP_RUNTIME_VALUES = DESKTOP_RUNTIMES.map(({ value }) => value)

const TOOLING_VALUES = TOOLINGS.map(({ value }) => value)

// Fabricator Icons has no ESLint or Prettier logo.
const TOOLING_ICONS: Record<Tooling, React.ReactNode> = {
  "eslint-prettier": <CodeIcon />,
  biome: <BiomeIcon />,
  "vite-plus": <ViteIcon />,
}

const RUNNER_VALUES = RUNNERS.map(({ value }) => value)

const RUNNER_ICONS: Record<Runner, React.ReactNode> = {
  turborepo: <TurborepoIcon />,
  "vite-plus": <ViteIcon />,
}

/** A labelled group of answers inside a step's section. */
function ChoiceGroupLabel({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="text-[13px] font-medium">
      {children}
    </p>
  )
}

/** The task runner, where there's a web app's tasks to run, then the linter. */
function ProjectTooling({
  choices,
  onChange,
}: Pick<StepProps, "choices" | "onChange">) {
  const { hasWeb, hasDesktop } = getShellProject(choices)
  const hasTasks = hasWeb || hasDesktop

  return (
    <div className="flex flex-col gap-5">
      {hasTasks ? (
        <div className="flex flex-col gap-2.5">
          <ChoiceGroupLabel id="runner-label">Task runner</ChoiceGroupLabel>
          <RadioGroup
            aria-labelledby="runner-label"
            value={choices.runner}
            onValueChange={(value) => {
              const runner = pick(RUNNER_VALUES, value)
              if (runner) onChange({ runner })
            }}
            className="grid grid-cols-2 gap-3"
          >
            {RUNNERS.map((runner) => (
              <ChoiceTile
                key={runner.value}
                value={runner.value}
                title={runner.label}
                description={runner.description}
                icon={RUNNER_ICONS[runner.value]}
              />
            ))}
          </RadioGroup>
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5">
        <ChoiceGroupLabel id="tooling-label">
          Linting and formatting
        </ChoiceGroupLabel>
        <RadioGroup
          aria-labelledby="tooling-label"
          value={choices.tooling}
          onValueChange={(value) => {
            const tooling = pick(TOOLING_VALUES, value)
            if (tooling) onChange({ tooling })
          }}
          className="grid gap-3"
        >
          {TOOLINGS.map((tooling) => (
            <ChoiceCard
              key={tooling.value}
              value={tooling.value}
              title={tooling.label}
              description={tooling.description}
              icon={TOOLING_ICONS[tooling.value]}
            />
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}

/** An app the project can have: a switch, and the framework it's built with. */
function AppRow<T extends string>({
  title,
  icon,
  isOn,
  isLocked,
  onToggle,
  options,
  value,
  isPickerEnabled,
  onValueChange,
}: {
  title: string
  icon: React.ReactNode
  isOn: boolean
  /** The last app on can't go, since a project needs one. */
  isLocked: boolean
  onToggle: (isOn: boolean) => void
  options: readonly AppOption<T>[]
  value: T
  isPickerEnabled: boolean
  onValueChange: (value: T) => void
}) {
  const id = React.useId()
  const current = options.find((option) => option.value === value)

  return (
    <div className="flex items-center gap-2.5 rounded-lg p-3 ring-1 ring-border transition-[background-color,box-shadow] duration-feedback ease-feedback has-[[data-slot=switch]:focus-visible]:ring-ring has-[[data-slot=switch][data-checked]]:bg-active has-[[data-slot=switch][data-checked]]:ring-foreground/20 has-[label:hover]:not-has-[[data-slot=switch][data-checked]]:bg-hover">
      <label
        htmlFor={id}
        className="flex shrink-0 cursor-pointer items-center gap-2.5"
      >
        <CardIcon>{icon}</CardIcon>
        {/* One width for every name, so the dropdowns line up. */}
        <span className="w-14 text-[13px] leading-snug font-medium">
          {title}
        </span>
      </label>
      <Select
        items={options.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={value}
        disabled={!isPickerEnabled}
        onValueChange={(next) => {
          const option = options.find((candidate) => candidate.value === next)
          if (option) onValueChange(option.value)
        }}
      >
        <SelectTrigger
          aria-label={`${title} framework`}
          className="min-w-0 flex-1"
        >
          <SelectValue>
            {() => (
              <>
                {current?.icon}
                {current?.label}
              </>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.icon}
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Switch
        id={id}
        checked={isOn}
        disabled={isLocked}
        onCheckedChange={onToggle}
      />
    </div>
  )
}

type AppsProps = Pick<
  StepProps,
  "choices" | "onChange" | "onMobileChange" | "onDesktopRemoved"
>

/** Any mix of web, mobile and desktop, as long as there's one. */
function ProjectApps({
  choices,
  onChange,
  onMobileChange,
  onDesktopRemoved,
}: AppsProps) {
  const { hasWeb, hasMobile, hasDesktop } = getShellProject(choices)
  const isOnlyApp = [hasWeb, hasMobile, hasDesktop].filter(Boolean).length === 1
  // Old links can name the Expo template, which the mobile app now stands for.
  const framework = isNativeFramework(choices.framework)
    ? "next"
    : choices.framework
  const desktop = choices.desktop === "none" ? "electron" : choices.desktop
  const setApps = (patch: Partial<SetupChoices>) =>
    onChange({ web: hasWeb, mobile: hasMobile, framework, ...patch })

  return (
    <div className="flex flex-col gap-3">
      <AppRow
        title="Web"
        icon={<GlobeIcon />}
        isOn={hasWeb}
        isLocked={hasWeb && isOnlyApp}
        onToggle={(web) => setApps({ web })}
        options={WEB_FRAMEWORKS}
        value={pick(WEB_FRAMEWORK_VALUES, framework) ?? "next"}
        // A desktop window renders the web app, so it needs a framework too.
        isPickerEnabled={hasWeb || hasDesktop}
        onValueChange={(next) => setApps({ framework: next })}
      />
      <AppRow
        title="Mobile"
        icon={<SmartphoneIcon />}
        isOn={hasMobile}
        isLocked={hasMobile && isOnlyApp}
        onToggle={(mobile) => {
          onMobileChange(mobile)
          setApps({ mobile })
        }}
        options={MOBILE_FRAMEWORKS}
        value="react-native"
        isPickerEnabled={hasMobile}
        onValueChange={() => undefined}
      />
      <AppRow
        title="Desktop"
        icon={<MonitorIcon />}
        isOn={hasDesktop}
        isLocked={hasDesktop && isOnlyApp}
        onToggle={(isOn) => {
          if (!isOn) onDesktopRemoved()
          setApps({ desktop: isOn ? desktop : "none" })
        }}
        options={DESKTOP_RUNTIMES}
        value={desktop}
        isPickerEnabled={hasDesktop}
        onValueChange={(next) => {
          const runtime = pick(DESKTOP_RUNTIME_VALUES, next)
          if (runtime) onChange({ desktop: runtime })
        }}
      />
      {!hasWeb && hasDesktop ? (
        <FieldDescription>
          The window renders a web app, so apps/web is still there as its UI.
        </FieldDescription>
      ) : null}
    </div>
  )
}

export function ProjectControls({
  choices,
  showDistribution,
  packageError,
  onChange,
  onMobileChange,
  onDesktopRemoved,
  onNext,
}: StepProps) {
  const isExisting = choices.project === "existing"
  const { hasMobile, hasDesktop } = getShellProject(choices)
  const distribution = showDistribution ? (
    <StepSection title="Install components" description={packageError}>
      <RadioGroup
        value={choices.distribution}
        onValueChange={(value) => {
          if (value === "source" || (value === "package" && !packageError))
            onChange({ distribution: value })
        }}
        className="grid gap-3"
      >
        <ChoiceCard
          value="source"
          title="Copy into project"
          description="Add editable component files to your project."
        />
        <ChoiceCard
          value="package"
          title="Install as a package"
          description="Import components and update them with your package manager."
          disabled={Boolean(packageError)}
        />
      </RadioGroup>
      <Link
        href="/docs/installation/install-methods"
        className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Compare install methods
      </Link>
    </StepSection>
  ) : null

  const changeProject = (project: SetupChoices["project"]) => {
    if (project === "monorepo") {
      onChange({
        project,
        ...(MONOREPO_FRAMEWORKS.includes(choices.framework)
          ? {}
          : { framework: "next" }),
      })
      return
    }
    // The CLI finds an existing project's apps, so the page drops its own.
    if (hasDesktop) onDesktopRemoved()
    if (hasMobile) onMobileChange(false)
    onChange({ project, web: true, mobile: false, desktop: "none" })
  }

  return (
    <FieldGroup className="gap-8">
      <StepSection title="Where are you starting?">
        <RadioGroup
          value={choices.project}
          onValueChange={(value) => {
            const project = pick(STARTING_POINTS, value)
            if (project) changeProject(project)
          }}
          className="grid grid-cols-2 gap-3"
        >
          <ChoiceTile
            value="monorepo"
            title="New"
            description="Every app in one monorepo."
            icon={<RocketIcon />}
          />
          <ChoiceTile
            value="existing"
            title="Existing"
            description="Add to an app you have."
            icon={<GitBranchIcon />}
          />
        </RadioGroup>
      </StepSection>

      {isExisting ? distribution : null}
      {isExisting ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {choices.distribution === "package"
            ? "The CLI detects Next.js App Router and Vite React apps. In a monorepo, run it from the web app’s folder."
            : "The CLI finds your framework on its own, and each app in a monorepo. It works with Next.js, Vite, TanStack Start, React Router, Astro and Laravel apps that use React 19 and Tailwind CSS v4, and with Expo apps."}
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
            title="Apps"
            description="Turn on each app and pick what it's built with. Web and desktop share one codebase; mobile has its own React Native components."
          >
            <ProjectApps
              choices={choices}
              onChange={onChange}
              onMobileChange={onMobileChange}
              onDesktopRemoved={onDesktopRemoved}
            />
          </StepSection>

          {distribution}

          <StepSection
            title="Tooling"
            description="What runs the monorepo's tasks, and what lints and formats every app."
          >
            <ProjectTooling choices={choices} onChange={onChange} />
          </StepSection>
        </>
      )}

      <StepFooter onNext={onNext} nextLabel="Next: your look" />
    </FieldGroup>
  )
}
