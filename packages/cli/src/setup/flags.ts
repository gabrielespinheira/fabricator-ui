// `create` and `init`'s flags, as a setup. The site writes them with toCliArgs,
// and a test parses what it writes.

import {
  ASSISTANT_VALUES,
  DEFAULT_PROJECT_SETUP,
  parseKeyValues,
  projectSetupSchema,
  SPINNER_VALUES,
  type ProjectSetup,
} from "@fabricator-ui/setup"
import type { Command } from "commander"

export type SetupFlags = {
  template?: string
  base?: string
  monorepo?: boolean
  web?: boolean
  mobile?: boolean
  desktop?: string
  look?: string
  shell?: string | boolean
  spinner?: string
  icons?: string
  sounds?: boolean
  all?: boolean
  agents?: string
  skill?: boolean
  mcp?: boolean
}

export function addSetupOptions(command: Command) {
  return command
    .option(
      "--look <values>",
      "your look, as key=value pairs: primary=260_0.2,shape=pill"
    )
    .option("--shell [options]", "the App Shell, with key=value options")
    .option("--no-shell", "skip the App Shell")
    .option(
      "--spinner <variant>",
      `default spinner: ${SPINNER_VALUES.join(", ")}`
    )
    .option("--icons <library>", "an icon library other than Fabricator's")
    .option("--sounds", "add the interface sounds")
    .option("--no-sounds", "skip the interface sounds")
    .option("--all", "add every component")
    .option(
      "--agents <assistants>",
      `AI assistants, comma-separated: ${ASSISTANT_VALUES.join(", ")}`
    )
    .option("--no-skill", "don't install the agent skill for --agents")
    .option("--no-mcp", "don't configure the MCP server for --agents")
}

function parseAssistants(value: string | undefined) {
  return value ? value.split(",").filter(Boolean) : []
}

function shellOptions(shell: SetupFlags["shell"]) {
  return typeof shell === "string" ? parseKeyValues(shell) : {}
}

function commonFields(flags: SetupFlags) {
  return {
    look: flags.look ? parseKeyValues(flags.look) : {},
    shell: shellOptions(flags.shell),
    assistants: parseAssistants(flags.agents),
    skill: flags.skill ?? true,
    mcp: flags.mcp ?? true,
    components: flags.all ? "all" : "starter",
    spinner: flags.spinner ?? DEFAULT_PROJECT_SETUP.spinner,
    iconLibrary: flags.icons ?? DEFAULT_PROJECT_SETUP.iconLibrary,
    base: flags.base ?? DEFAULT_PROJECT_SETUP.base,
  }
}

/** A monorepo, unless told otherwise or the template can't be one. */
function getCreateProject({ monorepo, template, mobile, desktop }: SetupFlags) {
  if (monorepo !== undefined) return monorepo ? "monorepo" : "new"
  return template === "laravel" && !mobile && !desktop ? "new" : "monorepo"
}

/** Everything is on unless a flag says otherwise. */
export function setupFromCreateFlags(
  name: string | undefined,
  flags: SetupFlags
): ProjectSetup {
  return projectSetupSchema.parse({
    ...DEFAULT_PROJECT_SETUP,
    ...commonFields(flags),
    project: getCreateProject(flags),
    name: name ?? "",
    framework: flags.template ?? DEFAULT_PROJECT_SETUP.framework,
    web: flags.web ?? true,
    mobile: flags.mobile ?? false,
    desktop: flags.desktop ?? "none",
    appShell: flags.shell !== false,
    sound: flags.sounds ?? true,
  })
}

/** An existing project changes only what its flags name. */
export function setupFromInitFlags(flags: SetupFlags): ProjectSetup {
  return projectSetupSchema.parse({
    ...DEFAULT_PROJECT_SETUP,
    ...commonFields(flags),
    project: "existing",
    appShell: flags.shell !== undefined && flags.shell !== false,
    sound: flags.sounds === true,
  })
}

/** Whether `init` was asked to do more than set up the registry. */
export function hasSetupFlags(flags: SetupFlags) {
  return Boolean(
    flags.look ||
      flags.shell ||
      flags.sounds ||
      flags.all ||
      flags.agents ||
      flags.icons ||
      flags.spinner
  )
}
