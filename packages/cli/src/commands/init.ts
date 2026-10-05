import { existsSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { Command } from "commander"

import {
  ensureRegistry,
  getBaseFromStyle,
  readComponentsJson,
} from "../utils/config"
import { highlight, logger } from "../utils/logger"
import { rewriteNames } from "../utils/names"
import { exitLike, formatShadcnCommand, runShadcn } from "../utils/shadcn"
import {
  blendRegistryTemplate,
  buildInitUrl,
  fabricatorRegistryTemplate,
  getBaseUrl,
  isBase,
  type Base,
} from "../utils/urls"
import { fail, promptSelect, resolveCwd } from "./shared"

export interface InitOptions {
  template?: string
  base?: string
  preset?: string
  monorepo?: boolean
  rtl?: boolean
  pointer?: boolean
  yes?: boolean
  force?: boolean
  cwd: string
  name?: string
  silent?: boolean
  cssVariables?: boolean
  reinstall?: boolean
  blend?: boolean
  dryRun?: boolean
}

/** Arguments for `shadcn init <initUrl> [components…] [flags]`. */
export function buildInitArgs(
  initUrl: string,
  components: string[],
  options: InitOptions & { base: Base }
): string[] {
  const args = ["init", initUrl, ...rewriteNames(components)]
  if (options.template) args.push("--template", options.template)
  args.push("--base", options.base)
  if (options.monorepo === true) args.push("--monorepo")
  if (options.monorepo === false) args.push("--no-monorepo")
  if (options.rtl === true) args.push("--rtl")
  if (options.rtl === false) args.push("--no-rtl")
  if (options.pointer) args.push("--pointer")
  if (options.yes) args.push("--yes")
  if (options.force) args.push("--force")
  args.push("--cwd", options.cwd)
  if (options.name) args.push("--name", options.name)
  if (options.silent) args.push("--silent")
  if (options.cssVariables === false) args.push("--no-css-variables")
  if (options.reinstall === true) args.push("--reinstall")
  if (options.reinstall === false) args.push("--no-reinstall")
  return args
}

/** The follow-up that swaps the template's upstream `button` for Fabricator's. */
export function buildStarterButtonArgs(
  projectDir: string,
  silent?: boolean
): string[] {
  return [
    "add",
    "@fabricator/button",
    "--overwrite",
    "--yes",
    "--cwd",
    projectDir,
    ...(silent ? ["--silent"] : []),
  ]
}

function listDirectories(dir: string): Set<string> {
  try {
    return new Set(
      readdirSync(dir).filter((entry) => {
        try {
          return statSync(path.join(dir, entry)).isDirectory()
        } catch {
          return false
        }
      })
    )
  } catch {
    return new Set()
  }
}

/**
 * Where shadcn created the project:
 * - cwd already had a package.json → shadcn initialised in place;
 * - `--name` given → `<cwd>/<name>`;
 * - otherwise the single new directory with a package.json, falling back to
 *   the template's default name (`<template>-app`).
 * Monorepo templates keep the app in `apps/web`.
 */
export function findProjectDir(input: {
  cwd: string
  hadPackageJson: boolean
  before: Set<string>
  name?: string
  template?: string
}): string | undefined {
  let root: string | undefined
  if (input.hadPackageJson) {
    root = input.cwd
  } else if (input.name) {
    root = path.resolve(input.cwd, input.name)
  } else {
    const created = [...listDirectories(input.cwd)].filter(
      (dir) =>
        !input.before.has(dir) &&
        existsSync(path.join(input.cwd, dir, "package.json"))
    )
    if (created.length === 1) root = path.join(input.cwd, created[0]!)
    else if (input.template) {
      const fallback = path.join(input.cwd, `${input.template}-app`)
      if (!input.before.has(`${input.template}-app`) && existsSync(fallback))
        root = fallback
    }
  }
  if (!root) return undefined
  for (const candidate of [root, path.join(root, "apps", "web")]) {
    if (existsSync(path.join(candidate, "components.json"))) return candidate
  }
  return undefined
}

async function initExistingProject(
  options: InitOptions & { base: Base },
  baseUrl: string
): Promise<void> {
  const blendTemplate = blendRegistryTemplate(baseUrl)
  const registryArgs = [
    "registry",
    "add",
    `@fabricator=${blendTemplate}`,
    "--cwd",
    options.cwd,
    ...(options.silent ? ["--silent"] : []),
  ]
  const applyUrl = buildInitUrl(
    {
      base: options.base,
      preset: options.preset,
      registry: options.blend ? "blend" : undefined,
    },
    baseUrl
  )
  const applyArgs = [
    "apply",
    "--preset",
    applyUrl,
    "--cwd",
    options.cwd,
    ...(options.yes ? ["--yes"] : []),
    ...(options.silent ? ["--silent"] : []),
  ]

  if (options.dryRun) {
    logger.info(
      `${highlight.info("components.json")} found: this is an existing project.`
    )
    if (options.yes) {
      logger.log(formatShadcnCommand(registryArgs))
    } else {
      logger.log(
        `Option 1, add the @fabricator registry only (keep your current theme):`
      )
      logger.log(`  ${formatShadcnCommand(registryArgs)}`)
      logger.log(`Option 2, apply the Fabricator theme:`)
      logger.log(`  ${formatShadcnCommand(applyArgs)}`)
    }
    return
  }

  const choice = options.yes
    ? "registry"
    : await promptSelect(
        `A ${highlight.info("components.json")} already exists. What would you like to do?`,
        [
          {
            title:
              "Add the @fabricator registry only (keep your current theme)",
            value: "registry" as const,
            description:
              "Fabricator components are compiled for your current style.",
          },
          {
            title: "Apply the Fabricator theme",
            value: "apply" as const,
            description:
              "Applies the Fabricator theme and reinstalls your components. Commit your work first.",
          },
        ]
      )

  if (choice === "registry") {
    const result = await runShadcn(registryArgs)
    if (result.code === 0 && !result.signal && !options.silent) {
      logger.break()
      logger.log(
        `Add components with ${highlight.info("fabricator-ui add <name>")}.`
      )
    }
    return exitLike(result)
  }

  const result = await runShadcn(applyArgs)
  if (result.code === 0 && !result.signal) {
    const ensured = ensureRegistry(
      options.cwd,
      fabricatorRegistryTemplate(baseUrl)
    )
    if (ensured.status === "added")
      logger.info(
        `Added the ${highlight.info("@fabricator")} registry to components.json.`
      )
  }
  return exitLike(result)
}

export async function init(
  components: string[],
  rawOptions: InitOptions
): Promise<void> {
  const cwd = resolveCwd(rawOptions.cwd)
  const baseUrl = getBaseUrl()
  const existing = readComponentsJson(cwd)
  const existingStyle =
    existing.exists && "config" in existing ? existing.config.style : undefined

  const base = rawOptions.base ?? getBaseFromStyle(existingStyle) ?? "base"
  if (!isBase(base))
    fail(`Invalid base: ${base}. Use one of: base, radix, aria.`)
  const options = { ...rawOptions, cwd, base }

  if (existing.exists && !options.force && !options.template) {
    return initExistingProject(options, baseUrl)
  }

  const initUrl = buildInitUrl(
    {
      base,
      preset: options.preset,
      rtl: options.rtl,
      pointer: options.pointer,
      template: options.template,
      monorepo: options.monorepo,
      registry: options.blend ? "blend" : undefined,
    },
    baseUrl
  )
  const args = buildInitArgs(initUrl, components, options)

  if (options.dryRun) {
    logger.log(formatShadcnCommand(args))
    if (options.template) {
      const root = existsSync(path.join(cwd, "package.json"))
        ? cwd
        : path.join(cwd, options.name ?? `${options.template}-app`)
      const projectDir = options.monorepo
        ? path.join(root, "apps", "web")
        : root
      logger.log(
        formatShadcnCommand(buildStarterButtonArgs(projectDir, options.silent))
      )
    }
    return
  }

  const hadPackageJson = existsSync(path.join(cwd, "package.json"))
  const before = listDirectories(cwd)
  const result = await runShadcn(args)
  if (result.code !== 0 || result.signal || !options.template)
    return exitLike(result)

  const projectDir = findProjectDir({
    cwd,
    hadPackageJson,
    before,
    name: options.name,
    template: options.template,
  })
  if (!projectDir) {
    logger.break()
    logger.warn(
      "Could not find the new project's components.json to install the Fabricator button."
    )
    logger.log(
      `  Run ${highlight.info("fabricator-ui add button --overwrite -c <project-dir>")} inside the new project.`
    )
    return
  }

  ensureRegistry(projectDir, fabricatorRegistryTemplate(baseUrl))
  if (!options.silent) {
    logger.break()
    logger.info(
      "Replacing the template's starter button with the Fabricator button."
    )
  }
  const followUp = await runShadcn(
    buildStarterButtonArgs(projectDir, options.silent)
  )
  if (followUp.code !== 0 && !followUp.signal) {
    logger.warn(
      `The project was created, but installing ${highlight.info("@fabricator/button")} failed.`
    )
    logger.log(
      `  Retry with ${highlight.info(`fabricator-ui add button --overwrite -c ${projectDir}`)}.`
    )
  }
  return exitLike(followUp)
}

export function createInitCommand(): Command {
  return new Command("init")
    .alias("create")
    .description("set up a new or existing project with Fabricator UI")
    .argument(
      "[components...]",
      "items to install after init (bare names resolve to @fabricator)"
    )
    .option(
      "-t, --template <template>",
      "create a new project: next, start, vite, react-router, laravel, astro"
    )
    .option(
      "-b, --base <base>",
      "component library: base, radix or aria (default: base, or the project's base)"
    )
    .option(
      "-p, --preset <preset>",
      "Fabricator preset name, preset code or init URL",
      "fabricator"
    )
    .option("--monorepo", "scaffold a monorepo project")
    .option("--no-monorepo", "skip the monorepo prompt")
    .option("--rtl", "enable RTL support")
    .option("--no-rtl", "disable RTL support")
    .option("--pointer", "use a pointer cursor for buttons")
    .option("--css-variables", "use CSS variables for theming")
    .option("--no-css-variables", "do not use CSS variables for theming")
    .option("--reinstall", "re-install existing UI components")
    .option("--no-reinstall", "do not re-install existing UI components")
    .option(
      "--blend",
      "keep your current look: install Fabricator components in your current style"
    )
    .option("-y, --yes", "skip confirmation prompts")
    .option("-f, --force", "force overwrite of an existing components.json")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .option("-n, --name <name>", "the name for the new project")
    .option("-s, --silent", "mute output")
    .option("--dry-run", "print the underlying command instead of running it")
    .action(async (components: string[], options: InitOptions) => {
      try {
        await init(components, options)
      } catch (error) {
        fail(error)
      }
    })
}
