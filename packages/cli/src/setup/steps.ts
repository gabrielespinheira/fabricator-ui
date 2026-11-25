// What each step of a plan does. Every step checks whether its work is there
// first, so running the same command again after a failure picks up where it
// stopped.

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  EXPO_SDK,
  hasExpoApp,
  hasWebApp,
  projectName,
  type Framework,
  type PackageManager,
  type ProjectSetup,
  type StepId,
} from "@fabricator-ui/setup"
import { z } from "zod"

import { writeMcpConfigs, type McpClient } from "../commands/mcp"
import { fetchCatalog } from "../commands/shared"
import { writeNativePages, writeWebPages } from "../mount/pages"
import { mountAstroRoot, mountNativeRoot, mountWebRoot } from "../mount/root"
import { ensureRegistry, readComponentsJson } from "../utils/config"
import { detectFramework } from "../utils/frameworks"
import {
  findCssEntry,
  isReactNativeProject,
  readPackageJson,
  writeNativeSetup,
} from "../utils/native"
import { buildDlxCommand, buildInstallArgs } from "../utils/package-manager"
import { hasCommand, runLogged } from "../utils/process"
import { resolveShadcnBin } from "../utils/shadcn"
import { fabricatorRegistryTemplate } from "../utils/urls"
import {
  alignWorkspaceAliases,
  findWorkspaceRoot,
  listWorkspaceApps,
  removeUnusedScaffoldLucide,
  syncWorkspaceAfterAdd,
} from "../utils/workspace"
import {
  buildTauriConfig,
  getStaticOutput,
  getTauriFeatures,
  getWebDevUrl,
  patchStaticBuild,
  renderTemplate,
  STATIC_BUILD_FILES,
} from "./desktop"
import { nameExpoApp } from "./expo-config"
import {
  buildNativeSetupInitUrl,
  buildSetupInitUrl,
  getNativeItems,
  getWebItems,
} from "./items"
import { setUpReactPackage } from "./package-install"
import { configureNativePackage } from "./package-native"
import { scaffoldPackageWeb } from "./package-scaffold"
import { writeProjectDocs } from "./project-docs"
import { writeSkill } from "./skill"
import {
  buildBiomeConfig,
  buildFixCommand,
  buildReactEslintConfig,
  buildRootToolingScripts,
  buildViteConfig,
  EXPO_ESLINT_CONFIG,
  EXPO_ESLINT_DEPENDENCIES,
  getRootToolingDevDependencies,
  PRETTIER_CONFIG,
  PRETTIER_IGNORE,
  REACT_ESLINT_DEPENDENCIES,
  stripEslintAndPrettier,
  TOOLING_VERSIONS,
  toViteTaskScripts,
  VITE_PLUS_DEPENDENCY,
  withoutTurboTasks,
  withTurboLintTask,
  type PackageJson,
} from "./tooling"
import {
  buildRootPackage,
  buildWebPackageForDesktop,
  buildWorkspaceRoot,
  BUN_HOISTED_CONFIG,
  getNativePeerPins,
  PNPM_WORKSPACE_CONFIG,
  withPins,
} from "./workspace-config"

export type SetupContext = {
  setup: ProjectSetup
  /** Where the command ran. */
  cwd: string
  /** The project's root, which doesn't exist until it's scaffolded. */
  root: string
  webDir: string
  mobileDir: string
  desktopDir: string
  baseUrl: string
  packageManager: PackageManager
  logFile: string
  /** Show child output instead of logging it. */
  stream: boolean
  /** Apply a look over uncommitted work. */
  force: boolean
  /** Things only a person can finish, for the summary. */
  notes: string[]
}

export type Step = (context: SetupContext) => Promise<void>

function shadcn(context: SetupContext, args: string[], cwd = context.cwd) {
  return runLogged(process.execPath, [resolveShadcnBin(), ...args], {
    cwd,
    logFile: context.logFile,
    stream: context.stream,
    // Bun's default fan-out can reset connections while loading an entire registry.
    env:
      context.setup.components === "all" && process.versions.bun
        ? {
            BUN_CONFIG_MAX_HTTP_REQUESTS:
              process.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? "32",
          }
        : undefined,
  })
}

function git(context: SetupContext, args: string[]) {
  return runLogged("git", args, {
    cwd: context.root,
    logFile: context.logFile,
  })
}

/** Every component, for `--all`. */
async function getAllComponents(context: SetupContext, style: string) {
  if (context.setup.components !== "all") return []
  const catalog = await fetchCatalog(context.baseUrl, style)
  return catalog
    .filter((item) => item.type === "registry:ui")
    .map((item) => item.name)
}

function webStyle(setup: ProjectSetup) {
  return `${setup.base}-nova`
}

async function webItemsFor(
  context: SetupContext,
  framework: Framework | undefined
) {
  return getWebItems(
    context.setup,
    context.baseUrl,
    framework,
    await getAllComponents(context, webStyle(context.setup))
  )
}

/** A monorepo for a lone mobile app: just the workspace, around apps/. */
const scaffoldMonorepo: Step = async (context) => {
  const { root, setup, packageManager } = context
  const rootPackage = path.join(root, "package.json")
  if (existsSync(rootPackage)) return
  mkdirSync(path.join(root, "apps"), { recursive: true })
  writeJsonFile(rootPackage, {
    ...buildWorkspaceRoot(projectName(setup)),
    ...(setup.distribution === "package" && {
      fabricatorDistribution: "package",
    }),
  })
  if (packageManager === "pnpm") {
    writeFileSync(path.join(root, "pnpm-workspace.yaml"), PNPM_WORKSPACE_CONFIG)
  }
  writeFileSync(path.join(root, ".gitignore"), "node_modules\n.DS_Store\n")
}

const scaffoldWeb: Step = async (context) => {
  const { setup } = context
  if (existsSync(path.join(context.webDir, "components.json"))) return
  const isMonorepo = setup.project === "monorepo"
  const items = isMonorepo ? [] : await webItemsFor(context, setup.framework)
  await shadcn(context, [
    "init",
    buildSetupInitUrl(setup, context.baseUrl),
    ...items,
    "--template",
    setup.framework,
    "--base",
    setup.base,
    isMonorepo ? "--monorepo" : "--no-monorepo",
    "--yes",
    "--cwd",
    context.cwd,
    "--name",
    projectName(setup),
  ])
}

const scaffoldLaravel: Step = async (context) => {
  const { setup, root } = context
  if (!existsSync(path.join(root, "artisan"))) {
    if (!(await hasCommand("laravel"))) {
      throw new Error(
        "The Laravel installer isn't on your PATH. Install it from https://laravel.com/docs/installation, then run this again."
      )
    }
    await runLogged("laravel", ["new", projectName(setup), "--react"], {
      cwd: context.cwd,
      logFile: context.logFile,
      stream: true,
    })
  }
  if (existsSync(path.join(root, "components.json"))) return
  await shadcn(context, [
    "init",
    buildSetupInitUrl({ ...setup, project: "existing" }, context.baseUrl),
    ...(await webItemsFor(context, "laravel")),
    "--base",
    setup.base,
    "--yes",
    "--force",
    "--cwd",
    root,
  ])
}

const configureMonorepo: Step = async (context) => {
  alignWorkspaceAliases(context.webDir)
}

const addWebItems: Step = async (context) => {
  await shadcn(context, [
    "add",
    ...(await webItemsFor(context, context.setup.framework)),
    "--overwrite",
    "--yes",
    "--cwd",
    context.webDir,
  ])
  syncWorkspaceAfterAdd(context.webDir)
  removeUnusedScaffoldLucide(context.webDir)
}

/** The Expo template's demo. `ui/collapsible` also sits where ours installs. */
const EXPO_DEMO_FILES = [
  "app/explore.tsx",
  "components/animated-icon.module.css",
  "components/animated-icon.tsx",
  "components/animated-icon.web.tsx",
  "components/app-tabs.tsx",
  "components/app-tabs.web.tsx",
  "components/external-link.tsx",
  "components/hint-row.tsx",
  "components/themed-text.tsx",
  "components/themed-view.tsx",
  "components/ui/collapsible.tsx",
  "components/web-badge.tsx",
  "constants/theme.ts",
  "hooks/use-color-scheme.ts",
  "hooks/use-color-scheme.web.ts",
  "hooks/use-theme.ts",
]

function removeExpoDemo(mobileDir: string) {
  const src = path.join(mobileDir, "src")
  for (const file of EXPO_DEMO_FILES) {
    rmSync(path.join(src, file), { force: true })
  }
  writeFileSync(path.join(src, "css.d.ts"), 'declare module "*.css"\n')
}

const scaffoldMobile: Step = async (context) => {
  const { mobileDir, cwd, setup, packageManager } = context
  if (existsSync(path.join(mobileDir, "package.json"))) return
  const isMonorepo = setup.project === "monorepo"
  const { command, args } = buildDlxCommand(packageManager, [
    "create-expo-app@latest",
    isMonorepo ? "apps/mobile" : projectName(setup),
    "--template",
    `default@sdk-${EXPO_SDK}`,
    "--no-install",
  ])
  await runLogged(command, args, {
    cwd: isMonorepo ? context.root : cwd,
    logFile: context.logFile,
    stream: context.stream,
  })
  removeExpoDemo(mobileDir)
  const appJson = path.join(mobileDir, "app.json")
  writeJsonFile(appJson, nameExpoApp(readJsonFile(appJson), projectName(setup)))
  if (isMonorepo) {
    // The monorepo holds the history.
    rmSync(path.join(mobileDir, ".git"), { recursive: true, force: true })
    return
  }
  await runLogged(packageManager, buildInstallArgs(packageManager), {
    cwd: mobileDir,
    logFile: context.logFile,
    stream: context.stream,
  })
}

function getTemplatesRoot() {
  const candidates = [
    new URL("./templates", import.meta.url),
    new URL("../../templates", import.meta.url),
  ].map((url) => fileURLToPath(url))
  const root = candidates.find((dir) => existsSync(dir))
  if (!root) throw new Error("The CLI is missing its application templates.")
  return root
}

/** Text files get their tokens filled; icons are copied as they are. */
function copyTemplate(
  from: string,
  to: string,
  tokens: Record<string, string>
) {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    const source = path.join(from, name)
    const target = path.join(to, name)
    if (statSync(source).isDirectory()) {
      copyTemplate(source, target, tokens)
    } else if (/\.(png|icns|ico)$/.test(name)) {
      cpSync(source, target)
    } else {
      writeFileSync(
        target,
        renderTemplate(readFileSync(source, "utf8"), tokens)
      )
    }
  }
}

const TAURI_MOBILE_CONFIG = "vite.tauri-mobile.config.mjs"
const TAURI_MOBILE_SCRIPTS = {
  "dev:tauri-mobile": `vite --config ${TAURI_MOBILE_CONFIG}`,
  "build:tauri-mobile": `vite build --config ${TAURI_MOBILE_CONFIG}`,
}

function addScripts(file: string, scripts: Record<string, string>) {
  const manifest = readJsonFile(file)
  const current = z.record(z.string(), z.string()).parse(manifest.scripts ?? {})
  for (const [name, script] of Object.entries(scripts)) {
    if (current[name] !== undefined && current[name] !== script) {
      throw new Error(
        `Resolve the existing "${name}" script in ${file} before adding Tauri mobile.`
      )
    }
  }
  if (Object.keys(scripts).every((name) => Object.hasOwn(current, name)))
    return null
  return { ...manifest, scripts: { ...current, ...scripts } }
}

const scaffoldTauriMobile: Step = async (context) => {
  const { setup, root, mobileDir, webDir, packageManager } = context
  if (
    detectFramework(webDir) !== "vite" ||
    !readPackageJson(webDir)?.dependencies?.react ||
    !existsSync(path.join(webDir, "index.html"))
  ) {
    throw new Error(
      "Tauri mobile needs a React + Vite renderer with an index.html in apps/web."
    )
  }
  const mobileManifest = path.join(mobileDir, "package.json")
  const alreadyScaffolded =
    existsSync(mobileManifest) &&
    readJsonFile(mobileManifest).fabricatorRuntime === "tauri-mobile" &&
    existsSync(path.join(mobileDir, "src-tauri/tauri.conf.json"))
  if (!alreadyScaffolded && existsSync(mobileDir)) {
    throw new Error(
      "apps/mobile already exists. Use an available mobile workspace before adding Tauri."
    )
  }

  const rootPackage = path.join(root, "package.json")
  const webPackage = path.join(webDir, "package.json")
  const rootScripts = Object.fromEntries(
    [
      ...["ios", "ipad", "android"].map((platform) => [
        `dev:mobile:${platform}`,
        platform,
      ]),
      ...["ios", "android"].flatMap((platform) => [
        [`init:mobile:${platform}`, `init:${platform}`],
        [`build:mobile:${platform}`, `build:${platform}`],
      ]),
    ].map(([name, script]) => [
      name,
      `cd apps/mobile && ${packageManager} run ${script}`,
    ])
  )
  const nextRootPackage = addScripts(rootPackage, rootScripts)
  const nextWebPackage = addScripts(webPackage, TAURI_MOBILE_SCRIPTS)
  const template = path.join(getTemplatesRoot(), "mobile-tauri")
  const renderer = path.join(webDir, TAURI_MOBILE_CONFIG)
  if (
    existsSync(renderer) &&
    !readFileSync(renderer, "utf8").startsWith(
      "// Fabricator UI Tauri mobile renderer"
    )
  ) {
    throw new Error(
      `Move the custom ${TAURI_MOBILE_CONFIG} aside before adding the Fabricator UI mobile profile.`
    )
  }

  if (!alreadyScaffolded) {
    const stage = mkdtempSync(
      path.join(path.dirname(mobileDir), ".tauri-mobile-")
    )
    try {
      const appName = projectName(setup)
      const slug = appName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40)
        .replace(/-$/, "")
      const name = /^[a-z]/.test(slug) ? slug : `app-${slug || "project"}`
      copyTemplate(
        path.join(template, "src-tauri"),
        path.join(stage, "src-tauri"),
        {
          APP_NAME_JSON: JSON.stringify(appName).slice(1, -1),
          APP_IDENTIFIER: `app.project${slug.replaceAll("-", "")}.mobile`,
          CRATE_NAME: `${name}-mobile`,
          LIB_NAME: `${name.replaceAll("-", "_")}_mobile_lib`,
          PACKAGE_MANAGER: packageManager,
        }
      )
      cpSync(
        path.join(template, "package.json"),
        path.join(stage, "package.json")
      )
      cpSync(path.join(template, "gitignore"), path.join(stage, ".gitignore"))
      writeFileSync(
        path.join(stage, "README.md"),
        renderTemplate(readFileSync(path.join(template, "README.md"), "utf8"), {
          PACKAGE_MANAGER: packageManager,
        })
      )
      renameSync(stage, mobileDir)
    } finally {
      rmSync(stage, { recursive: true, force: true })
    }
  }
  if (!existsSync(renderer))
    cpSync(path.join(template, TAURI_MOBILE_CONFIG), renderer)
  if (nextRootPackage) writeJsonFile(rootPackage, nextRootPackage)
  if (nextWebPackage) writeJsonFile(webPackage, nextWebPackage)
}

function getLightsY(setup: ProjectSetup) {
  return setup.shell.tabs === "titlebar" ? "13" : "23"
}

function isGlass(setup: ProjectSetup) {
  return setup.shell.glass !== "false"
}

const scaffoldDesktop: Step = async (context) => {
  const { setup, desktopDir, packageManager } = context
  if (existsSync(path.join(desktopDir, "package.json"))) return
  const appName = projectName(setup)
  copyTemplate(
    path.join(getTemplatesRoot(), `desktop-${setup.desktop}`),
    desktopDir,
    {
      APP_NAME: appName,
      CRATE_NAME: `${appName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-desktop`,
      DEV_URL: getWebDevUrl(setup.framework),
      WEB_OUTPUT: getStaticOutput(setup.framework),
      IS_GLASS: String(isGlass(setup)),
      LIGHTS_Y: getLightsY(setup),
      TAURI_FEATURES: getTauriFeatures(isGlass(setup)),
    }
  )
  if (setup.desktop === "tauri") {
    writeFileSync(
      path.join(desktopDir, "src-tauri/tauri.conf.json"),
      `${JSON.stringify(
        buildTauriConfig({
          appName,
          framework: setup.framework,
          packageManager,
          isGlass: isGlass(setup),
        }),
        null,
        2
      )}\n`
    )
  }
}

function readJsonFile(file: string) {
  return z
    .record(z.string(), z.unknown())
    .parse(JSON.parse(readFileSync(file, "utf8")))
}

function writeJsonFile(file: string, value: unknown) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function configureStaticBuild(context: SetupContext) {
  const { setup, webDir, packageManager } = context
  const file = STATIC_BUILD_FILES[setup.framework]
  if (file && existsSync(path.join(webDir, file))) {
    const target = path.join(webDir, file)
    const patched = patchStaticBuild(
      setup.framework,
      readFileSync(target, "utf8")
    )
    if (patched === null) {
      context.notes.push(
        `Turn on a static build in apps/web/${file} behind FABRICATOR_DESKTOP=1: the desktop app loads it in production.`
      )
    } else {
      writeFileSync(target, patched)
    }
  }
  const webPackage = path.join(webDir, "package.json")
  writeJsonFile(
    webPackage,
    buildWebPackageForDesktop(readJsonFile(webPackage), packageManager)
  )
}

const configureWorkspace: Step = async (context) => {
  const { setup, root, packageManager, mobileDir, webDir } = context
  const rootPackage = path.join(root, "package.json")
  const mobileReact = hasExpoApp(setup)
    ? readPackageJson(mobileDir)?.dependencies?.react
    : undefined
  writeJsonFile(
    rootPackage,
    buildRootPackage(readJsonFile(rootPackage), {
      packageManager,
      hasWebApp: hasWebApp(setup),
      runner: setup.runner,
      hasDesktop: setup.desktop !== "none",
      ...(mobileReact ? { mobileReact } : {}),
    })
  )
  if (hasExpoApp(setup) && packageManager === "bun") {
    writeFileSync(path.join(root, "bunfig.toml"), BUN_HOISTED_CONFIG)
  }
  if (setup.distribution === "package" && mobileReact && hasWebApp(setup)) {
    const manifest = path.join(webDir, "package.json")
    const pkg = readPackageJson(webDir)
    if (pkg?.dependencies?.react !== mobileReact) {
      writeJsonFile(manifest, {
        ...readJsonFile(manifest),
        dependencies: {
          ...pkg?.dependencies,
          react: mobileReact,
          "react-dom": mobileReact,
        },
      })
    }
  }
  if (setup.desktop !== "none") configureStaticBuild(context)
}

function updateJsonFile(
  file: string,
  update: (value: Record<string, unknown>) => unknown
) {
  writeJsonFile(file, update(readJsonFile(file)))
}

function withPackages(
  pkg: PackageJson,
  devDependencies: Record<string, string>,
  scripts: Record<string, string> = {}
): PackageJson {
  return {
    ...pkg,
    scripts: { ...pkg.scripts, ...scripts },
    devDependencies: { ...pkg.devDependencies, ...devDependencies },
  }
}

/** Every package in apps/ and packages/. */
function listWorkspacePackages(root: string) {
  return ["apps", "packages"].flatMap((group) => {
    const groupDir = path.join(root, group)
    if (!existsSync(groupDir)) return []
    return readdirSync(groupDir)
      .map((name) => path.join(groupDir, name))
      .filter((dir) => existsSync(path.join(dir, "package.json")))
  })
}

const ESLINT_FILES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "tsconfig.lint.json",
]

/** Biome or Vite+ in place of the template's ESLint and Prettier. */
function switchToolchain(
  context: SetupContext,
  tooling: "biome" | "vite-plus"
) {
  const { root, setup } = context
  rmSync(path.join(root, "packages/eslint-config"), {
    recursive: true,
    force: true,
  })
  for (const file of [".eslintrc.js", ".prettierrc", ".prettierignore"]) {
    rmSync(path.join(root, file), { force: true })
  }
  for (const dir of listWorkspacePackages(root)) {
    for (const file of ESLINT_FILES) {
      rmSync(path.join(dir, file), { force: true })
    }
    updateJsonFile(path.join(dir, "package.json"), stripEslintAndPrettier)
  }
  const turbo = path.join(root, "turbo.json")
  if (existsSync(turbo)) updateJsonFile(turbo, withoutTurboTasks)
  updateJsonFile(path.join(root, "package.json"), (pkg) =>
    withPackages(
      stripEslintAndPrettier(pkg),
      getRootToolingDevDependencies(tooling),
      buildRootToolingScripts(tooling)
    )
  )
  if (tooling === "biome") {
    writeFileSync(path.join(root, "biome.json"), buildBiomeConfig())
    return
  }
  writeFileSync(
    path.join(root, "vite.config.ts"),
    buildViteConfig({
      hasWebApp: hasWebApp(setup) && setup.distribution === "source",
    })
  )
}

/** Fills the gaps in the templates' ESLint and Prettier. */
function completeEslintAndPrettier(context: SetupContext) {
  const { root, setup, webDir, mobileDir, packageManager } = context
  const rootPackage = path.join(root, "package.json")
  if (!hasWebApp(setup)) {
    // A lone mobile app's workspace has no template, so no Prettier yet.
    writeFileSync(path.join(root, ".prettierrc"), PRETTIER_CONFIG)
    writeFileSync(path.join(root, ".prettierignore"), PRETTIER_IGNORE)
    updateJsonFile(rootPackage, (pkg) =>
      withPackages(
        pkg,
        { prettier: TOOLING_VERSIONS.prettier },
        {
          lint: `cd apps/mobile && ${packageManager} run lint`,
          format: 'prettier --write "**/*.{ts,tsx}"',
        }
      )
    )
  } else if (setup.framework === "react-router") {
    // React Router's template ships Prettier without ESLint.
    const packages: [string, string[]][] = [
      [webDir, ["build", ".react-router"]],
      [path.join(root, "packages/ui"), ["dist"]],
    ]
    for (const [dir, ignores] of packages) {
      writeFileSync(
        path.join(dir, "eslint.config.js"),
        buildReactEslintConfig(ignores)
      )
      updateJsonFile(path.join(dir, "package.json"), (pkg) =>
        withPackages(pkg, REACT_ESLINT_DEPENDENCIES, { lint: "eslint" })
      )
    }
    updateJsonFile(path.join(root, "turbo.json"), withTurboLintTask)
    updateJsonFile(rootPackage, (pkg) =>
      withPackages(pkg, {}, { lint: "turbo lint" })
    )
  }
  if (hasExpoApp(setup)) {
    // Expo's template runs `expo lint`, which asks to install ESLint first.
    writeFileSync(path.join(mobileDir, "eslint.config.js"), EXPO_ESLINT_CONFIG)
    updateJsonFile(path.join(mobileDir, "package.json"), (pkg) =>
      withPackages(pkg, EXPO_ESLINT_DEPENDENCIES)
    )
  }
}

/** Vite+ runs the tasks Turborepo did: same scripts, `vp run` instead. */
function switchToVitePlusRunner(context: SetupContext) {
  const { root } = context
  rmSync(path.join(root, "turbo.json"), { force: true })
  updateJsonFile(path.join(root, "package.json"), (pkg) => {
    const { turbo: _turbo, ...devDependencies } = z
      .record(z.string(), z.string())
      .parse(pkg.devDependencies ?? {})
    return {
      ...pkg,
      scripts: toViteTaskScripts(
        z.record(z.string(), z.string()).parse(pkg.scripts ?? {})
      ),
      devDependencies: { ...devDependencies, ...VITE_PLUS_DEPENDENCY },
    }
  })
}

const configureTooling: Step = async (context) => {
  const { tooling, runner } = context.setup
  if (tooling === "eslint-prettier") completeEslintAndPrettier(context)
  else switchToolchain(context, tooling)
  if (runner === "vite-plus") switchToVitePlusRunner(context)
}

const install: Step = async (context) => {
  await runLogged(
    context.packageManager,
    buildInstallArgs(context.packageManager),
    {
      cwd: context.root,
      logFile: context.logFile,
      stream: context.stream,
    }
  )
}

/** pnpm's isolated installs keep a copy per app, so they don't need this. */
function pinNativePeers(context: SetupContext) {
  const { root, packageManager } = context
  if (packageManager === "pnpm" || context.setup.project !== "monorepo") return
  const bundled = path.join(root, "node_modules/expo/bundledNativeModules.json")
  if (!existsSync(bundled)) return
  const rootPackage = path.join(root, "package.json")
  writeJsonFile(
    rootPackage,
    withPins(
      readJsonFile(rootPackage),
      packageManager,
      getNativePeerPins(readJsonFile(bundled))
    )
  )
}

async function setUpNativeApp(context: SetupContext, appDir: string) {
  writeNativeSetup(appDir, context.baseUrl)
  pinNativePeers(context)
  await shadcn(context, [
    "add",
    buildNativeSetupInitUrl(context.setup, context.baseUrl),
    ...getNativeItems(
      context.setup,
      context.baseUrl,
      await getAllComponents(context, "native")
    ),
    "--overwrite",
    "--yes",
    "--cwd",
    appDir,
  ])
  const { command, args } = buildDlxCommand(context.packageManager, [
    "expo",
    "install",
    "--fix",
  ])
  try {
    await runLogged(command, args, {
      cwd: appDir,
      logFile: context.logFile,
      stream: context.stream,
    })
  } catch {
    context.notes.push(
      "Couldn't match the native packages to your Expo SDK. Run `npx expo install --fix` before building."
    )
  }
}

const setupMobile: Step = (context) =>
  setUpNativeApp(context, context.mobileDir)

function readIfExists(file: string) {
  return existsSync(file) ? readFileSync(file, "utf8") : undefined
}

const WEB_ROOT_FILES: Partial<Record<Framework, string[]>> = {
  next: ["app/layout.tsx", "src/app/layout.tsx"],
  vite: ["src/main.tsx"],
  start: ["src/routes/__root.tsx"],
  "react-router": ["app/root.tsx"],
}

const SHELL_SNIPPET =
  'wrap your routes in <AppShellLayout pathname={pathname}> from "@/components/app-shell-layout"'
const SOUNDS_SNIPPET =
  'render <SoundEffects /> from "@/components/sound-effects" once near the root of your app'

function withAlias(componentsAlias: string | undefined) {
  return componentsAlias ? { componentsAlias } : {}
}

/** Where `add` put the components, as the project imports them. */
function getComponentsAlias(appDir: string) {
  const read = readComponentsJson(appDir)
  const aliases =
    read.exists && "config" in read ? read.config.aliases : undefined
  const alias =
    aliases && typeof aliases === "object"
      ? Reflect.get(aliases, "components")
      : undefined
  return typeof alias === "string" ? alias : undefined
}

function mountAstro(context: SetupContext, appDir: string) {
  const { setup, notes } = context
  if (setup.appShell) {
    notes.push(`Astro renders the App Shell as an island: ${SHELL_SNIPPET}.`)
  }
  if (!setup.sound) return
  const mounted = ["src/pages/index.astro", "src/layouts/main.astro"].some(
    (relative) => {
      const file = path.join(appDir, relative)
      const source = readIfExists(file)
      const next = source && mountAstroRoot(source, getComponentsAlias(appDir))
      if (!next) return false
      writeFileSync(file, next)
      return true
    }
  )
  if (!mounted) notes.push(`To turn sounds on, ${SOUNDS_SNIPPET}.`)
}

function mountWeb(
  context: SetupContext,
  appDir: string,
  framework: Framework | undefined
) {
  const { setup, notes } = context
  if (!setup.appShell && !setup.sound) return
  if (framework === "astro") {
    mountAstro(context, appDir)
    return
  }
  const relative = WEB_ROOT_FILES[framework ?? "next"]?.find((candidate) =>
    existsSync(path.join(appDir, candidate))
  )
  const file = relative && path.join(appDir, relative)
  const source = file ? readIfExists(file) : undefined
  const next =
    source && framework
      ? mountWebRoot(source, framework, {
          shell: setup.appShell,
          sounds: setup.sound,
          ...withAlias(getComponentsAlias(appDir)),
        })
      : null
  if (file && next) {
    writeFileSync(file, next)
    return
  }
  if (setup.appShell) notes.push(`To finish the App Shell, ${SHELL_SNIPPET}.`)
  if (setup.sound) notes.push(`To turn sounds on, ${SOUNDS_SNIPPET}.`)
}

function cssImportFrom(appDir: string, layout: string) {
  const cssEntry = findCssEntry((relative) =>
    existsSync(path.join(appDir, relative))
  )
  const relative = path
    .relative(
      path.dirname(path.join(appDir, layout)),
      path.join(appDir, cssEntry)
    )
    .split(path.sep)
    .join("/")
  return relative.startsWith(".") ? relative : `./${relative}`
}

function mountNative(context: SetupContext, appDir: string) {
  const { setup, notes } = context
  const layout = ["src/app/_layout.tsx", "app/_layout.tsx"].find((candidate) =>
    existsSync(path.join(appDir, candidate))
  )
  const file = layout && path.join(appDir, layout)
  const source = file ? readIfExists(file) : undefined
  const next =
    source && layout
      ? mountNativeRoot(source, {
          shell: setup.appShell,
          sounds: setup.sound,
          cssImport: cssImportFrom(appDir, layout),
        })
      : null
  if (file && next) {
    writeFileSync(file, next)
    return
  }
  notes.push(
    'Wrap your root layout in <FabricatorRoot> from "@/components/ui/fabricator-root", and import your stylesheet there once.'
  )
}

const mount: Step = async (context) => {
  const { setup, webDir, mobileDir } = context
  if (setup.project === "existing") {
    for (const target of getExistingTargets(context.cwd)) {
      if (target.isNative) mountNative(context, target.dir)
      else mountWeb(context, target.dir, detectFramework(target.dir))
    }
    return
  }
  if (hasExpoApp(setup)) {
    mountNative(context, mobileDir)
    writeNativePages(mobileDir)
  }
  if (!hasWebApp(setup)) return
  mountWeb(context, webDir, setup.framework)
  if (setup.appShell) {
    context.notes.push(...writeWebPages(webDir, setup.framework))
  }
}

const agents: Step = async (context) => {
  const { setup, root } = context
  if (setup.skill) writeSkill(root, setup.assistants)
  if (setup.mcp) {
    const clients: McpClient[] = setup.assistants
    const appDir =
      setup.project !== "monorepo"
        ? undefined
        : hasWebApp(setup)
          ? "apps/web"
          : "apps/mobile"
    writeMcpConfigs(root, clients, appDir)
    if (clients.includes("codex")) {
      context.notes.push(
        "Codex reads .codex/config.toml once you trust the project: it asks the next time it starts here."
      )
    }
  }
}

const documentProject: Step = async ({ root, setup, packageManager }) => {
  writeProjectDocs(root, setup, packageManager)
}

const formatCode: Step = async (context) => {
  const { setup, root, packageManager } = context
  if (setup.tooling === "eslint-prettier") return
  const { command, args } = buildFixCommand(setup.tooling, root)
  try {
    await runLogged(command, args, {
      cwd: root,
      logFile: context.logFile,
      stream: context.stream,
    })
  } catch {
    // Formatting always applies; only lint findings it can't fix land here.
    context.notes.push(
      `Some lint findings need a person. See them with \`${packageManager} run check\`.`
    )
  }
}

const firstCommit: Step = async (context) => {
  const { root } = context
  try {
    if (!existsSync(path.join(root, ".git"))) await git(context, ["init"])
    await git(context, ["add", "-A"])
    const isFresh = await git(context, ["rev-parse", "--verify", "HEAD"]).then(
      () => false,
      () => true
    )
    await git(
      context,
      isFresh
        ? ["commit", "-m", "feat: initial commit"]
        : ["commit", "--amend", "--no-edit"]
    )
  } catch {
    context.notes.push(
      "Couldn't make the first commit. Commit the project yourself: everything is in place."
    )
  }
}

/** The apps an existing project's setup applies to. */
export function getExistingTargets(cwd: string) {
  if (
    existsSync(path.join(cwd, "components.json")) ||
    findWorkspaceRoot(cwd) !== cwd
  ) {
    return [{ dir: cwd, isNative: isReactNativeProject(readPackageJson(cwd)) }]
  }
  const apps = listWorkspaceApps(cwd)
  return apps.length > 0
    ? apps
    : [{ dir: cwd, isNative: isReactNativeProject(readPackageJson(cwd)) }]
}

async function isGitDirty(context: SetupContext, cwd: string) {
  const result = await new Promise<string>((resolve) => {
    import("node:child_process").then(({ execFile }) => {
      execFile("git", ["status", "--porcelain"], { cwd }, (error, stdout) =>
        resolve(error ? "" : stdout)
      )
    })
  })
  return result.trim() !== "" && !context.force
}

async function setUpExistingWeb(context: SetupContext, dir: string) {
  const { setup, baseUrl } = context
  const framework = detectFramework(dir)
  const items = (await webItemsFor(context, framework)).filter(
    // An existing project keeps the button it has.
    (item) => item !== "@fabricator/button"
  )
  const read = readComponentsJson(dir)
  const initUrl = buildSetupInitUrl(setup, baseUrl)
  if (!read.exists) {
    await shadcn(context, [
      "init",
      initUrl,
      ...items,
      "--base",
      setup.base,
      "--yes",
      "--cwd",
      dir,
    ])
    return
  }
  ensureRegistry(dir, fabricatorRegistryTemplate(baseUrl))
  alignWorkspaceAliases(dir)
  if (Object.keys(setup.look).length > 0) {
    if (await isGitDirty(context, dir)) {
      throw new Error(
        "Applying a look reinstalls your components, and this project has uncommitted work. Commit it first, or pass --force."
      )
    }
    await shadcn(context, ["apply", "--preset", initUrl, "--yes", "--cwd", dir])
  }
  if (items.length > 0) {
    await shadcn(context, ["add", ...items, "--yes", "--cwd", dir])
  }
  syncWorkspaceAfterAdd(dir)
}

const setupExisting: Step = async (context) => {
  for (const target of getExistingTargets(context.cwd)) {
    if (target.isNative) await setUpNativeApp(context, target.dir)
    else await setUpExistingWeb(context, target.dir)
  }
}

export const STEPS: Record<StepId, Step> = {
  "scaffold-monorepo": scaffoldMonorepo,
  "scaffold-web": scaffoldWeb,
  "scaffold-package-web": scaffoldPackageWeb,
  "scaffold-laravel": scaffoldLaravel,
  "setup-existing": setupExisting,
  "setup-package": setUpReactPackage,
  "configure-monorepo": configureMonorepo,
  "add-web-items": addWebItems,
  "scaffold-mobile": scaffoldMobile,
  "scaffold-tauri-mobile": scaffoldTauriMobile,
  "scaffold-desktop": scaffoldDesktop,
  "configure-workspace": configureWorkspace,
  "configure-package-mobile": (context) =>
    configureNativePackage(context, context.mobileDir, true),
  "configure-tooling": configureTooling,
  install,
  "setup-mobile": setupMobile,
  mount,
  agents,
  "format-code": formatCode,
  "write-project-docs": documentProject,
  "first-commit": firstCommit,
}

/** Steps that talk to the person, so the runner steps aside. */
export const INTERACTIVE_STEPS: readonly StepId[] = ["scaffold-laravel"]
