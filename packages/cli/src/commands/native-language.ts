import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { z } from "zod"

import { logger } from "../utils/logger"
import {
  createNativeLanguageConfig,
  fetchNativeItem,
  installNativeFiles,
  NativeFilesError,
  planNativeFiles,
  readNativeLanguageConfig,
  resolveNativeItems,
  type NativeFilePlan,
  type NativeLanguageConfig,
  type NativeLanguageRenderer,
} from "../utils/native-files"
import { getBaseUrl } from "../utils/urls"

type InstallOptions = {
  cwd: string
  all?: boolean
  dryRun?: boolean
  overwrite?: boolean
  silent?: boolean
  diff?: string | boolean
  view?: string | boolean
  path?: string
  app?: string
}

async function listNativeItems(config: NativeLanguageConfig) {
  const url = config.registry.replace("{name}", "registry")
  const response = await fetch(url)
  if (!response.ok)
    throw new NativeFilesError(
      `Cannot fetch ${config.renderer} catalog: HTTP ${response.status}.`
    )
  return z
    .object({
      schemaVersion: z.literal(1),
      renderer: z.literal(config.renderer),
      items: z.array(z.object({ name: z.string(), title: z.string() })),
    })
    .parse(await response.json()).items
}

function displayNativePlans(files: NativeFilePlan[], options: InstallOptions) {
  for (const file of files) {
    if (typeof options.diff === "string" && file.target !== options.diff)
      continue
    if (typeof options.view === "string" && file.target !== options.view)
      continue
    logger.log(`${file.status}: ${file.target}`)
    if (options.view || options.diff) {
      if (/\.(bin|ttf|otf|wav|mp3|mp4|png|jpg)$/.test(file.target)) {
        logger.log(`  Binary asset, ${file.content.byteLength} bytes`)
        continue
      }
      if (options.diff && file.previous && file.status !== "unchanged") {
        logger.log(`--- installed/${file.target}\n+++ registry/${file.target}`)
        logger.log(
          file.previous
            .toString("utf8")
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n")
        )
        logger.log(
          file.content
            .toString("utf8")
            .split("\n")
            .map((line) => `+ ${line}`)
            .join("\n")
        )
      } else logger.log(file.content.toString("utf8"))
    }
  }
}

export async function addNativeLanguage(
  names: string[],
  config: NativeLanguageConfig,
  options: InstallOptions
) {
  if (options.path)
    throw new NativeFilesError(
      "Native files have module-relative targets. Set sourceRoot in fabricator.json to relocate the module; --path is not supported."
    )
  if (options.app)
    throw new NativeFilesError(
      "Run the native installer inside the Swift package or Gradle module; --app is for React workspaces."
    )
  const requested = options.all
    ? [
        ...new Set([
          ...names,
          ...(await listNativeItems(config)).map(({ name }) => name),
        ]),
      ]
    : names
  if (requested.length === 0)
    throw new NativeFilesError("Pass native component names or --all.")
  const items = await resolveNativeItems(requested, config.renderer, (name) =>
    fetchNativeItem(config, name)
  )
  const plans = await planNativeFiles(options.cwd, config, items)
  const readOnly =
    options.dryRun || Boolean(options.diff) || Boolean(options.view)
  if (!options.silent || readOnly) displayNativePlans(plans, options)
  const result = await installNativeFiles(options.cwd, config, plans, {
    dryRun: readOnly,
    overwrite: options.overwrite,
    installed: items.map(({ name }) => name),
  })
  if (!readOnly && !options.silent)
    logger.info(
      `Installed ${items.length} ${config.renderer} items; wrote ${result.written} files.`
    )
}

export async function initNativeLanguage(
  names: string[],
  renderer: NativeLanguageRenderer,
  options: {
    cwd: string
    all?: boolean
    dryRun?: boolean
    force?: boolean
    silent?: boolean
    preset?: string
    look?: string
    spinner?: string
    icons?: string
    shell?: string | boolean
    sounds?: boolean
    agents?: string
    template?: string
  }
) {
  const unsupported = [
    options.preset && options.preset !== "fabricator" ? "--preset" : undefined,
    options.look ? "--look" : undefined,
    options.spinner ? "--spinner" : undefined,
    options.icons ? "--icons" : undefined,
    typeof options.shell === "string" ? "--shell options" : undefined,
    options.agents ? "--agents" : undefined,
    options.template ? "--template" : undefined,
  ].filter((value) => value !== undefined)
  if (unsupported.length)
    throw new NativeFilesError(
      `Native setup does not support ${unsupported.join(", ")}. Install native sources here, then configure FabricatorTheme and the native component APIs in your app.`
    )
  const existing = await readNativeLanguageConfig(options.cwd)
  if (existing && existing.renderer !== renderer)
    throw new NativeFilesError(
      `This project uses ${existing.renderer}. Use a separate source project for ${renderer}.`
    )
  const config = existing ?? createNativeLanguageConfig(renderer, getBaseUrl())
  await addNativeLanguage(
    [
      "foundations",
      ...names,
      ...(options.shell === true ? ["app-shell"] : []),
      ...(options.sounds ? ["sounds"] : []),
    ],
    config,
    {
      ...options,
      overwrite: options.force,
    }
  )
}

export async function viewNativeLanguage(
  names: string[],
  config: NativeLanguageConfig
) {
  const items = await resolveNativeItems(names, config.renderer, (name) =>
    fetchNativeItem(config, name)
  )
  logger.log(JSON.stringify(items, null, 2))
}

export function getNativeLanguageChecks(
  config: NativeLanguageConfig,
  input: {
    hasSwift: boolean
    hasJava: boolean
    hasGradle: boolean
    hasManifest: boolean
  }
) {
  const checks: { status: "pass" | "fail"; label: string }[] = [
    {
      status: "pass",
      label: `fabricator.json schema 1, ${config.renderer}, ${config.platforms.join(", ")}`,
    },
  ]
  if (config.renderer === "swiftui")
    checks.push({
      status: input.hasSwift ? "pass" : "fail",
      label: "Swift toolchain",
    })
  else
    checks.push(
      { status: input.hasJava ? "pass" : "fail", label: "Java runtime" },
      {
        status: input.hasGradle ? "pass" : "fail",
        label: "Gradle or project wrapper",
      }
    )
  checks.push({
    status: input.hasManifest ? "pass" : "fail",
    label:
      config.renderer === "swiftui"
        ? "Swift package manifest"
        : "Gradle build manifest",
  })
  return checks
}

export function doctorNativeLanguage(
  config: NativeLanguageConfig,
  cwd: string
) {
  const root = path.resolve(cwd, config.sourceRoot)
  const checks = getNativeLanguageChecks(config, {
    hasSwift:
      config.renderer === "swiftui" &&
      spawnSync("swift", ["--version"], { stdio: "ignore" }).status === 0,
    hasJava:
      config.renderer === "compose" &&
      spawnSync("java", ["-version"], { stdio: "ignore" }).status === 0,
    hasGradle:
      existsSync(path.join(root, "gradlew")) ||
      (config.renderer === "compose" &&
        spawnSync("gradle", ["--version"], { stdio: "ignore" }).status === 0),
    hasManifest: existsSync(
      path.join(
        root,
        config.renderer === "swiftui" ? "Package.swift" : "build.gradle.kts"
      )
    ),
  })
  for (const check of checks)
    logger.log(`${check.status === "pass" ? "✔" : "✖"} ${check.label}`)
  if (checks.some(({ status }) => status === "fail")) process.exitCode = 1
}
