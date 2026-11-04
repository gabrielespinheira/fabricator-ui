// The setup page (/create): the choices it asks for, the commands they turn
// into, and the share link that carries them.

import {
  createLoader,
  createSerializer,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs"

import {
  DEFAULT_LOOK,
  lookToSearchParams,
  parseLook,
  type FabricatorLook,
} from "@/registry/fabricator/look"
import { buildAppShellInstallUrl } from "@/app/(view)/app-shell/_lib/app-shell-source"
import {
  playgroundParsers,
  type PlaygroundOptions,
} from "@/app/(view)/app-shell/_lib/options"

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

export type Framework = (typeof FRAMEWORKS)[number]["value"]

export const SETUP_BASES = [
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

export type SetupBase = (typeof SETUP_BASES)[number]["value"]

export const ICON_LIBRARY_NAMES = [
  "fabricator",
  "lucide",
  "tabler",
  "hugeicons",
  "phosphor",
  "remixicon",
] as const

export type IconLibraryName = (typeof ICON_LIBRARY_NAMES)[number]

export function isIconLibraryName(value: unknown): value is IconLibraryName {
  return ICON_LIBRARY_NAMES.some((name) => name === value)
}

/** AI assistants, with their ids in the skills CLI and in `mcp init`. */
export const ASSISTANTS = [
  { value: "claude", label: "Claude Code", agent: "claude-code" },
  { value: "cursor", label: "Cursor", agent: "cursor" },
  { value: "vscode", label: "VS Code (Copilot)", agent: "github-copilot" },
  { value: "codex", label: "Codex", agent: "codex" },
  { value: "opencode", label: "OpenCode", agent: "opencode" },
] as const

export type Assistant = (typeof ASSISTANTS)[number]["value"] | "none"

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

export const DEFAULT_PROJECT_NAME = "my-app"

const FRAMEWORK_VALUES = FRAMEWORKS.map(({ value }) => value)
const BASE_VALUES = SETUP_BASES.map(({ value }) => value)
const ASSISTANT_VALUES: Assistant[] = [
  ...ASSISTANTS.map(({ value }) => value),
  "none",
]

/**
 * The page's choices as URL state (nuqs). The look and the icon library live
 * in the site settings instead, so the whole site previews them; the share
 * link adds them (setupToParams).
 */
export const setupParsers = {
  project: parseAsStringLiteral(["new", "existing"] as const).withDefault(
    "new"
  ),
  framework: parseAsStringLiteral(FRAMEWORK_VALUES).withDefault("next"),
  /** The new project's folder; blank means the default. */
  name: parseAsString.withDefault(""),
  monorepo: parseAsBoolean.withDefault(false),
  base: parseAsStringLiteral(BASE_VALUES).withDefault("base"),
  /** Install the App Shell with the options in `shell`. */
  appShell: parseAsBoolean.withDefault(true),
  /** Install the interface sounds. */
  sound: parseAsBoolean.withDefault(false),
  /** "all" adds every component; "starter" keeps what init installs. */
  components: parseAsStringLiteral(["starter", "all"] as const).withDefault(
    "starter"
  ),
  assistant: parseAsStringLiteral(ASSISTANT_VALUES).withDefault("none"),
  skill: parseAsBoolean.withDefault(true),
  mcp: parseAsBoolean.withDefault(true),
}

export type SetupChoices = inferParserType<typeof setupParsers>

export type Setup = SetupChoices & {
  iconLibrary: IconLibraryName
  look: FabricatorLook
  /** The App Shell's options, URL state of their own. */
  shell: PlaygroundOptions
}

export const DEFAULT_SETUP: Setup = {
  ...createLoader(setupParsers)(new URLSearchParams()),
  iconLibrary: "fabricator",
  look: DEFAULT_LOOK,
  shell: createLoader(playgroundParsers)(new URLSearchParams()),
}

export type SetupCommand = {
  id: string
  title: string
  description: string
  code: string
  language: "bash" | "tsx"
}

export const CLI = "npx fabricator-ui@latest"
const SKILL_SOURCE = "gabrielespinheira/fabricator-ui"

function projectName(setup: Setup) {
  return setup.name.trim() || DEFAULT_PROJECT_NAME
}

/** Laravel has no template: the Laravel installer creates the app. */
function usesTemplate(setup: Setup) {
  return setup.project === "new" && setup.framework !== "laravel"
}

/** Web only: React Native projects have one source, with no base or monorepo. */
export function isNativeFramework(framework: Framework) {
  return framework === "expo"
}

/**
 * The init URL for `-p`, when the setup differs from the CLI's defaults
 * (Base UI, Fabricator's icons, the default look). Mirrors the CLI's own buildInitUrl,
 * which a URL preset replaces.
 */
export function buildInitUrl(setup: Setup, siteUrl: string) {
  const lookParams = lookToSearchParams(setup.look)
  if (
    setup.base === DEFAULT_SETUP.base &&
    setup.iconLibrary === DEFAULT_SETUP.iconLibrary &&
    lookParams.size === 0
  ) {
    return undefined
  }

  const params = new URLSearchParams({ base: setup.base })
  if (usesTemplate(setup)) {
    params.set(
      "template",
      setup.monorepo ? `${setup.framework}-monorepo` : setup.framework
    )
  }
  if (setup.iconLibrary !== DEFAULT_SETUP.iconLibrary) {
    params.set("iconLibrary", setup.iconLibrary)
  }
  for (const [key, value] of lookParams) params.set(key, value)
  return `${siteUrl}/init?${params}`
}

function initCommand(setup: Setup, siteUrl: string) {
  const args = [CLI, "init"]
  if (usesTemplate(setup)) {
    args.push("-t", setup.framework, "-n", projectName(setup))
  }
  if (setup.base !== DEFAULT_SETUP.base) args.push("-b", setup.base)
  if (usesTemplate(setup)) {
    args.push(setup.monorepo ? "--monorepo" : "--no-monorepo")
  }
  const initUrl = buildInitUrl(setup, siteUrl)
  if (initUrl) args.push("-p", `"${initUrl}"`)
  return args.join(" ")
}

const SOUND_EFFECTS_SNIPPET = `import { SoundEffects } from "@/components/sound-effects"

// In your root layout, next to {children}:
<SoundEffects />`

function assistantSteps(setup: Setup): SetupCommand[] {
  const result: SetupCommand[] = []
  const assistant = ASSISTANTS.find(({ value }) => value === setup.assistant)
  if (assistant && setup.skill) {
    result.push({
      id: "skill",
      title: `Teach ${assistant.label} Fabricator UI`,
      description:
        "Installs the agent skill, so your assistant uses the right components and patterns.",
      code: `npx skills add ${SKILL_SOURCE} --skill fabricator --agent ${assistant.agent} --yes`,
      language: "bash",
    })
  }
  if (assistant && setup.mcp) {
    result.push({
      id: "mcp",
      title: `Connect ${assistant.label} to the registry`,
      description:
        "Adds the MCP server, so your assistant can search and install components.",
      code: `${CLI} mcp init --client ${assistant.value}`,
      language: "bash",
    })
  }
  return result
}

const ROOT_LAYOUT_SNIPPET = `import "../global.css"

import { FabricatorRoot } from "@/components/ui/fabricator-root"

// In your root layout, around everything:
<FabricatorRoot>
  <Stack />
</FabricatorRoot>`

/** The look for a React Native init, when it differs from the default. */
function buildNativeInitUrl(setup: Setup, siteUrl: string) {
  const lookParams = lookToSearchParams(setup.look)
  if (lookParams.size === 0) return undefined
  return `${siteUrl}/init?platform=native&${lookParams}`
}

/** Expo has no shadcn template: create-expo-app makes the app, then init runs. */
function expoSteps(setup: Setup, siteUrl: string): SetupCommand[] {
  const isNew = setup.project === "new"
  const name = projectName(setup)
  const initUrl = buildNativeInitUrl(setup, siteUrl)
  const result: SetupCommand[] = []

  if (isNew) {
    result.push(
      {
        id: "create",
        title: "Create the Expo app",
        description: "Creates a new app with Expo Router.",
        code: `npx create-expo-app@latest ${name}`,
        language: "bash",
      },
      {
        id: "cd",
        title: "Open the project folder",
        description: "Run the next commands from here.",
        code: `cd ${name}`,
        language: "bash",
      }
    )
  }

  result.push(
    {
      id: "init",
      title: "Set up Fabricator UI",
      description:
        "Adds Uniwind, the theme and the registry for React Native, and matches packages to your Expo SDK.",
      code: `${CLI} init${initUrl ? ` -p "${initUrl}"` : ""}`,
      language: "bash",
    },
    {
      id: "root",
      title: "Wrap your app",
      description:
        "Sets up gestures, safe areas and where overlays render. Do this once.",
      code: ROOT_LAYOUT_SNIPPET,
      language: "tsx",
    }
  )

  if (setup.components === "all") {
    result.push({
      id: "components",
      title: "Add every component",
      description: "Copies all Fabricator UI components into your project.",
      code: `${CLI} add --all`,
      language: "bash",
    })
  }

  if (setup.sound) {
    result.push(
      {
        id: "sounds",
        title: "Add haptic feedback",
        description: "React Native controls answer with haptics, not sounds.",
        code: `${CLI} add sounds`,
        language: "bash",
      },
      {
        id: "sounds-mount",
        title: "Turn feedback on",
        description: "Wrap your app in it, inside FabricatorRoot.",
        code: `import { SoundEffects } from "@/components/sound-effects"

<SoundEffects>{children}</SoundEffects>`,
        language: "tsx",
      }
    )
  }

  result.push(...assistantSteps(setup), {
    id: "dev",
    title: "Build and run the app",
    description:
      "The first build takes minutes, since native modules were added.",
    code: "npx expo run:ios",
    language: "bash",
  })

  return result
}

function steps(setup: Setup, siteUrl: string): SetupCommand[] {
  if (setup.framework === "expo") return expoSteps(setup, siteUrl)
  const isNew = setup.project === "new"
  const isLaravel = setup.framework === "laravel"
  const name = projectName(setup)
  // A monorepo keeps the app in apps/web; the commands run from its root.
  const appFlag = isNew && setup.monorepo && !isLaravel ? " -c apps/web" : ""
  const result: SetupCommand[] = []

  if (isNew && isLaravel) {
    result.push({
      id: "laravel",
      title: "Create the Laravel app",
      description: "Choose the React starter kit when the installer asks.",
      code: `laravel new ${name}`,
      language: "bash",
    })
  }

  if (isNew && !isLaravel) {
    result.push({
      id: "init",
      title: "Create your project",
      description: `Creates ${name} with your look, your base and the Fabricator button.`,
      code: initCommand(setup, siteUrl),
      language: "bash",
    })
  }

  if (isNew) {
    result.push({
      id: "cd",
      title: "Open the project folder",
      description: "Run the next commands from here.",
      code: `cd ${name}`,
      language: "bash",
    })
  }

  if (!isNew || isLaravel) {
    result.push({
      id: "init",
      title: "Set up Fabricator UI",
      description: isNew
        ? "Choose Yes when it asks to overwrite components.json."
        : "Run it in your project's root. If it finds components.json, choose “Apply the Fabricator theme” to get this look.",
      code: initCommand(setup, siteUrl),
      language: "bash",
    })
  }

  if (setup.components === "all") {
    result.push({
      id: "components",
      title: "Add every component",
      description: "Copies all Fabricator UI components into your project.",
      code: `${CLI} add --all${appFlag}`,
      language: "bash",
    })
  }

  if (setup.appShell) {
    const url = buildAppShellInstallUrl(setup.shell, siteUrl, setup.iconLibrary)
    result.push({
      id: "app-shell",
      title: "Add the App Shell",
      description:
        "Writes components/app-shell-layout.tsx with your choices. Wrap your routes in it and pass it the pathname.",
      code: `${CLI} add app-shell "${url}"${appFlag}`,
      language: "bash",
    })
  }

  if (setup.sound) {
    result.push(
      {
        id: "sounds",
        title: "Add interface sounds",
        description: "The same clicks and ticks you heard in the preview.",
        code: `${CLI} add sounds${appFlag}`,
        language: "bash",
      },
      {
        id: "sounds-mount",
        title: "Turn sounds on",
        description: "Render it once, near the root of your app.",
        code: SOUND_EFFECTS_SNIPPET,
        language: "tsx",
      }
    )
  }

  result.push(...assistantSteps(setup))

  if (isNew) {
    result.push({
      id: "dev",
      title: "Start the dev server",
      description: "Open the address it prints to see your app.",
      code: isLaravel ? "composer run dev" : "npm run dev",
      language: "bash",
    })
  }

  return result
}

/** Rewrites an npm command for another package manager. */
export function forPackageManager(
  code: string,
  packageManager: PackageManager
) {
  if (packageManager === "npm") return code
  if (code.startsWith("npx ")) {
    const runner = {
      pnpm: "pnpm dlx",
      yarn: "yarn dlx",
      bun: "bunx --bun",
    }[packageManager]
    return `${runner} ${code.slice("npx ".length)}`
  }
  if (code.startsWith("npm run ")) {
    return `${packageManager} ${code.slice("npm run ".length)}`
  }
  return code
}

export function buildSetupCommands(
  setup: Setup,
  {
    siteUrl,
    packageManager,
  }: { siteUrl: string; packageManager: PackageManager }
): SetupCommand[] {
  return steps(setup, siteUrl).map((step) =>
    step.language === "bash"
      ? { ...step, code: forPackageManager(step.code, packageManager) }
      : step
  )
}

// --- Share link -------------------------------------------------------------

const serializeChoices = createSerializer(setupParsers)
const loadChoices = createLoader(setupParsers)
const serializeShell = createSerializer(playgroundParsers)
const loadShell = createLoader(playgroundParsers)

/** The setup as URL params; only what differs from the defaults. */
export function setupToParams(setup: Setup) {
  const params = new URLSearchParams(
    serializeChoices({ ...setup, name: setup.name.trim() || null })
  )
  for (const [key, value] of new URLSearchParams(serializeShell(setup.shell))) {
    params.set(key, value)
  }
  if (setup.iconLibrary !== DEFAULT_SETUP.iconLibrary) {
    params.set("iconLibrary", setup.iconLibrary)
  }
  for (const [key, value] of lookToSearchParams(setup.look)) {
    params.set(key, value)
  }
  return params
}

/** Reads a share link; anything unknown keeps its default. */
export function parseSetupParams(params: URLSearchParams): Setup {
  const iconLibrary = params.get("iconLibrary")
  const look = parseLook(params)
  return {
    ...loadChoices(params),
    shell: loadShell(params),
    iconLibrary: isIconLibraryName(iconLibrary)
      ? iconLibrary
      : DEFAULT_SETUP.iconLibrary,
    look: look.success ? look.look : DEFAULT_SETUP.look,
  }
}
