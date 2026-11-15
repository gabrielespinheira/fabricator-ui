"use client"

import * as React from "react"
import { ElectronIcon, ReactIcon, TauriIcon } from "@fabricator-ui/icons/brands"

import {
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
  STARTING_POINTS,
  type SetupChoices,
} from "@/app/(app)/(create)/lib/setup"

import { FRAMEWORK_ICONS } from "./framework-icons"
import { CardIcon, ChoiceTile, StepFooter, StepSection } from "./step-parts"

type StepProps = {
  choices: SetupChoices
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
      {!hasWeb && !hasDesktop ? (
        <FieldDescription>
          On its own, a mobile app is a plain Expo project, with no monorepo
          around it.
        </FieldDescription>
      ) : null}
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
  onChange,
  onMobileChange,
  onDesktopRemoved,
  onNext,
}: StepProps) {
  const isExisting = choices.project === "existing"
  const { hasMobile, hasDesktop } = getShellProject(choices)

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
        </>
      )}

      <StepFooter onNext={onNext} nextLabel="Next: your look" />
    </FieldGroup>
  )
}
