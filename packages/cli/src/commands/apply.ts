import { Command } from "commander"

import { ensureRegistry, getBaseFromStyle } from "../utils/config"
import { highlight, logger } from "../utils/logger"
import { captureShadcn, exitLike, runShadcn } from "../utils/shadcn"
import {
  buildInitUrl,
  fabricatorRegistryTemplate,
  getBaseUrl,
  isBase,
} from "../utils/urls"
import { fail, requireComponentsJson, resolveCwd } from "./shared"

export interface ApplyOptions {
  only?: string
  base?: string
  yes?: boolean
  cwd?: string
  silent?: boolean
  blend?: boolean
}

export function buildApplyArgs(
  applyUrl: string,
  options: ApplyOptions & { cwd: string }
): string[] {
  const args = ["apply", "--preset", applyUrl]
  if (options.only) args.push("--only", options.only)
  if (options.yes) args.push("--yes")
  args.push("--cwd", options.cwd)
  if (options.silent) args.push("--silent")
  return args
}

// `shadcn apply` reinstalls the project's components by bare name, which pulls
// the upstream shadcn versions. Re-add the Fabricator versions afterwards.
export function buildReinstallArgs(
  components: string[],
  options: { cwd: string; silent?: boolean }
): string[] | undefined {
  if (components.length === 0) return undefined
  const args = [
    "add",
    ...components.map((name) => `@fabricator/${name}`),
    "--overwrite",
    "--yes",
    "--cwd",
    options.cwd,
  ]
  if (options.silent) args.push("--silent")
  return args
}

async function getInstalledComponents(cwd: string): Promise<string[]> {
  const info = await captureShadcn(["info", "--json", "--cwd", cwd])
  if (info.code !== 0) return []
  try {
    const parsed = JSON.parse(info.stdout) as { components?: unknown }
    return Array.isArray(parsed.components)
      ? parsed.components.filter(
          (name): name is string => typeof name === "string"
        )
      : []
  } catch {
    return []
  }
}

export async function apply(
  preset: string | undefined,
  rawOptions: ApplyOptions
): Promise<void> {
  const cwd = resolveCwd(rawOptions.cwd)
  const config = requireComponentsJson(cwd)
  const base = rawOptions.base ?? getBaseFromStyle(config.style) ?? "base"
  if (!isBase(base))
    fail(`Invalid base: ${base}. Use one of: base, radix, aria.`)

  const baseUrl = getBaseUrl()
  const applyUrl = buildInitUrl(
    {
      base,
      preset,
      only: rawOptions.only,
      registry: rawOptions.blend ? "blend" : undefined,
    },
    baseUrl
  )
  const result = await runShadcn(
    buildApplyArgs(applyUrl, { ...rawOptions, cwd })
  )
  if (result.code !== 0 || result.signal) {
    exitLike(result)
    return
  }

  const ensured = ensureRegistry(cwd, fabricatorRegistryTemplate(baseUrl))
  if (ensured.status === "added" && !rawOptions.silent) {
    logger.info(
      `Added the ${highlight.info("@fabricator")} registry to components.json.`
    )
  }

  if (rawOptions.only || rawOptions.blend) {
    exitLike(result)
    return
  }

  const reinstallArgs = buildReinstallArgs(await getInstalledComponents(cwd), {
    cwd,
    silent: rawOptions.silent,
  })
  if (!reinstallArgs) {
    exitLike(result)
    return
  }
  if (!rawOptions.silent) {
    logger.info("Reinstalling your components from @fabricator.")
  }
  exitLike(await runShadcn(reinstallArgs))
}

export function createApplyCommand(): Command {
  return new Command("apply")
    .description(
      "apply a Fabricator preset (theme, fonts, components) to an existing project"
    )
    .argument(
      "[preset]",
      "Fabricator preset name, preset code or init URL",
      "fabricator"
    )
    .option("--only <parts>", "apply only parts of the preset: theme, font")
    .option(
      "-b, --base <base>",
      "component library: base, radix or aria (default: the project's base)"
    )
    .option("--blend", "keep your current look for components")
    .option("-y, --yes", "skip confirmation prompt")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .option("-s, --silent", "mute output")
    .action(async (preset: string | undefined, options: ApplyOptions) => {
      try {
        await apply(preset, options)
      } catch (error) {
        fail(error)
      }
    })
}
