// The setup page (/create): its choices as URL state, and the shared setup they
// turn into. What a setup does and the command that does it are in
// @fabricator-ui/setup, which the CLI runs.

import {
  ASSISTANT_VALUES,
  BASE_VALUES,
  BASES,
  CLI_PACKAGE,
  DEFAULT_PROJECT_SETUP,
  DESKTOP_RUNTIME_VALUES,
  formatCommand,
  FRAMEWORK_VALUES,
  ICON_LIBRARY_VALUES,
  planSetup,
  PROJECT_KINDS,
  resolveApps,
  toCliArgs,
  type AppChoices,
  type Framework,
  type IconLibrary,
  type PackageManager,
  type ProjectSetup,
} from "@fabricator-ui/setup"
import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
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
import { normalizeInstallOptions } from "@/app/(view)/app-shell/_lib/app-shell-source"
import {
  playgroundParsers,
  type PlaygroundOptions,
  type ShellProject,
} from "@/app/(view)/app-shell/_lib/options"

export {
  ASSISTANTS,
  DEFAULT_PROJECT_NAME,
  DESKTOP_RUNTIMES,
  forPackageManager,
  FRAMEWORKS,
  MONOREPO_FRAMEWORKS,
  PACKAGE_MANAGERS,
  resolveApps,
  type Assistant,
  type DesktopRuntime,
  type Framework,
  type PackageManager,
  type ProjectKind,
} from "@fabricator-ui/setup"

export const SETUP_BASES = BASES
export const ICON_LIBRARY_NAMES = ICON_LIBRARY_VALUES
export type IconLibraryName = IconLibrary

export function isIconLibraryName(value: unknown): value is IconLibraryName {
  return ICON_LIBRARY_NAMES.some((name) => name === value)
}

export const CLI = "npx fabricator-ui@latest"

/**
 * The page's choices as URL state (nuqs). The look and the icon library live
 * in the site settings instead, so the whole site previews them; the share
 * link adds them (setupToParams).
 */
export const setupParsers = {
  project: parseAsStringLiteral(PROJECT_KINDS).withDefault("monorepo"),
  framework: parseAsStringLiteral(FRAMEWORK_VALUES).withDefault("next"),
  /** The new project's folder; blank means the default. */
  name: parseAsString.withDefault(""),
  /** The apps to make. A single project is one of web or mobile. */
  web: parseAsBoolean.withDefault(true),
  mobile: parseAsBoolean.withDefault(false),
  desktop: parseAsStringLiteral(DESKTOP_RUNTIME_VALUES).withDefault("none"),
  base: parseAsStringLiteral(BASE_VALUES).withDefault("base"),
  /** Install the App Shell with the options in `shell`. */
  appShell: parseAsBoolean.withDefault(true),
  /** Install the interface sounds. */
  sound: parseAsBoolean.withDefault(true),
  /** "all" adds every component; "starter" keeps what the setup installs. */
  components: parseAsStringLiteral(["starter", "all"] as const).withDefault(
    "starter"
  ),
  assistants: parseAsArrayOf(
    parseAsStringLiteral(ASSISTANT_VALUES)
  ).withDefault([]),
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

const serializeChoices = createSerializer(setupParsers)
const loadChoices = createLoader(setupParsers)
const serializeShell = createSerializer(playgroundParsers)
const loadShell = createLoader(playgroundParsers)

/** Web only: React Native projects have one source, with no base. */
export function isNativeFramework(framework: Framework) {
  return framework === "expo"
}

/** The apps a setup makes, which the App Shell step's options are for. */
export function getShellProject(setup: AppChoices): ShellProject {
  const { project, framework, web, mobile, desktop } = resolveApps(setup)
  return {
    hasWeb: web,
    hasMobile: mobile || (project === "new" && isNativeFramework(framework)),
    hasDesktop: desktop !== "none",
  }
}

function paramsToRecord(params: URLSearchParams) {
  return Object.fromEntries(params)
}

/** The setup the command and the plan are written from. */
export function toProjectSetup(setup: Setup): ProjectSetup {
  const target =
    setup.project === "monorepo" && setup.desktop !== "none"
      ? { desktop: setup.desktop }
      : {}
  return {
    ...DEFAULT_PROJECT_SETUP,
    project: setup.project,
    name: setup.name,
    framework: setup.framework,
    base: setup.base,
    web: setup.web,
    mobile: setup.mobile,
    desktop: setup.desktop,
    appShell: setup.appShell,
    sound: setup.sound,
    components: setup.components,
    assistants: setup.assistants,
    skill: setup.skill,
    mcp: setup.mcp,
    iconLibrary: setup.iconLibrary,
    look: paramsToRecord(lookToSearchParams(setup.look)),
    shell: paramsToRecord(
      new URLSearchParams(
        serializeShell(normalizeInstallOptions(setup.shell, target))
      )
    ),
  }
}

/** The one command a setup turns into. */
export function buildSetupCommand(
  setup: Setup,
  packageManager: PackageManager
) {
  return formatCommand(toCliArgs(toProjectSetup(setup)), packageManager)
}

/** The command, then each flag with its value: where a long command can wrap. */
export function getCommandParts(command: string) {
  const parts = command.split(/ (?=--?[a-z])/)
  const cliIndex = parts.findIndex((part) => part.includes(CLI_PACKAGE))
  return [parts.slice(0, cliIndex + 1).join(" "), ...parts.slice(cliIndex + 1)]
}

export function getSetupPlan(setup: Setup) {
  return planSetup(toProjectSetup(setup))
}

// --- Share link -------------------------------------------------------------

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

/** Links from before `monorepo` became a starting point and assistants a list. */
function migrateOldParams(params: URLSearchParams) {
  const next = new URLSearchParams(params)
  if (next.get("monorepo") === "true" && !next.has("project")) {
    next.set("project", "monorepo")
  }
  const assistant = next.get("assistant")
  if (assistant && assistant !== "none" && !next.has("assistants")) {
    next.set("assistants", assistant)
  }
  return next
}

/** Reads a share link; anything unknown keeps its default. */
export function parseSetupParams(rawParams: URLSearchParams): Setup {
  const params = migrateOldParams(rawParams)
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
