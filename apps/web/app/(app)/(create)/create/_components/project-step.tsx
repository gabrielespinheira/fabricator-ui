"use client"

import * as React from "react"
import { ElectronIcon, TauriIcon } from "@fabricator-ui/icons/brands"

import {
  FolderOpenIcon,
  FolderPlusIcon,
  GlobeIcon,
  LayersIcon,
  MonitorIcon,
  SmartphoneIcon,
} from "@/lib/site-icons"
import { Segmented } from "@/components/fabricator/site-settings"
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
  getShellProject,
  isNativeFramework,
  MONOREPO_FRAMEWORKS,
  SETUP_BASES,
  type ProjectKind,
  type SetupChoices,
} from "@/app/(app)/(create)/lib/setup"

import { FRAMEWORK_ICONS } from "./framework-icons"
import {
  AppCheckTile,
  AppChoiceTile,
  ChoiceCard,
  StepFooter,
  StepSection,
} from "./step-parts"

type StepProps = {
  choices: SetupChoices
  onChange: (patch: Partial<SetupChoices>) => void
  /** The phone tab bar follows Mobile: on with it, off without it. */
  onMobileChange: (hasMobile: boolean) => void
  /** Leaving Desktop clears what only a window can use. */
  onDesktopRemoved: () => void
  onNext: () => void
}

function pick<T extends string>(values: readonly T[], value: unknown) {
  return values.find((candidate) => candidate === value)
}

const PROJECTS: readonly ProjectKind[] = ["monorepo", "new", "existing"]
const FRAMEWORK_VALUES = FRAMEWORKS.map(({ value }) => value)
const BASE_VALUES = SETUP_BASES.map(({ value }) => value)
const SINGLE_APPS = ["web", "mobile"] as const

const WEB_TILE = {
  title: "Web",
  description: "In the browser",
  icon: <GlobeIcon />,
}
const MOBILE_TILE = {
  title: "Mobile",
  description: "iOS and Android",
  icon: <SmartphoneIcon />,
}
const DESKTOP_TILE = {
  title: "Desktop",
  description: "A native window",
  icon: <MonitorIcon />,
}

function RuntimeOption({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <span className="flex items-center gap-1.5 px-1 text-[12px] text-foreground/70 in-aria-pressed:text-foreground">
      {icon}
      {label}
    </span>
  )
}

const DESKTOP_RUNTIMES = [
  {
    value: "electron",
    label: "Electron",
    icon: <RuntimeOption icon={<ElectronIcon />} label="Electron" />,
  },
  {
    value: "tauri",
    label: "Tauri",
    icon: <RuntimeOption icon={<TauriIcon />} label="Tauri" />,
  },
] as const

const DESKTOP_RUNTIME_HINTS = {
  electron: "A window around your web app. It ships its own browser.",
  tauri: "A smaller window around your web app. It needs Rust.",
}

type AppsProps = Pick<
  StepProps,
  "choices" | "onChange" | "onMobileChange" | "onDesktopRemoved"
>

/** A monorepo's apps: any mix of the three, as long as there's one. */
function MonorepoApps({
  choices,
  onChange,
  onMobileChange,
  onDesktopRemoved,
}: AppsProps) {
  const { hasWeb, hasMobile, hasDesktop } = getShellProject(choices)
  const isOnlyApp = [hasWeb, hasMobile, hasDesktop].filter(Boolean).length === 1
  // The Expo template stands for a lone mobile app, so a change of apps ends it.
  const framework = isNativeFramework(choices.framework)
    ? "next"
    : choices.framework
  const setApps = (patch: Partial<SetupChoices>) =>
    onChange({ web: hasWeb, mobile: hasMobile, framework, ...patch })

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <AppCheckTile
          {...WEB_TILE}
          checked={hasWeb}
          disabled={hasWeb && isOnlyApp}
          onCheckedChange={(web) => setApps({ web })}
        />
        <AppCheckTile
          {...MOBILE_TILE}
          checked={hasMobile}
          disabled={hasMobile && isOnlyApp}
          onCheckedChange={(mobile) => {
            onMobileChange(mobile)
            setApps({ mobile })
          }}
        />
        <AppCheckTile
          {...DESKTOP_TILE}
          checked={hasDesktop}
          disabled={hasDesktop && isOnlyApp}
          onCheckedChange={(isOn) => {
            if (!isOn) onDesktopRemoved()
            setApps({ desktop: isOn ? "electron" : "none" })
          }}
        />
      </div>
      {choices.desktop === "none" ? null : (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium">Desktop runtime</span>
            <Segmented
              label="Desktop runtime"
              value={choices.desktop}
              options={DESKTOP_RUNTIMES}
              onValueChange={(desktop) => onChange({ desktop })}
            />
          </div>
          <FieldDescription>
            {DESKTOP_RUNTIME_HINTS[choices.desktop]}
          </FieldDescription>
        </div>
      )}
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
    </>
  )
}

/** A single project's app: one or the other. */
function SingleApp({ choices, onChange, onMobileChange }: AppsProps) {
  const { hasMobile } = getShellProject(choices)

  return (
    <RadioGroup
      aria-label="App"
      value={hasMobile ? "mobile" : "web"}
      onValueChange={(value) => {
        const app = pick(SINGLE_APPS, value)
        if (!app) return
        onMobileChange(app === "mobile")
        onChange({
          web: app === "web",
          mobile: app === "mobile",
          ...(isNativeFramework(choices.framework)
            ? { framework: "next" }
            : {}),
        })
      }}
      className="grid grid-cols-2 gap-3"
    >
      <AppChoiceTile {...WEB_TILE} value="web" />
      <AppChoiceTile {...MOBILE_TILE} value="mobile" />
    </RadioGroup>
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
  const isMonorepo = choices.project === "monorepo"
  const { hasWeb, hasMobile, hasDesktop } = getShellProject(choices)
  const needsWebApp = isExisting || hasWeb || hasDesktop
  const frameworks = React.useMemo(
    () =>
      FRAMEWORKS.filter(
        ({ value }) =>
          !isNativeFramework(value) &&
          (!isMonorepo || MONOREPO_FRAMEWORKS.includes(value))
      ),
    [isMonorepo]
  )
  const framework = FRAMEWORKS.find(({ value }) => value === choices.framework)

  const changeProject = (project: ProjectKind) => {
    if (project !== "monorepo" && hasDesktop) onDesktopRemoved()
    if (project === "monorepo") {
      onChange({
        project,
        ...(MONOREPO_FRAMEWORKS.includes(choices.framework) ||
        isNativeFramework(choices.framework)
          ? {}
          : { framework: "next" }),
      })
      return
    }
    // A single project is one app: the website, if it was going to have one.
    const isMobile = project === "new" && !hasWeb && !hasDesktop
    if (hasMobile && !isMobile) onMobileChange(false)
    onChange({
      project,
      web: !isMobile,
      mobile: isMobile,
      desktop: "none",
      ...(isNativeFramework(choices.framework) ? { framework: "next" } : {}),
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
            value="monorepo"
            title="A new monorepo"
            description="Web, mobile and desktop in one place, with room to add more."
            icon={<LayersIcon />}
          />
          <ChoiceCard
            value="new"
            title="A new project"
            description="One app in one folder."
            icon={<FolderPlusIcon />}
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
            title="Apps"
            description={
              isMonorepo
                ? "Pick any mix. Web and desktop share one codebase; mobile has its own React Native components."
                : "A single project is one app. For both, start a monorepo."
            }
          >
            {isMonorepo ? (
              <MonorepoApps
                choices={choices}
                onChange={onChange}
                onMobileChange={onMobileChange}
                onDesktopRemoved={onDesktopRemoved}
              />
            ) : (
              <SingleApp
                choices={choices}
                onChange={onChange}
                onMobileChange={onMobileChange}
                onDesktopRemoved={onDesktopRemoved}
              />
            )}
          </StepSection>

          {needsWebApp ? (
            <StepSection
              title={hasWeb ? "Web framework" : "Framework"}
              description={
                hasWeb
                  ? framework?.description
                  : "What the desktop window renders."
              }
            >
              <RadioGroup
                value={choices.framework}
                onValueChange={(value) => {
                  const next = pick(FRAMEWORK_VALUES, value)
                  if (next) onChange({ framework: next })
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
          ) : null}
        </>
      )}

      {needsWebApp ? (
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
      ) : null}

      <StepFooter onNext={onNext} nextLabel="Next: your look" />
    </FieldGroup>
  )
}
