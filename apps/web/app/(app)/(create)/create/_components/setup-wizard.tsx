"use client"

import * as React from "react"
import { parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs"

import { setSiteSettings, useSiteSettings } from "@/lib/site-settings"
import { LOOK_PARAM_NAMES } from "@/registry/fabricator/look"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"
import {
  parseSetupParams,
  setupParsers,
  type Setup,
} from "@/app/(app)/(create)/lib/setup"

import { DashboardPreview } from "./dashboard-preview"
import { ExtrasStep } from "./extras-step"
import { InstallStep } from "./install-step"
import { LookControls } from "./look-step"
import { ProjectStep } from "./project-step"

const STEPS = [
  { value: "look", label: "Look" },
  { value: "project", label: "Project" },
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

export function SetupWizard() {
  const [step, setStep] = useQueryState(
    "step",
    parseAsStringLiteral(STEP_NAMES)
      .withDefault("look")
      .withOptions({ history: "push", scroll: true })
  )
  const [choices, setChoices] = useQueryStates(setupParsers)
  const settings = useSiteSettings()
  useSettingsFromShareLink()

  const setup: Setup = {
    ...choices,
    iconLibrary: settings.iconLibrary,
    look: {
      surface: settings.surface,
      colors: settings.colors,
      radius: settings.radius,
      motion: settings.motion,
      density: settings.density,
    },
  }

  return (
    <Tabs
      value={step}
      onValueChange={(value) => {
        const next = STEP_NAMES.find((name) => name === value)
        if (next) setStep(next)
      }}
      className="flex-1 px-4 pt-8 pb-20 sm:px-5"
    >
      {/* The Tabs root stacks its children; the columns live in here. */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
          <header className="flex flex-col gap-2">
            <h1 className="text-[28px] leading-tight font-medium tracking-[-0.02em]">
              Get started
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Make it yours, tell us about your project, and copy the command
              that installs it. Every step has a sensible default, so skip ahead
              whenever you like.
            </p>
          </header>
          <TabsList aria-label="Setup steps" className="w-full">
            {STEPS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {step === "look" && (
            <LookControls onNext={() => setStep("project")} />
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <TabsContent value="look">
            <h2 className="sr-only">Preview</h2>
            <DashboardPreview />
          </TabsContent>
          <TabsContent value="project">
            <ProjectStep
              choices={choices}
              onChange={setChoices}
              onBack={() => setStep("look")}
              onNext={() => setStep("extras")}
            />
          </TabsContent>
          <TabsContent value="extras">
            <ExtrasStep
              choices={choices}
              onChange={setChoices}
              onBack={() => setStep("project")}
              onNext={() => setStep("install")}
            />
          </TabsContent>
          <TabsContent value="install">
            <InstallStep
              setup={setup}
              onBack={() => setStep("extras")}
              onEdit={setStep}
            />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  )
}
