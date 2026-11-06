import { Command } from "commander"

import {
  ensureRegistry,
  getCatalogStyle,
  hasRegistry,
  readComponentsJson,
  withTemporaryRegistry,
} from "../utils/config"
import { highlight, logger } from "../utils/logger"
import { NAMESPACE, rewriteNames, usesFabricator } from "../utils/names"
import {
  isReactNativeProject,
  readPackageJson,
  registryTemplateFor,
} from "../utils/native"
import {
  buildInstallArgs,
  detectPackageManager,
} from "../utils/package-manager"
import { runLogged } from "../utils/process"
import { exitLike, runShadcn, type ShadcnResult } from "../utils/shadcn"
import { getBaseUrl, isUrl } from "../utils/urls"
import {
  alignWorkspaceAliases,
  findWorkspaceRoot,
  listWorkspaceApps,
  syncWorkspaceAfterAdd,
} from "../utils/workspace"
import { alignExpoDependencies } from "./init-native"
import {
  fail,
  fetchCatalog,
  promptMultiselect,
  requireComponentsJson,
  resolveCwd,
} from "./shared"

export interface AddOptions {
  yes?: boolean
  overwrite?: boolean
  cwd?: string
  all?: boolean
  path?: string
  silent?: boolean
  dryRun?: boolean
  diff?: string | boolean
  view?: string | boolean
  upstream?: boolean
  /** Which monorepo apps: names, comma-separated, or `all`. */
  app?: string
}

/** A React Native project asks `/init/app-shell` for the native file. */
export function adaptItemForProject(item: string, isNative: boolean) {
  if (!isNative || !isUrl(item)) return item
  const url = new URL(item)
  if (!url.pathname.endsWith("/init/app-shell")) return item
  url.searchParams.set("platform", "native")
  return url.toString()
}

/** Flags passed through to `shadcn add` (everything except the item list and `--all`). */
export function buildAddFlags(options: AddOptions & { cwd: string }): string[] {
  const flags: string[] = []
  if (options.yes) flags.push("--yes")
  if (options.overwrite) flags.push("--overwrite")
  flags.push("--cwd", options.cwd)
  if (options.path) flags.push("--path", options.path)
  if (options.silent) flags.push("--silent")
  if (options.dryRun) flags.push("--dry-run")
  if (options.diff !== undefined && options.diff !== false) {
    flags.push(
      "--diff",
      ...(typeof options.diff === "string" ? [options.diff] : [])
    )
  }
  if (options.view !== undefined && options.view !== false) {
    flags.push(
      "--view",
      ...(typeof options.view === "string" ? [options.view] : [])
    )
  }
  return flags
}

/**
 * Runs `shadcn add` with `@fabricator` available. A missing registry is
 * written to components.json; for read-only runs (`--dry-run`, `--diff`,
 * `--view`) it is added only for the duration of the command.
 */
export async function runWithFabricatorRegistry(
  cwd: string,
  args: string[],
  options: { readOnly?: boolean; silent?: boolean } = {}
): Promise<ShadcnResult> {
  const config = requireComponentsJson(cwd)
  if (hasRegistry(config, NAMESPACE)) return runShadcn(args)

  const url = registryTemplateFor(cwd, getBaseUrl())
  if (options.readOnly) {
    if (!options.silent) {
      logger.note(
        `Using the ${NAMESPACE} registry (${url}) for this run only; components.json is left unchanged.`
      )
    }
    return withTemporaryRegistry(cwd, url, () => runShadcn(args))
  }
  ensureRegistry(cwd, url)
  if (!options.silent) {
    logger.info(
      `Added the ${highlight.info(NAMESPACE)} registry to components.json:`
    )
    logger.log(`  ${highlight.dim(url)}`)
  }
  return runShadcn(args)
}

/** The apps a run at a monorepo's root applies to. */
async function resolveApps(cwd: string, app: string | undefined) {
  const apps = listWorkspaceApps(cwd)
  if (apps.length === 0) return undefined
  if (apps.length === 1 && !app) return apps
  if (app === "all") return apps
  if (app) {
    const names = app.split(",")
    const unknown = names.filter(
      (name) => !apps.some((candidate) => candidate.name === name)
    )
    if (unknown.length > 0) {
      fail(
        `No app named ${unknown.join(", ")}. This monorepo has: ${apps.map(({ name }) => name).join(", ")}.`
      )
    }
    return apps.filter(({ name }) => names.includes(name))
  }
  if (!process.stdin.isTTY) {
    fail(
      `This monorepo has several apps. Pass --app ${apps.map(({ name }) => name).join(",")} or --app all.`
    )
  }
  const picked = await promptMultiselect(
    "Which apps should get this?",
    apps.map(({ name }) => ({ title: name, value: name }))
  )
  return apps.filter(({ name }) => picked.includes(name))
}

/** After an `add` in a monorepo app: exports, and the app's own dependencies. */
async function finishWorkspaceAdd(cwd: string, silent?: boolean) {
  if (!syncWorkspaceAfterAdd(cwd)) return
  const root = findWorkspaceRoot(cwd)
  if (!root) return
  const packageManager = detectPackageManager(root)
  if (!silent) logger.info("Updating the workspace's dependencies.")
  await runLogged(packageManager, buildInstallArgs(packageManager), {
    cwd: root,
    logFile: "/dev/null",
  })
}

export async function add(
  components: string[],
  rawOptions: AddOptions
): Promise<void> {
  const cwd = resolveCwd(rawOptions.cwd)
  if (
    !rawOptions.upstream &&
    !readComponentsJson(cwd).exists &&
    findWorkspaceRoot(cwd) === cwd
  ) {
    const apps = await resolveApps(cwd, rawOptions.app)
    if (apps) {
      for (const app of apps) {
        if (!rawOptions.silent)
          logger.info(`Adding to ${highlight.info(app.name)}.`)
        await add(components, { ...rawOptions, app: undefined, cwd: app.dir })
      }
      return
    }
  }
  const options = { ...rawOptions, cwd }
  const flags = buildAddFlags(options)

  if (options.upstream) {
    return exitLike(
      await runShadcn([
        "add",
        ...components,
        ...(options.all ? ["--all"] : []),
        ...flags,
      ])
    )
  }

  const config = requireComponentsJson(cwd)
  const isNative = isReactNativeProject(readPackageJson(cwd))
  let items = rewriteNames(components).map((item) =>
    adaptItemForProject(item, isNative)
  )

  if (options.all || items.length === 0) {
    const style = getCatalogStyle(config)
    const catalog = await fetchCatalog(getBaseUrl(), style)
    const ui = catalog.filter((item) => item.type === "registry:ui")
    if (options.all) {
      items = [
        ...new Set([
          ...items,
          ...ui.map((item) => `${NAMESPACE}/${item.name}`),
        ]),
      ]
    } else {
      if (!process.stdin.isTTY)
        fail("No components given. Pass item names or --all.")
      const picked = await promptMultiselect(
        "Which components would you like to add?",
        catalog
          .filter(
            (item) =>
              item.type === "registry:ui" || item.type === "registry:block"
          )
          .map((item) => ({
            title: item.name,
            value: item.name,
            description: item.description,
          }))
      )
      items = rewriteNames(picked)
    }
  }
  if (items.length === 0) fail("Nothing to add.")

  const args = ["add", ...items, ...flags]
  if (!usesFabricator(items)) return exitLike(await runShadcn(args))
  const readOnly = Boolean(options.dryRun || options.diff || options.view)
  if (!readOnly) alignWorkspaceAliases(cwd)
  const result = await runWithFabricatorRegistry(cwd, args, {
    readOnly,
    silent: options.silent,
  })
  if (result.code === 0 && !result.signal && !readOnly) {
    await alignExpoDependencies(cwd, { silent: options.silent })
    await finishWorkspaceAdd(cwd, options.silent)
  }
  exitLike(result)
}

export function createAddCommand(): Command {
  return new Command("add")
    .description(
      "add Fabricator components to your project (bare names resolve to @fabricator)"
    )
    .argument(
      "[components...]",
      "item names, @namespace/item addresses, URLs or local files"
    )
    .option("-y, --yes", "skip confirmation prompt")
    .option("-o, --overwrite", "overwrite existing files")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .option("-a, --all", "add all Fabricator UI components")
    .option("-p, --path <path>", "the path to add the component to")
    .option("-s, --silent", "mute output")
    .option("--dry-run", "preview changes without writing files")
    .option("--diff [path]", "show diff for a file")
    .option("--view [path]", "show file contents")
    .option("--upstream", "install from the upstream shadcn/ui registry")
    .option(
      "--app <apps>",
      "at a monorepo's root: app names, comma-separated, or all"
    )
    .action(async (components: string[], options: AddOptions) => {
      try {
        await add(components, options)
      } catch (error) {
        fail(error)
      }
    })
}
