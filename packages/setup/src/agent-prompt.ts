// The setup as a prompt for an AI agent: the page's command, and what a person
// would otherwise do after it.

import {
  CLI_PACKAGE,
  formatCommand,
  forPackageManager,
  toCliArgs,
} from "./cli-args"
import { getDarkModeGuide, getNextSteps, getPrerequisites } from "./plan"
import {
  ASSISTANT_VALUES,
  isWebFramework,
  normalizeProjectSetup,
  projectName,
  type PackageManager,
  type ProjectSetup,
} from "./setup"

const SITE_URL = "https://fabricator-ui.vercel.app"

function prerequisitesStep(setup: ProjectSetup) {
  const needed = getPrerequisites(setup).map(
    ({ title, href }) => `${title} (${href})`
  )
  if (needed.length === 0) return []
  return [
    `Check that I have ${needed.join(" and ")}. If one is missing, tell me how to get it and carry on with what doesn't need it. Don't install anything without asking me.`,
  ]
}

function commandStep(setup: ProjectSetup, packageManager: PackageManager) {
  const opening =
    setup.project === "existing"
      ? "If this project has uncommitted work, ask me what to do with it first. From this project's root, run:"
      : "From the folder I keep my projects in, run:"
  return `${opening}\n\n${formatCommand(toCliArgs(setup), packageManager)}\n\nIf a step fails, read the log it names, fix the cause and run the same command again. It picks up where it stopped.`
}

function checkStep(
  setup: ProjectSetup,
  packageManager: PackageManager,
  cli: (args: string) => string
) {
  const isExisting = setup.project === "existing"
  const isExpoOnly = setup.project === "new" && !isWebFramework(setup.framework)
  const buildCheck = isExisting
    ? "its build still passes"
    : isExpoOnly
      ? `\`${forPackageManager("npx expo-doctor", packageManager)}\` passes`
      : `\`${packageManager} run build\` passes`
  const where = isExisting ? "In this project" : `In \`${projectName(setup)}\``
  return `${where}, check that \`${cli("doctor")}\` reports no failures and ${buildCheck}.`
}

function assistantSteps(setup: ProjectSetup, cli: (args: string) => string) {
  if (setup.assistants.length === 0) {
    return [
      `Run \`${cli("agents add <you>")}\` in the project, where <you> is one of ${ASSISTANT_VALUES.join(", ")} (vscode is GitHub Copilot). It gives you the component rules and the MCP server. Read those rules before you write any UI.`,
    ]
  }
  return setup.skill
    ? [
        "Read the Fabricator skill the command installed before you write any UI. It has the component rules.",
      ]
    : []
}

function themeStep(setup: ProjectSetup) {
  if (setup.project === "new" && !isWebFramework(setup.framework)) return []
  const guide = `${SITE_URL}${getDarkModeGuide(setup)}.md`
  return [
    setup.project === "existing"
      ? `If the project has no theme toggle, add one by following ${guide}`
      : `Add a theme toggle to the web app by following ${guide}`,
  ]
}

function buildStep(setup: ProjectSetup, cli: (args: string) => string) {
  const addComponents = `Add components with \`${cli("add <name>")}\`.`
  if (setup.project === "existing") {
    return setup.appShell
      ? [
          `Replace the App Shell's sample navigation with this project's real pages. ${addComponents}`,
        ]
      : []
  }
  const work = setup.appShell
    ? "replace the App Shell's sample navigation with real pages"
    : "build its first page"
  return [`Ask me what the app is for, then ${work}. ${addComponents}`]
}

function finishStep(setup: ProjectSetup, packageManager: PackageManager) {
  const starts = getNextSteps(setup, packageManager)
    .filter(({ code }) => !code.startsWith("cd "))
    .map(({ label, code }) => `- ${label}: \`${code}\``)
  return [
    "Finish by telling me what you changed and how to start it.",
    ...starts,
  ].join("\n")
}

export function getAgentPrompt(
  rawSetup: ProjectSetup,
  packageManager: PackageManager
) {
  const setup = normalizeProjectSetup(rawSetup)
  const cli = (args: string) =>
    forPackageManager(`npx ${CLI_PACKAGE} ${args}`, packageManager)

  const steps = [
    ...prerequisitesStep(setup),
    commandStep(setup, packageManager),
    "If the CLI printed a snippet instead of editing a file, make that edit.",
    checkStep(setup, packageManager, cli),
    ...assistantSteps(setup, cli),
    ...themeStep(setup),
    ...buildStep(setup, cli),
    finishStep(setup, packageManager),
  ]

  const goal =
    setup.project === "existing"
      ? "Set up Fabricator UI in this project."
      : "Set up my Fabricator UI project."

  return [
    `${goal} Its CLI does the setup, so don't scaffold or copy anything by hand. The docs for agents are at ${SITE_URL}/llms.txt`,
    ...steps.map((step, index) => `${index + 1}. ${step}`),
  ].join("\n\n")
}
