// The one command a setup turns into.

import {
  DEFAULT_PROJECT_SETUP,
  MONOREPO_FRAMEWORKS,
  normalizeProjectSetup,
  projectName,
  writeKeyValues,
  type PackageManager,
  type ProjectSetup,
} from "./setup"

export const CLI_PACKAGE = "fabricator-ui@latest"

function sharedFlags(setup: ProjectSetup) {
  return [
    ...(setup.spinner === DEFAULT_PROJECT_SETUP.spinner
      ? []
      : ["--spinner", setup.spinner]),
    ...(setup.iconLibrary === DEFAULT_PROJECT_SETUP.iconLibrary
      ? []
      : ["--icons", setup.iconLibrary]),
    ...(Object.keys(setup.look).length > 0
      ? ["--look", writeKeyValues(setup.look)]
      : []),
  ]
}

function assistantFlags(setup: ProjectSetup) {
  if (setup.assistants.length === 0) return []
  return [
    "--agents",
    setup.assistants.join(","),
    ...(setup.skill ? [] : ["--no-skill"]),
    ...(setup.mcp ? [] : ["--no-mcp"]),
  ]
}

function baseFlag(setup: ProjectSetup) {
  return setup.base === DEFAULT_PROJECT_SETUP.base ? [] : ["-b", setup.base]
}

/** An existing project changes only what its flags name. */
function initArgs(setup: ProjectSetup) {
  return [
    "init",
    ...baseFlag(setup),
    ...sharedFlags(setup),
    ...(setup.appShell
      ? Object.keys(setup.shell).length > 0
        ? ["--shell", writeKeyValues(setup.shell)]
        : ["--shell"]
      : []),
    ...(setup.sound ? ["--sounds"] : []),
    ...(setup.components === "all" ? ["--all"] : []),
    ...assistantFlags(setup),
    "--yes",
  ]
}

/** A monorepo with a website is the default, and some templates are never one. */
function appFlags(setup: ProjectSetup) {
  if (setup.project === "new") {
    return MONOREPO_FRAMEWORKS.includes(setup.framework)
      ? ["--no-monorepo"]
      : []
  }
  return [
    ...(setup.web ? [] : ["--no-web"]),
    ...(setup.mobile ? ["--mobile"] : []),
    ...(setup.desktop === "none" ? [] : ["--desktop", setup.desktop]),
  ]
}

function createArgs(setup: ProjectSetup) {
  return [
    "create",
    projectName(setup),
    ...(setup.framework === DEFAULT_PROJECT_SETUP.framework
      ? []
      : ["-t", setup.framework]),
    ...baseFlag(setup),
    ...appFlags(setup),
    ...sharedFlags(setup),
    ...(setup.appShell
      ? Object.keys(setup.shell).length > 0
        ? ["--shell", writeKeyValues(setup.shell)]
        : []
      : ["--no-shell"]),
    ...(setup.sound ? [] : ["--no-sounds"]),
    ...(setup.components === "all" ? ["--all"] : []),
    ...assistantFlags(setup),
    "--yes",
  ]
}

export function toCliArgs(rawSetup: ProjectSetup): string[] {
  const setup = normalizeProjectSetup(rawSetup)
  return setup.project === "existing" ? initArgs(setup) : createArgs(setup)
}

const RUNNERS: Record<PackageManager, string> = {
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
  bun: "bunx --bun",
}

function quoteArg(arg: string) {
  return /^[A-Za-z0-9_./:@+-]+$/.test(arg) ? arg : `"${arg}"`
}

export function formatCommand(args: string[], packageManager: PackageManager) {
  return [RUNNERS[packageManager], CLI_PACKAGE, ...args.map(quoteArg)].join(" ")
}

/** Rewrites an npm command for another package manager. */
export function forPackageManager(
  code: string,
  packageManager: PackageManager
) {
  if (packageManager === "npm") return code
  if (code.startsWith("npx ")) {
    return `${RUNNERS[packageManager]} ${code.slice("npx ".length)}`
  }
  if (code.startsWith("npm run ")) {
    return `${packageManager} ${code.slice("npm run ".length)}`
  }
  return code
}
