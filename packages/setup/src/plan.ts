// What a setup does, step by step: the page lists these and the CLI runs them.

import { forPackageManager } from "./cli-args"
import {
  EXPO_SDK,
  getAssistantLabel,
  getBaseLabel,
  getFrameworkLabel,
  isWebFramework,
  normalizeProjectSetup,
  projectName,
  type Framework,
  type PackageManager,
  type ProjectSetup,
} from "./setup"

export type StepId =
  | "scaffold-web"
  | "scaffold-laravel"
  | "setup-existing"
  | "configure-monorepo"
  | "add-web-items"
  | "scaffold-mobile"
  | "scaffold-desktop"
  | "configure-workspace"
  | "install"
  | "setup-mobile"
  | "mount"
  | "agents"
  | "first-commit"

export type PlanStep = { id: StepId; title: string; detail: string }

function listLabels(labels: string[]) {
  if (labels.length <= 1) return labels.join("")
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
}

/** The web items a setup installs, for the steps' descriptions. */
function describeWebItems(setup: ProjectSetup) {
  return listLabels([
    "your look",
    ...(setup.appShell ? ["the App Shell"] : []),
    ...(setup.sound ? ["interface sounds"] : []),
    setup.components === "all" ? "every component" : "the button",
  ])
}

function needsMount(setup: ProjectSetup) {
  return (
    !isWebFramework(setup.framework) ||
    setup.mobile ||
    setup.appShell ||
    setup.sound
  )
}

function mountStep(setup: ProjectSetup): PlanStep[] {
  if (!needsMount(setup)) return []
  const parts = [
    ...(setup.appShell ? ["the App Shell"] : []),
    ...(setup.sound ? ["interface sounds"] : []),
  ]
  return [
    {
      id: "mount",
      title: "Wire everything into your app",
      detail:
        parts.length > 0
          ? `Adds ${listLabels(parts)} to your root layout, so you edit no files by hand.`
          : "Wraps your root layout in what the components need.",
    },
  ]
}

function agentSteps(setup: ProjectSetup): PlanStep[] {
  if (setup.assistants.length === 0 || (!setup.skill && !setup.mcp)) return []
  const parts = [
    ...(setup.skill ? ["the agent skill"] : []),
    ...(setup.mcp ? ["the MCP server"] : []),
  ]
  return [
    {
      id: "agents",
      title: `Set up ${listLabels(setup.assistants.map(getAssistantLabel))}`,
      detail: `Adds ${listLabels(parts)}, so your assistant knows the components and can install them.`,
    },
  ]
}

const FIRST_COMMIT: PlanStep = {
  id: "first-commit",
  title: "Make the first commit",
  detail: "Everything above, in one commit.",
}

function monorepoSteps(setup: ProjectSetup): PlanStep[] {
  const framework = getFrameworkLabel(setup.framework)
  return [
    {
      id: "scaffold-web",
      title: "Create the monorepo",
      detail: `${framework} in apps/web, and the components in packages/ui.`,
    },
    {
      id: "configure-monorepo",
      title: "Point shared code at packages/ui",
      detail: "Libs and hooks live beside the components that import them.",
    },
    {
      id: "add-web-items",
      title: "Add the web app's components",
      detail: `Installs ${describeWebItems(setup)}.`,
    },
    ...(setup.mobile
      ? [
          {
            id: "scaffold-mobile" as const,
            title: "Add the mobile app",
            detail: `Expo SDK ${EXPO_SDK} with Expo Router, in apps/mobile.`,
          },
        ]
      : []),
    ...(setup.desktop === "none"
      ? []
      : [
          {
            id: "scaffold-desktop" as const,
            title: `Add the ${setup.desktop === "tauri" ? "Tauri" : "Electron"} desktop app`,
            detail: "A window around apps/web, in apps/desktop.",
          },
        ]),
    {
      id: "configure-workspace",
      title: "Configure the workspace",
      detail: "One script per app, and the versions the apps must share.",
    },
    {
      id: "install",
      title: "Install dependencies",
      detail: "Once, at the root.",
    },
    ...(setup.mobile
      ? [
          {
            id: "setup-mobile" as const,
            title: "Set up the mobile app",
            detail: `Uniwind, your look and the React Native components${setup.appShell ? ", with the App Shell" : ""}.`,
          },
        ]
      : []),
    ...mountStep(setup),
    ...agentSteps(setup),
    FIRST_COMMIT,
  ]
}

function expoSteps(setup: ProjectSetup): PlanStep[] {
  return [
    {
      id: "scaffold-mobile",
      title: "Create the Expo app",
      detail: `Expo SDK ${EXPO_SDK} with Expo Router.`,
    },
    {
      id: "setup-mobile",
      title: "Set up Fabricator UI",
      detail: `Uniwind, your look and the React Native components${setup.appShell ? ", with the App Shell" : ""}.`,
    },
    ...mountStep(setup),
    ...agentSteps(setup),
    FIRST_COMMIT,
  ]
}

function existingSteps(setup: ProjectSetup): PlanStep[] {
  return [
    {
      id: "setup-existing",
      title: "Set up Fabricator UI in your project",
      detail:
        Object.keys(setup.look).length > 0
          ? `Applies your look and installs ${describeWebItems(setup)}. Commit your work first.`
          : "Adds the registry, and installs what you chose. Your theme stays as it is.",
    },
    ...(setup.appShell || setup.sound ? mountStep(setup) : []),
    ...agentSteps(setup),
  ]
}

function webSteps(setup: ProjectSetup): PlanStep[] {
  const isLaravel = setup.framework === "laravel"
  return [
    {
      id: isLaravel ? "scaffold-laravel" : "scaffold-web",
      title: `Create the ${getFrameworkLabel(setup.framework)} project`,
      detail: `With ${getBaseLabel(setup.base)}, ${describeWebItems(setup)}.`,
    },
    ...mountStep(setup),
    ...agentSteps(setup),
    FIRST_COMMIT,
  ]
}

export function planSetup(rawSetup: ProjectSetup): PlanStep[] {
  const setup = normalizeProjectSetup(rawSetup)
  if (setup.project === "existing") return existingSteps(setup)
  if (setup.project === "monorepo") return monorepoSteps(setup)
  return isWebFramework(setup.framework) ? webSteps(setup) : expoSteps(setup)
}

export type NextStep = { label: string; code: string }

/** Unlike dlx, these run a package the project already has. */
const LOCAL_RUNNERS: Record<PackageManager, string> = {
  npm: "npx",
  pnpm: "pnpm exec",
  yarn: "yarn",
  bun: "bunx --bun",
}

export function getNextSteps(
  rawSetup: ProjectSetup,
  packageManager: PackageManager
): NextStep[] {
  const setup = normalizeProjectSetup(rawSetup)
  if (setup.project === "existing") return []
  const run = (code: string) => forPackageManager(code, packageManager)
  const open = { label: "Open the project", code: `cd ${projectName(setup)}` }

  if (setup.project === "monorepo") {
    return [
      open,
      { label: "Start the web app", code: run("npm run dev") },
      ...(setup.mobile
        ? [{ label: "Start the mobile app", code: run("npm run dev:mobile") }]
        : []),
      ...(setup.desktop === "none"
        ? []
        : [
            { label: "Open the desktop app", code: run("npm run dev:desktop") },
          ]),
    ]
  }
  if (!isWebFramework(setup.framework)) {
    return [
      open,
      {
        label: "Build and run the app",
        code: `${LOCAL_RUNNERS[packageManager]} expo run:ios`,
      },
    ]
  }
  return [
    open,
    {
      label: "Start the app",
      code:
        setup.framework === "laravel" ? "composer run dev" : run("npm run dev"),
    },
  ]
}

const DARK_MODE_GUIDES: Partial<Record<Framework, string>> = {
  next: "/docs/dark-mode/next",
  vite: "/docs/dark-mode/vite",
  start: "/docs/dark-mode/tanstack-start",
  astro: "/docs/dark-mode/astro",
}

/** The docs page for adding a theme toggle to this setup. */
export function getDarkModeGuide(rawSetup: ProjectSetup) {
  const setup = normalizeProjectSetup(rawSetup)
  const guide =
    setup.project === "existing" ? undefined : DARK_MODE_GUIDES[setup.framework]
  return guide ?? "/docs/dark-mode"
}

export type Prerequisite = {
  id: "rust" | "native-build" | "laravel"
  title: string
  detail: string
  href: string
}

export function getPrerequisites(rawSetup: ProjectSetup): Prerequisite[] {
  const setup = normalizeProjectSetup(rawSetup)
  if (setup.project === "existing") return []
  return [
    ...(setup.framework === "laravel"
      ? [
          {
            id: "laravel" as const,
            title: "The Laravel installer",
            detail:
              "It creates the app. The CLI stops before writing anything without it.",
            href: "https://laravel.com/docs/installation",
          },
        ]
      : []),
    ...(setup.desktop === "tauri"
      ? [
          {
            id: "rust" as const,
            title: "Rust",
            detail:
              "Tauri compiles with it. The project is created either way.",
            href: "https://www.rust-lang.org/tools/install",
          },
        ]
      : []),
    ...(setup.mobile || !isWebFramework(setup.framework)
      ? [
          {
            id: "native-build" as const,
            title: "Xcode or Android Studio",
            detail: "To build the app for a simulator or a device.",
            href: "https://docs.expo.dev/get-started/set-up-your-environment/",
          },
        ]
      : []),
  ]
}
