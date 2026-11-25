import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  DEFAULT_PROJECT_SETUP,
  formatCommand,
  getNextSteps,
  getTauriMobileSetupError,
  parseKeyValues,
  type DesktopRuntime,
  type ProjectSetup,
} from "@fabricator-ui/setup"
import { Command } from "commander"

import { addDesktopWindowToLayout } from "../setup/layout-window"
import { getPackageOnlyDirectory } from "../setup/package-install"
import { STEPS, type SetupContext } from "../setup/steps"
import { getRegistryUrl, readComponentsJson } from "../utils/config"
import { detectFramework } from "../utils/frameworks"
import { highlight, logger } from "../utils/logger"
import { NAMESPACE } from "../utils/names"
import { detectPackageManager } from "../utils/package-manager"
import { runShadcn } from "../utils/shadcn"
import { getBaseUrl } from "../utils/urls"
import { findWorkspaceRoot } from "../utils/workspace"
import { fail, resolveCwd } from "./shared"

function buildContext(root: string, setup: ProjectSetup): SetupContext {
  return {
    setup,
    cwd: path.dirname(root),
    root,
    webDir: path.join(root, "apps/web"),
    mobileDir: path.join(root, "apps/mobile"),
    desktopDir: path.join(root, "apps/desktop"),
    baseUrl: getBaseUrl(),
    packageManager: detectPackageManager(root),
    logFile: path.join(
      mkdtempSync(path.join(tmpdir(), "fabricator-ui-")),
      "apps.log"
    ),
    stream: Boolean(process.env.FABRICATOR_VERBOSE),
    force: false,
    notes: [],
  }
}

function requireMonorepo(cwd: string) {
  const root = findWorkspaceRoot(cwd)
  if (!root || !existsSync(path.join(root, "apps/web"))) {
    throw new Error(
      "`apps add` works in a monorepo with an apps/web. Create one with `fabricator-ui create --monorepo`."
    )
  }
  return root
}

function baseSetup(root: string, look: string | undefined): ProjectSetup {
  const web = path.join(root, "apps/web")
  return {
    ...DEFAULT_PROJECT_SETUP,
    project: "monorepo",
    name: path.basename(root),
    framework: detectFramework(web) ?? "next",
    distribution: getPackageOnlyDirectory(web) ? "package" : "source",
    look: look ? parseKeyValues(look) : {},
  }
}

async function addMobile(
  root: string,
  options: { look?: string; shell?: boolean; sounds?: boolean }
) {
  if (existsSync(path.join(root, "apps/mobile/src-tauri"))) {
    throw new Error("apps/mobile already contains a Tauri host.")
  }
  const setup: ProjectSetup = {
    ...baseSetup(root, options.look),
    mobile: true,
    appShell: options.shell !== false,
    sound: options.sounds !== false,
  }
  const context = buildContext(root, setup)
  if (setup.distribution === "package") {
    for (const id of [
      "scaffold-mobile",
      "configure-workspace",
      "configure-package-mobile",
      "install",
    ] as const) {
      logger.info(id.replaceAll("-", " "))
      await STEPS[id](context)
    }
    return context.notes
  }
  for (const id of [
    "scaffold-mobile",
    "configure-workspace",
    "install",
    "setup-mobile",
  ] as const) {
    logger.info(id.replaceAll("-", " "))
    await STEPS[id](context)
  }
  // Only the new app: the web app's root is already as the person left it.
  await STEPS.mount({
    ...context,
    setup: { ...setup, framework: "expo", project: "new" },
    mobileDir: context.mobileDir,
  })
  return context.notes
}

async function addTauriMobile(root: string) {
  const setup: ProjectSetup = {
    ...baseSetup(root, undefined),
    mobile: true,
    mobileRuntime: "tauri",
  }
  if (getTauriMobileSetupError(setup)) {
    throw new Error(
      "Tauri mobile needs a Fabricator React + Vite app in apps/web."
    )
  }
  const context = buildContext(root, setup)
  const components = readComponentsJson(context.webDir)
  if (
    setup.distribution === "source" &&
    (!("config" in components) || !getRegistryUrl(components.config, NAMESPACE))
  ) {
    throw new Error(
      "Set up Fabricator UI in apps/web before adding its Tauri mobile host."
    )
  }
  await STEPS["scaffold-tauri-mobile"](context)
  await STEPS.install(context)
  logger.success("Added the Tauri host in apps/mobile.")
  for (const { label, code } of getNextSteps(
    { ...setup, web: false },
    context.packageManager
  ).slice(1)) {
    logger.log(`  ${label}: ${highlight.info(code)}`)
  }
  return context.notes
}

async function addDesktop(root: string, runtime: DesktopRuntime) {
  const setup: ProjectSetup = {
    ...baseSetup(root, undefined),
    desktop: runtime,
  }
  const context = buildContext(root, setup)
  for (const id of [
    "scaffold-desktop",
    "configure-workspace",
    "install",
  ] as const) {
    logger.info(id.replaceAll("-", " "))
    await STEPS[id](context)
  }
  const webDir = path.join(root, "apps/web")
  if (setup.distribution === "package") return context.notes
  await runShadcn([
    "add",
    "@fabricator/desktop-window",
    "--yes",
    "--cwd",
    webDir,
  ])
  const layouts = [
    "components/app-shell-layout.tsx",
    "src/components/app-shell-layout.tsx",
    "app/components/app-shell-layout.tsx",
  ]
  const layout = layouts.find((file) => existsSync(path.join(webDir, file)))
  if (layout) {
    const file = path.join(webDir, layout)
    const next = addDesktopWindowToLayout(
      readFileSync(file, "utf8"),
      "@workspace/ui/hooks"
    )
    if (next) writeFileSync(file, next)
    else {
      context.notes.push(
        `In ${layout}, call useDesktopWindow() and pass its shellWindow as <AppShell window={shellWindow}>.`
      )
    }
  }
  return context.notes
}

export function createAppsCommand(): Command {
  const apps = new Command("apps").description(
    "add a mobile or desktop app to a monorepo"
  )
  apps
    .command("add")
    .description("add a mobile or desktop app")
    .argument("<app>", "mobile or desktop")
    .argument(
      "[runtime]",
      "mobile: expo (default) or tauri; desktop: electron or tauri"
    )
    .option("--look <values>", "the look, as key=value pairs, for mobile")
    .option("--no-shell", "skip the App Shell, for mobile")
    .option("--no-sounds", "skip the sounds and haptics, for mobile")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(
      async (
        app: string,
        runtime: string | undefined,
        options: {
          look?: string
          shell?: boolean
          sounds?: boolean
          cwd?: string
        }
      ) => {
        try {
          const root = requireMonorepo(resolveCwd(options.cwd))
          let notes: string[]
          if (app === "mobile" && runtime === "tauri") {
            if (
              options.look ||
              options.shell === false ||
              options.sounds === false
            ) {
              throw new Error(
                `Configure UI in apps/web with ${formatCommand(["init", "--help"], detectPackageManager(root))}. The Tauri mobile host shares it.`
              )
            }
            for (const note of await addTauriMobile(root))
              logger.log(`  ${note}`)
            return
          }
          if (
            app === "mobile" &&
            (runtime === undefined || runtime === "expo")
          ) {
            notes = await addMobile(root, options)
          } else if (
            app === "desktop" &&
            (runtime === "electron" || runtime === "tauri")
          ) {
            notes = await addDesktop(root, runtime)
          } else {
            throw new Error(
              "Use `apps add mobile [expo|tauri]` or `apps add desktop <electron|tauri>`."
            )
          }
          logger.success(
            `Added apps/${app}. Start it with ${highlight.info(`dev:${app}`)} from the root.`
          )
          for (const note of notes) logger.log(`  ${note}`)
        } catch (error) {
          fail(error)
        }
      }
    )
  return apps
}
