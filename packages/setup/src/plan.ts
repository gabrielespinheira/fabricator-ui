// What a setup does, step by step: the page lists these and the CLI runs them.

import { forPackageManager } from "./cli-args"
import {
  DEFAULT_PROJECT_SETUP,
  EXPO_SDK,
  getAssistantLabel,
  getBaseLabel,
  getFrameworkLabel,
  hasWebApp,
  isWebFramework,
  normalizeProjectSetup,
  projectName,
  type Framework,
  type PackageManager,
  type ProjectSetup,
} from "./setup"

export type StepId =
  | "scaffold-monorepo"
  | "scaffold-web"
  | "scaffold-laravel"
  | "setup-existing"
  | "configure-monorepo"
  | "add-web-items"
  | "scaffold-mobile"
  | "scaffold-desktop"
  | "configure-workspace"
  | "configure-tooling"
  | "install"
  | "setup-mobile"
  | "mount"
  | "agents"
  | "write-project-docs"
  | "format-code"
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
    setup.components === "all" ? "every component" : "the button and spinner",
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

const WRITE_PROJECT_DOCS: PlanStep = {
  id: "write-project-docs",
  title: "Write the project docs",
  detail: "Adds README.md, DESIGN.md and AGENTS.md at the project root.",
}

/** Biome and Vite+ reformat what the templates and the registry wrote. */
function formatSteps(setup: ProjectSetup): PlanStep[] {
  if (setup.tooling === DEFAULT_PROJECT_SETUP.tooling) return []
  const tool = setup.tooling === "biome" ? "Biome" : "Vite+"
  return [
    {
      id: "format-code",
      title: "Format the code",
      detail: `With ${tool}, so the first commit starts clean.`,
    },
  ]
}

const FIRST_COMMIT: PlanStep = {
  id: "first-commit",
  title: "Make the first commit",
  detail: "Everything above, in one commit.",
}

function eslintAdditions(setup: ProjectSetup) {
  if (setup.tooling !== DEFAULT_PROJECT_SETUP.tooling) return []
  return [
    ...(hasWebApp(setup) ? [] : ["Prettier at the root"]),
    ...(hasWebApp(setup) && setup.framework === "react-router"
      ? ["ESLint for the web app and packages/ui"]
      : []),
    ...(setup.mobile ? ["Expo's ESLint config in apps/mobile"] : []),
  ]
}

const SWITCHES = {
  biome: {
    name: "Biome",
    detail:
      "One biome.json lints and formats every app, in place of ESLint and Prettier.",
  },
  "vite-plus": {
    name: "Vite+",
    detail:
      "One vite.config.ts lints, formats and type-checks every app, in place of ESLint and Prettier.",
  },
  runner: {
    name: "Vite+",
    detail: "Vite+ runs the monorepo's tasks, in place of Turborepo.",
  },
}

/** The toolchain's step, when the template doesn't already have it. */
function toolingSteps(setup: ProjectSetup): PlanStep[] {
  const switches = [
    ...(setup.tooling === "eslint-prettier" ? [] : [SWITCHES[setup.tooling]]),
    ...(setup.runner === "vite-plus" ? [SWITCHES.runner] : []),
  ]
  const additions = eslintAdditions(setup)
  if (switches.length === 0 && additions.length === 0) return []
  const names = [...new Set(switches.map(({ name }) => name))]
  const details = [
    ...switches.map(({ detail }) => detail),
    ...(additions.length > 0
      ? [
          `${listLabels(additions)}.`.replace(/^./, (letter) =>
            letter.toUpperCase()
          ),
        ]
      : []),
  ]
  return [
    {
      id: "configure-tooling",
      title:
        names.length > 0
          ? `Switch to ${listLabels(names)}`
          : "Set up ESLint and Prettier",
      detail: details.join(" "),
    },
  ]
}

const SCAFFOLD_MOBILE: PlanStep = {
  id: "scaffold-mobile",
  title: "Add the mobile app",
  detail: `Expo SDK ${EXPO_SDK} with Expo Router, in apps/mobile.`,
}

function setupMobileStep(setup: ProjectSetup): PlanStep {
  return {
    id: "setup-mobile",
    title: "Set up the mobile app",
    detail: `Uniwind, your look and the React Native components${setup.appShell ? ", with the App Shell" : ""}.`,
  }
}

/** A monorepo with only a mobile app: no web app, so no packages/ui. */
function mobileMonorepoSteps(setup: ProjectSetup): PlanStep[] {
  return [
    {
      id: "scaffold-monorepo",
      title: "Create the monorepo",
      detail: "A workspace for your apps, with room to add more.",
    },
    SCAFFOLD_MOBILE,
    {
      id: "configure-workspace",
      title: "Configure the workspace",
      detail: "A script to start the mobile app from the root.",
    },
    ...toolingSteps(setup),
    {
      id: "install",
      title: "Install dependencies",
      detail: "Once, at the root.",
    },
    setupMobileStep(setup),
    ...mountStep(setup),
    ...agentSteps(setup),
    ...formatSteps(setup),
    WRITE_PROJECT_DOCS,
    FIRST_COMMIT,
  ]
}

function monorepoSteps(setup: ProjectSetup): PlanStep[] {
  if (!hasWebApp(setup)) return mobileMonorepoSteps(setup)
  const framework = getFrameworkLabel(setup.framework)
  return [
    {
      id: "scaffold-web",
      title: "Create the monorepo",
      detail: setup.web
        ? `${framework} in apps/web, and the components in packages/ui.`
        : `${framework} in apps/web as the window's UI, and the components in packages/ui.`,
    },
    {
      id: "configure-monorepo",
      title: "Point shared code at packages/ui",
      detail: "Libs and hooks live beside the components that import them.",
    },
    {
      id: "add-web-items",
      title: setup.web ? "Add the web app's components" : "Add the components",
      detail: `Installs ${describeWebItems(setup)}.`,
    },
    ...(setup.mobile ? [SCAFFOLD_MOBILE] : []),
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
    ...toolingSteps(setup),
    {
      id: "install",
      title: "Install dependencies",
      detail: "Once, at the root.",
    },
    ...(setup.mobile ? [setupMobileStep(setup)] : []),
    ...mountStep(setup),
    ...agentSteps(setup),
    ...formatSteps(setup),
    WRITE_PROJECT_DOCS,
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
    WRITE_PROJECT_DOCS,
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
    WRITE_PROJECT_DOCS,
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

export function getExpoBuildCommand(
  packageManager: PackageManager,
  platform: "ios" | "android"
) {
  return `${LOCAL_RUNNERS[packageManager]} expo run:${platform}`
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
      ...(setup.web
        ? [{ label: "Start the web app", code: run("npm run dev") }]
        : []),
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
        code: getExpoBuildCommand(packageManager, "ios"),
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
