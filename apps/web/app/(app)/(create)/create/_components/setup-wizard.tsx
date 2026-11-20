"use client"

import * as React from "react"
import {
  getPackageSetupError,
  projectName,
  REACT_PACKAGE,
} from "@fabricator-ui/setup"
import { cn } from "cn"
import { parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs"

import { setSiteSettings, useSiteSettings } from "@/lib/site-settings"
import { LOOK_PARAM_NAMES } from "@/registry/fabricator/look"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Input } from "@/styles/base-fabricator/ui/input"
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
  getPreviewSize,
  playgroundParsers,
  type PlaygroundOptions,
  type ShellProject,
} from "@/app/(view)/app-shell/_lib/options"

import { ExtrasControls } from "./extras-step"
import { InstallStep, SetupSummary } from "./install-step"
import { LookControls } from "./look-step"
import { PlanList } from "./plan-list"
import { ProjectControls } from "./project-step"
import { ProjectTree } from "./project-tree"
import { ShellPreviewFrame } from "./shell-preview-frame"
import { ShellControls } from "./shell-step"
import { StepFooter } from "./step-parts"

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
const SETTINGS_PARAMS = [...LOOK_PARAM_NAMES, "iconLibrary", "spinner"]

/**
 * Opening a share link applies its look and icons to the site settings, so
 * the whole site previews them, then drops them from the address.
 */
function useSettingsFromShareLink() {
  React.useEffect(() => {
    const url = new URL(window.location.href)
    if (!SETTINGS_PARAMS.some((name) => url.searchParams.has(name))) return

    const { look, iconLibrary, spinner } = parseSetupParams(url.searchParams)
    setSiteSettings({
      iconLibrary,
      spinner,
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

function describePreview({ hasWeb, hasDesktop, hasMobile }: ShellProject) {
  if (hasMobile && !hasWeb && !hasDesktop) {
    return "Drawn with the web shell at a phone's size. Your app follows the same options, in React Native."
  }
  return "Sample content. Your project starts with an empty Home."
}

export function SetupWizard({ enablePackage }: { enablePackage: boolean }) {
  const [step, setStep] = useQueryState(
    "step",
    parseAsStringLiteral(STEP_NAMES)
      .withDefault("project")
      .withOptions({ history: "push", scroll: true })
  )
  const [choices, setChoices] = useQueryStates(setupParsers)
  const [shell, setShell] = useQueryStates(playgroundParsers)
  const settings = useSiteSettings()
  useSettingsFromShareLink()
  useOldShareLink()

  const setup: Setup = {
    ...choices,
    shell,
    iconLibrary: settings.iconLibrary,
    spinner: settings.spinner,
    look: {
      surface: settings.surface,
      colors: settings.colors,
      radius: settings.radius,
      motion: settings.motion,
      density: settings.density,
    },
  }

  const project = getShellProject(choices)
  const size = getPreviewSize(project)
  const previewOptions: PlaygroundOptions = {
    ...shell,
    window: size === "macos" ? size : "web",
  }
  const desktop = choices.desktop === "none" ? null : choices.desktop

  const onDesktopRemoved = () => {
    void setShell({
      window: DEFAULT_PLAYGROUND_OPTIONS.window,
      fullscreen: DEFAULT_PLAYGROUND_OPTIONS.fullscreen,
      glass: DEFAULT_PLAYGROUND_OPTIONS.glass,
      ...(shell.tabs === "titlebar" ? { tabs: "main" as const } : {}),
    })
  }

  const isPackage = choices.distribution === "package"
  const packageError = enablePackage
    ? getPackageSetupError(choices)
    : "Package setup is currently unavailable."
  const isInvalid = isPackage && Boolean(packageError)
  const showDistribution =
    isPackage ||
    (enablePackage && (choices.project === "existing" || project.hasWeb))
  const hasShellPreview = step === "look" || step === "shell"
  const hasProjectPreview = step === "project" || step === "extras"
  const projectSetup = toProjectSetup(setup)
  const buttonImport = isPackage
    ? `${REACT_PACKAGE}/button`
    : choices.project === "existing"
      ? "@/components/ui/button"
      : "@workspace/ui/components/button"

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
              showDistribution={showDistribution}
              packageError={packageError}
              onChange={setChoices}
              onMobileChange={(bottomNav) => void setShell({ bottomNav })}
              onDesktopRemoved={onDesktopRemoved}
              onNext={() => setStep("look")}
            />
          </TabsContent>
          <TabsContent value="look">
            <LookControls
              isPackage={isPackage}
              onBack={() => setStep("project")}
              onNext={() => setStep("shell")}
            />
          </TabsContent>
          <TabsContent value="shell">
            {isPackage ? (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] text-muted-foreground">
                  The App Shell starter is available with Copy into project.
                </p>
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => setStep("project")}
                >
                  Change install method
                </Button>
                <StepFooter
                  onBack={() => setStep("look")}
                  onNext={() => setStep("extras")}
                  nextLabel="Next: extras"
                />
              </div>
            ) : (
              <ShellControls
                options={shell}
                onOptionsChange={setShell}
                isIncluded={choices.appShell}
                onIncludedChange={(appShell) => setChoices({ appShell })}
                project={project}
                onBack={() => setStep("look")}
                onNext={() => setStep("extras")}
              />
            )}
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
            {isInvalid ? (
              <div className="flex flex-col items-start gap-4">
                <p role="alert" className="text-[13px] text-muted-foreground">
                  {packageError}
                </p>
                <Button variant="outline" onClick={() => setStep("project")}>
                  Change install method
                </Button>
              </div>
            ) : (
              <SetupSummary
                setup={setup}
                onEdit={setStep}
                showDistribution={enablePackage}
              />
            )}
          </TabsContent>
        </aside>
        <div className="min-w-0 flex-1 lg:sticky lg:top-6">
          {/* Kept mounted past these steps, so coming back doesn't reload it. */}
          {!isPackage ? (
            <section
              aria-label="Preview"
              className={cn(
                "flex flex-col gap-3",
                !hasShellPreview && "hidden"
              )}
            >
              <p className="text-[13px] text-muted-foreground">
                {describePreview(project)}
              </p>
              <ShellPreviewFrame
                options={previewOptions}
                size={size}
                desktop={desktop}
                hasNativeTabBar={project.hasMobile && size === "phone"}
                windowTitle={projectName(projectSetup)}
              />
            </section>
          ) : null}
          {isPackage && step === "look" ? (
            <section
              aria-label="Package component preview"
              className="flex flex-col items-start gap-3 rounded-2xl bg-surface-3 p-5 shadow-surface-1 dark:bg-surface-2 dark:shadow-surface-2"
            >
              <Input
                aria-label="Email address"
                placeholder="Email address"
                className="max-w-xs"
              />
              <Button>Continue</Button>
            </section>
          ) : null}
          {hasProjectPreview && !isInvalid ? (
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
                {showDistribution && step === "project" ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <h3 className="text-[13px] font-medium">
                      Import a component
                    </h3>
                    <code className="rounded-lg bg-code p-3 font-mono text-xs [overflow-wrap:anywhere]">
                      <span className="inline-block">
                        {"import { Button }"}
                      </span>{" "}
                      <span className="inline-block">{`from "${buttonImport}"`}</span>
                    </code>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
          <TabsContent value="install">
            {isInvalid ? null : (
              <InstallStep setup={setup} onBack={() => setStep("extras")} />
            )}
          </TabsContent>
        </div>
      </div>
    </Tabs>
  )
}
