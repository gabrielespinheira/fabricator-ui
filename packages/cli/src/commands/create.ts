import { intro, log } from "@clack/prompts"
import { Command } from "commander"

import {
  addSetupOptions,
  setupFromCreateFlags,
  type SetupFlags,
} from "../setup/flags"
import { askForSetup } from "../setup/prompts"
import { runSetup } from "../setup/run-setup"
import { getRunningPackageManager } from "../utils/package-manager"
import { fail, resolveCwd } from "./shared"

export type CreateOptions = SetupFlags & {
  yes?: boolean
  dryRun?: boolean
  json?: boolean
  cwd?: string
  name?: string
}

async function create(name: string | undefined, options: CreateOptions) {
  const projectName = name ?? options.name
  const initial = setupFromCreateFlags(projectName, options)
  const canAsk =
    process.stdin.isTTY &&
    !process.env.CI &&
    !options.yes &&
    !options.dryRun &&
    !options.json
  if (canAsk) {
    intro("Fabricator UI")
    log.info(
      "Prefer to see it first? https://fabricator-ui.vercel.app/create writes this command for you."
    )
  }
  const setup = canAsk
    ? await askForSetup(initial, options, Boolean(projectName))
    : initial
  await runSetup(setup, {
    cwd: resolveCwd(options.cwd),
    packageManager: getRunningPackageManager(),
    ...(options.dryRun ? { dryRun: true } : {}),
    ...(options.json ? { json: true } : {}),
  })
}

export function createCreateCommand(): Command {
  const command = new Command("create")
    .description(
      "create a project or monorepo with Fabricator UI, in one command"
    )
    .argument("[name]", "the folder to create it in (default: my-app)")
    .option(
      "-t, --template <framework>",
      "next, vite, start, react-router, astro, laravel, expo (default: next)"
    )
    .option("-b, --base <base>", "component library: base, radix or aria")
    .option("--monorepo", "a monorepo, with room for more apps (the default)")
    .option("--no-monorepo", "a single project: one app in one folder")
    .option("--no-web", "no website: mobile alone is a plain Expo project")
    .option("--mobile", "add apps/mobile: React Native with Expo")
    .option("--desktop <runtime>", "add apps/desktop: electron or tauri")
  return addSetupOptions(command)
    .option("-y, --yes", "use the defaults for anything not given")
    .option("--dry-run", "print the plan and write nothing")
    .option("--json", "machine-readable output, for agents")
    .option(
      "-c, --cwd <cwd>",
      "where to create it (default: current directory)"
    )
    .option("-n, --name <name>", "the name for the new project")
    .action(async (name: string | undefined, options: CreateOptions) => {
      try {
        await create(name, options)
      } catch (error) {
        fail(error)
      }
    })
}
