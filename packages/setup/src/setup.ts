// One project setup, chosen on /create or through the CLI's flags. The site
// shows what it will do and the CLI does it; neither keeps a copy of the rules.

import { z } from "zod"

export const FRAMEWORKS = [
  {
    value: "next",
    label: "Next.js",
    description: "Full-stack React apps and sites.",
  },
  { value: "vite", label: "Vite", description: "Fast single-page apps." },
  {
    value: "start",
    label: "TanStack Start",
    description: "Full-stack React on TanStack Router.",
  },
  {
    value: "react-router",
    label: "React Router",
    description: "Full-stack React in framework mode.",
  },
  {
    value: "astro",
    label: "Astro",
    description: "Content sites with React islands.",
  },
  {
    value: "laravel",
    label: "Laravel",
    description: "PHP apps with Inertia and React.",
  },
  {
    value: "expo",
    label: "Expo",
    description: "iOS and Android apps with React Native.",
  },
] as const

export const FRAMEWORK_VALUES = [
  "next",
  "vite",
  "start",
  "react-router",
  "astro",
  "laravel",
  "expo",
] as const
export type Framework = (typeof FRAMEWORK_VALUES)[number]

/** The frameworks a monorepo's web app can use: each has a monorepo template. */
export const MONOREPO_FRAMEWORKS: readonly Framework[] = [
  "next",
  "vite",
  "start",
  "react-router",
  "astro",
]

export const BASE_VALUES = ["base", "radix", "aria"] as const
export type Base = (typeof BASE_VALUES)[number]

export const BASES = [
  {
    value: "base",
    label: "Base UI",
    description: "Recommended. Not sure? Keep this one.",
  },
  {
    value: "radix",
    label: "Radix",
    description: "For projects that already use Radix UI.",
  },
  {
    value: "aria",
    label: "React Aria",
    description: "Adobe's primitives, with the deepest accessibility.",
  },
] as const

export const ICON_LIBRARY_VALUES = [
  "fabricator",
  "lucide",
  "tabler",
  "hugeicons",
  "phosphor",
  "remixicon",
] as const
export type IconLibrary = (typeof ICON_LIBRARY_VALUES)[number]

export const SPINNER_VALUES = [
  "orbit",
  "ripple",
  "cascade",
  "wave",
  "pulse",
  "braid",
  "ring",
  "comet",
  "bounce",
  "equalizer",
  "flip",
  "scan",
  "quad-swap",
  "quad-fold",
  "tic-tac",
  "bloom",
  "checker",
  "diagonal",
  "triangle",
  "square",
  "rings",
  "hex",
] as const
export type SpinnerVariant = (typeof SPINNER_VALUES)[number]

export const ASSISTANT_VALUES = [
  "claude",
  "cursor",
  "vscode",
  "codex",
  "opencode",
] as const
export type Assistant = (typeof ASSISTANT_VALUES)[number]

export const ASSISTANTS = [
  { value: "claude", label: "Claude Code" },
  { value: "cursor", label: "Cursor" },
  { value: "vscode", label: "GitHub Copilot" },
  { value: "codex", label: "Codex" },
  { value: "opencode", label: "OpenCode" },
] as const

export const PROJECT_KINDS = ["new", "monorepo", "existing"] as const
export type ProjectKind = (typeof PROJECT_KINDS)[number]

export const DESKTOP_RUNTIME_VALUES = ["none", "electron", "tauri"] as const
export type DesktopRuntime = (typeof DESKTOP_RUNTIME_VALUES)[number]

export const DESKTOP_RUNTIMES = [
  { value: "electron", label: "Electron" },
  { value: "tauri", label: "Tauri" },
] as const

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

export const DEFAULT_PROJECT_NAME = "my-app"

/** The Expo SDK the native registry is tested on. */
export const EXPO_SDK = 58

export const projectSetupSchema = z.object({
  project: z.enum(PROJECT_KINDS),
  name: z.string(),
  framework: z.enum(FRAMEWORK_VALUES),
  base: z.enum(BASE_VALUES),
  /** A website. Without one, a desktop app's web app is only its window's UI. */
  web: z.boolean(),
  mobile: z.boolean(),
  desktop: z.enum(DESKTOP_RUNTIME_VALUES),
  appShell: z.boolean(),
  /** The App Shell's options that differ from the defaults, as URL params. */
  shell: z.record(z.string(), z.string()),
  sound: z.boolean(),
  components: z.enum(["starter", "all"]),
  assistants: z.array(z.enum(ASSISTANT_VALUES)),
  skill: z.boolean(),
  mcp: z.boolean(),
  iconLibrary: z.enum(ICON_LIBRARY_VALUES),
  spinner: z.enum(SPINNER_VALUES).default("orbit"),
  /** The look's values that differ from the defaults, as URL params. */
  look: z.record(z.string(), z.string()),
})

export type ProjectSetup = z.infer<typeof projectSetupSchema>

export const DEFAULT_PROJECT_SETUP: ProjectSetup = {
  project: "monorepo",
  name: "",
  framework: "next",
  base: "base",
  web: true,
  mobile: false,
  desktop: "none",
  appShell: true,
  shell: {},
  sound: true,
  components: "starter",
  assistants: [],
  skill: true,
  mcp: true,
  iconLibrary: "fabricator",
  spinner: "orbit",
  look: {},
}

export function isWebFramework(framework: Framework) {
  return framework !== "expo"
}

export function projectName(setup: Pick<ProjectSetup, "name">) {
  return setup.name.trim() || DEFAULT_PROJECT_NAME
}

export function getFrameworkLabel(framework: Framework) {
  return FRAMEWORKS.find(({ value }) => value === framework)?.label ?? framework
}

export function getBaseLabel(base: Base) {
  return BASES.find(({ value }) => value === base)?.label ?? base
}

export function getAssistantLabel(assistant: Assistant) {
  return ASSISTANTS.find(({ value }) => value === assistant)?.label ?? assistant
}

function normalizeShell(
  shell: ProjectSetup["shell"],
  hasDesktop: boolean
): ProjectSetup["shell"] {
  // `window` and `fullscreen` only choose what the preview draws.
  const { window: _window, fullscreen: _fullscreen, ...rest } = shell
  if (hasDesktop) return rest
  const { glass: _glass, ...withoutGlass } = rest
  return withoutGlass.tabs === "titlebar"
    ? { ...withoutGlass, tabs: "main" }
    : withoutGlass
}

export type AppChoices = Pick<
  ProjectSetup,
  "project" | "framework" | "web" | "mobile" | "desktop"
>

const EXPO_ONLY: AppChoices = {
  project: "new",
  framework: "expo",
  web: false,
  mobile: false,
  desktop: "none",
}

/**
 * What a project's choices of apps come to. A mobile app alone is a plain Expo
 * project: nothing else would use a monorepo around it. A desktop app alone
 * keeps its monorepo, because its window renders the web app in it.
 */
export function resolveApps(choices: AppChoices): AppChoices {
  if (choices.project === "existing") {
    return { ...choices, web: true, mobile: false, desktop: "none" }
  }
  const isExpo = choices.framework === "expo"
  const web = choices.web && !isExpo
  const mobile = choices.mobile || isExpo
  const framework = isExpo ? DEFAULT_PROJECT_SETUP.framework : choices.framework
  if (choices.project === "new") {
    if (mobile) return EXPO_ONLY
    return { project: "new", framework, web: true, mobile, desktop: "none" }
  }
  const { desktop } = choices
  if (mobile && !web && desktop === "none") return EXPO_ONLY
  return {
    project: "monorepo",
    framework: MONOREPO_FRAMEWORKS.includes(framework)
      ? framework
      : DEFAULT_PROJECT_SETUP.framework,
    web: web || (!mobile && desktop === "none"),
    mobile,
    desktop,
  }
}

/** Removes the states no project can be in, so the page and the command agree. */
export function normalizeProjectSetup(setup: ProjectSetup): ProjectSetup {
  const apps = resolveApps(setup)
  return {
    ...setup,
    ...apps,
    base: isWebFramework(apps.framework)
      ? setup.base
      : DEFAULT_PROJECT_SETUP.base,
    shell: normalizeShell(setup.shell, apps.desktop !== "none"),
    assistants: ASSISTANT_VALUES.filter((assistant) =>
      setup.assistants.includes(assistant)
    ),
  }
}

/** `{ primary: "260_0.2" }` → `primary=260_0.2`, the format of `--look`. */
export function writeKeyValues(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join(",")
}

export function parseKeyValues(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const pair of text.split(",")) {
    if (!pair) continue
    const [key, value, ...rest] = pair.split("=")
    if (!key || value === undefined || rest.length > 0) {
      throw new Error(`Expected key=value, got "${pair}".`)
    }
    values[key] = value
  }
  return values
}
