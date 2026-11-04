import { spawn } from "node:child_process"

import { highlight, logger } from "../utils/logger"
import {
  isExpoProject,
  readPackageJson,
  writeNativeSetup,
} from "../utils/native"
import { exitLike, formatShadcnCommand, runShadcn } from "../utils/shadcn"

/** `expo install --fix` pins what `add` installed to the project's Expo SDK. */
export function buildExpoFixCommand() {
  return { command: "npx", args: ["--yes", "expo", "install", "--fix"] }
}

export function runExpoFix(cwd: string): Promise<number> {
  const { command, args } = buildExpoFixCommand()
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" })
    child.on("close", (code) => resolve(code ?? 1))
    child.on("error", () => resolve(1))
  })
}

/** Aligns native dependencies with the SDK; a failure is a warning, not the end. */
export async function alignExpoDependencies(
  cwd: string,
  options: { silent?: boolean } = {}
) {
  if (!isExpoProject(readPackageJson(cwd))) return
  if (!options.silent) {
    logger.info("Matching native packages to your Expo SDK.")
  }
  const code = await runExpoFix(cwd)
  if (code !== 0) {
    logger.warn(
      `Could not match packages to your Expo SDK. Run ${highlight.info("npx expo install --fix")} before building.`
    )
  }
}

export function getNativeNextSteps(cssEntry: string) {
  const fromLayout = cssEntry.startsWith("src/")
    ? `../${cssEntry.slice("src/".length)}`
    : "../global.css"
  return [
    `Import the stylesheet once, in your root layout: ${highlight.info(`import "${fromLayout}"`)}`,
    `Wrap the app in ${highlight.info("<FabricatorRoot>")} from ${highlight.info("@/components/ui/fabricator-root")}: it sets up gestures, safe areas and where overlays render.`,
    `Restart Metro with ${highlight.info("npx expo start --clear")}, then build a dev client, since native modules were added: ${highlight.info("npx expo run:ios")}.`,
  ]
}

/**
 * React Native projects have no shadcn template and `shadcn init` needs Tailwind
 * set up first, so the files it expects are written here and everything else
 * goes through `shadcn add`.
 */
export async function initNative(
  components: string[],
  options: {
    cwd: string
    baseUrl: string
    initUrl: string
    yes?: boolean
    silent?: boolean
    dryRun?: boolean
  }
) {
  const addArgs = [
    "add",
    options.initUrl,
    ...components,
    "--cwd",
    options.cwd,
    ...(options.yes ? ["--yes"] : []),
    ...(options.silent ? ["--silent"] : []),
  ]

  if (options.dryRun) {
    logger.log(
      "Writes components.json, the Metro config and the stylesheet's imports, then:"
    )
    logger.log(`  ${formatShadcnCommand(addArgs)}`)
    logger.log("  npx expo install --fix")
    return
  }

  const setup = writeNativeSetup(options.cwd, options.baseUrl)
  if (!options.silent) {
    for (const change of setup.changes) {
      logger.info(
        `${change.action === "created" ? "Created" : "Updated"} ${highlight.info(change.file)}`
      )
    }
  }
  if (setup.hasCustomMetro) {
    logger.warn(
      `${highlight.info("metro.config.js")} exists, so it was left alone. Wrap its export in ${highlight.info("withUniwindConfig")} from ${highlight.info("uniwind/metro")}, with cssEntryFile "./${setup.cssEntry}".`
    )
  }

  const result = await runShadcn(addArgs)
  if (result.code !== 0 || result.signal) return exitLike(result)

  await alignExpoDependencies(options.cwd, { silent: options.silent })

  if (!options.silent) {
    logger.break()
    logger.log("Next:")
    for (const step of getNativeNextSteps(setup.cssEntry)) {
      logger.log(`  ${step}`)
    }
  }
  return exitLike(result)
}
