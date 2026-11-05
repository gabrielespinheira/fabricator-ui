"use client"

import * as React from "react"
import { projectName } from "@fabricator-ui/setup"
import { cn } from "cn"
import { parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs"

import { setSiteSettings, useSiteSettings } from "@/lib/site-settings"
import { Segmented } from "@/components/fabricator/site-settings"
import { LOOK_PARAM_NAMES } from "@/registry/fabricator/look"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"
import {
  getSetupPlan,
  getShellProject,
  parseSetupParams,
  setupParsers,
  toProjectSetup,
  type Setup,
} from "@/app/(app)/(create)/lib/setup"
import {
  DEFAULT_PLAYGROUND_OPTIONS,
  getPreviewChoices,
  playgroundParsers,
  type PlaygroundOptions,
  type PreviewSize,
} from "@/app/(view)/app-shell/_lib/options"

import { ExtrasControls } from "./extras-step"
import { InstallStep, SetupSummary } from "./install-step"
import { LookControls } from "./look-step"
import { PlanList } from "./plan-list"
import { ProjectControls } from "./project-step"
import { ProjectTree } from "./project-tree"
import { ShellPreviewFrame } from "./shell-preview-frame"
import { ShellControls } from "./shell-step"

const STEPS = [
  { value: "project", label: "Project" },
  { value: "look", label: "Look" },
  { value: "shell", label: "Shell" },
  { value: "extras", label: "Extras" },
  { value: "install", label: "Install" },
] as const

export type StepName = (typeof STEPS)[number]["value"]

const STEP_NAMES = STEPS.map(({ value }) => value)

/** The params a share link carries that live in the site settings. */
const SETTINGS_PARAMS = [...LOOK_PARAM_NAMES, "iconLibrary"]

/**
 * Opening a share link applies its look and icons to the site settings, so
 * the whole site previews them, then drops them from the address.
 */
function useSettingsFromShareLink() {
  React.useEffect(() => {
    const url = new URL(window.location.href)
    if (!SETTINGS_PARAMS.some((name) => url.searchParams.has(name))) return

    const { look, iconLibrary } = parseSetupParams(url.searchParams)
    setSiteSettings({
      iconLibrary,
      surface: look.surface,
      colors: look.colors,
      radius: look.radius,
      motion: look.motion,
      density: look.density,
    })
    for (const name of SETTINGS_PARAMS) url.searchParams.delete(name)
    window.history.replaceState(window.history.state, "", url)
  }, [])
}

/**
 * Old links name `monorepo` and `assistant`, which are `project` and
 * `assistants` now: moves them over once, then drops them from the address.
 */
function useOldShareLink() {
  const [, setChoices] = useQueryStates(setupParsers)
  React.useEffect(() => {
    const url = new URL(window.location.href)
    if (
      !url.searchParams.has("monorepo") &&
      !url.searchParams.has("assistant")
    ) {
      return
    }
    const { project, assistants } = parseSetupParams(url.searchParams)
    url.searchParams.delete("monorepo")
    url.searchParams.delete("assistant")
    window.history.replaceState(window.history.state, "", url)
    void setChoices({ project, assistants })
  }, [setChoices])
}

const previewParsers = {
  preview: parseAsStringLiteral(["browser", "phone"] as const).withDefault(
    "browser"
  ),
}

function getPreviewSize(
  options: PlaygroundOptions,
  preview: "browser" | "phone"
): PreviewSize {
  if (preview === "phone") return "phone"
  return options.window === "web" ? "browser" : options.window
}

export function SetupWizard() {
  const [step, setStep] = useQueryState(
    "step",
    parseAsStringLiteral(STEP_NAMES)
      .withDefault("project")
      .withOptions({ history: "push", scroll: true })
  )
  const [choices, setChoices] = useQueryStates(setupParsers)
  const [shell, setShell] = useQueryStates(playgroundParsers)
  const [{ preview }, setPreview] = useQueryStates(previewParsers)
  const settings = useSiteSettings()
  useSettingsFromShareLink()
  useOldShareLink()

  const setup: Setup = {
    ...choices,
    shell,
    iconLibrary: settings.iconLibrary,
    look: {
      surface: settings.surface,
      colors: settings.colors,
      radius: settings.radius,
      motion: settings.motion,
      density: settings.density,
    },
  }

  const project = getShellProject(choices)
  const previewChoices = getPreviewChoices(project)
  const rawSize = getPreviewSize(shell, preview)
  // A size the project no longer has falls back to the first it does.
  const size = previewChoices.some(({ value }) => value === rawSize)
    ? rawSize
    : (previewChoices[0]?.value ?? "browser")
  const previewOptions: PlaygroundOptions = {
    ...shell,
    window: size === "macos" || size === "windows" ? size : "web",
  }
  const desktop = choices.desktop === "none" ? null : choices.desktop

  const choosePreview = (next: PreviewSize) => {
    void setPreview({ preview: next === "phone" ? "phone" : "browser" })
    void setShell({
      window: next === "macos" || next === "windows" ? next : "web",
    })
  }

  const onDesktopRemoved = () => {
    void setShell({
      window: DEFAULT_PLAYGROUND_OPTIONS.window,
      fullscreen: DEFAULT_PLAYGROUND_OPTIONS.fullscreen,
      glass: DEFAULT_PLAYGROUND_OPTIONS.glass,
      ...(shell.tabs === "titlebar" ? { tabs: "main" as const } : {}),
    })
  }

  const hasShellPreview = step === "look" || step === "shell"
  const hasProjectPreview = step === "project" || step === "extras"
  const projectSetup = toProjectSetup(setup)

  return (
    <Tabs
      value={step}
      onValueChange={(value) => {
        const next = STEP_NAMES.find((name) => name === value)
        if (next) setStep(next)
      }}
      className="flex-1 px-4 pt-8 pb-6 sm:px-5"
    >
      {/* The Tabs root stacks its children; the columns live in here. */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="flex flex-col gap-6 lg:w-96 lg:shrink-0">
          <header className="flex flex-col gap-2">
            <h1 className="text-[28px] leading-tight font-medium tracking-[-0.02em]">
              Get started
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tell us about your project, make it yours, and run one command.
              Every step has a sensible default, so skip to Install whenever you
              like.
            </p>
          </header>
          <TabsList aria-label="Setup steps" className="w-full">
            {STEPS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="project">
            <ProjectControls
              choices={choices}
              onChange={setChoices}
              onMobileChange={(bottomNav) => void setShell({ bottomNav })}
              onDesktopRemoved={onDesktopRemoved}
              onNext={() => setStep("look")}
            />
          </TabsContent>
          <TabsContent value="look">
            <LookControls
              onBack={() => setStep("project")}
              onNext={() => setStep("shell")}
            />
          </TabsContent>
          <TabsContent value="shell">
            <ShellControls
              options={shell}
              onOptionsChange={setShell}
              isIncluded={choices.appShell}
              onIncludedChange={(appShell) => setChoices({ appShell })}
              project={project}
              onBack={() => setStep("look")}
              onNext={() => setStep("extras")}
            />
          </TabsContent>
          <TabsContent value="extras">
            <ExtrasControls
              choices={choices}
              onChange={setChoices}
              onBack={() => setStep("shell")}
              onNext={() => setStep("install")}
            />
          </TabsContent>
          <TabsContent value="install">
            <SetupSummary setup={setup} onEdit={setStep} />
          </TabsContent>
        </aside>
        <div className="min-w-0 flex-1 lg:sticky lg:top-6">
          {/* Kept mounted past these steps, so coming back doesn't reload it. */}
          <section
            aria-label="Preview"
            className={cn("flex flex-col gap-3", !hasShellPreview && "hidden")}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-muted-foreground">
                {size === "phone"
                  ? project.hasMobile
                    ? "Drawn with the web shell at phone width. Your mobile app follows the same options, in React Native."
                    : "The same shell at a phone's width."
                  : "Sample content. Your project starts with an empty Home."}
              </p>
              {previewChoices.length > 1 ? (
                <Segmented
                  label="Preview size"
                  value={size}
                  options={previewChoices}
                  onValueChange={choosePreview}
                />
              ) : null}
            </div>
            <ShellPreviewFrame
              options={previewOptions}
              size={size}
              desktop={desktop}
              windowTitle={projectName(projectSetup)}
            />
          </section>
          {hasProjectPreview ? (
            <div className="flex flex-col gap-4">
              <ProjectTree setup={projectSetup} />
              <section
                aria-label="What the command does"
                className="rounded-2xl bg-surface-3 p-5 shadow-surface-1 dark:bg-surface-2 dark:shadow-surface-2"
              >
                <h2 className="pb-4 text-[13px] font-medium text-muted-foreground">
                  What the command does
                </h2>
                <PlanList steps={getSetupPlan(setup)} />
              </section>
            </div>
          ) : null}
          <TabsContent value="install">
            <InstallStep setup={setup} onBack={() => setStep("extras")} />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  )
}
