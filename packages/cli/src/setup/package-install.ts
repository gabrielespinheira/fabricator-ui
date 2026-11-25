import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import {
  REACT_NATIVE_PACKAGE,
  REACT_NATIVE_PACKAGE_STYLES,
  REACT_PACKAGE,
  REACT_PACKAGE_STYLES,
  type PackageManager,
} from "@fabricator-ui/setup"
import { z } from "zod"

import nativePackage from "../../../react-native/package.json" with { type: "json" }
import cliPackage from "../../package.json" with { type: "json" }
import { detectFramework } from "../utils/frameworks"
import {
  findCssEntry,
  isExpoProject,
  isReactNativeProject,
  readPackageJson,
} from "../utils/native"
import {
  buildInstallArgs,
  detectPackageManager,
} from "../utils/package-manager"
import { runLogged } from "../utils/process"
import { findWorkspaceRoot, listWorkspaceApps } from "../utils/workspace"
import {
  configureNativePackage,
  validateExpoPackageTarget,
} from "./package-native"
import type { SetupContext } from "./steps"

const THEME_FILE = "fabricator-theme.css"
const cssVars = z.record(
  z.string().regex(/^[a-z0-9-]+$/),
  z.string().regex(/^[^;{}<>]+$/)
)
const lookResponse = z.object({ light: cssVars, dark: cssVars })
const installedManifest = z.object({ version: z.string() })

export function getPackageDeclaration(directory: string) {
  return readPackageJson(directory)?.dependencies?.[
    getComponentPackage(directory)
  ]
}

export function getComponentPackage(directory: string) {
  return isExpoProject(readPackageJson(directory))
    ? REACT_NATIVE_PACKAGE
    : REACT_PACKAGE
}

export function getPackageOnlyDirectory(cwd: string) {
  if (
    getPackageDeclaration(cwd) &&
    !existsSync(path.join(cwd, "components.json"))
  )
    return cwd
  if (findWorkspaceRoot(cwd) !== cwd) return undefined
  const targets = listWorkspaceApps(cwd, { includePackages: true })
  if (targets.length !== 1) return undefined
  const target = targets[0]?.dir
  return target &&
    getPackageDeclaration(target) &&
    !existsSync(path.join(target, "components.json"))
    ? target
    : undefined
}

export function findPackageTarget(cwd: string) {
  const app = readPackageJson(cwd)
  if (isExpoProject(app)) {
    validateExpoPackageTarget(cwd)
    return "expo"
  }
  const framework = detectFramework(cwd)
  if (
    (framework === "next" || framework === "vite") &&
    !isReactNativeProject(app) &&
    app?.dependencies?.react &&
    app.dependencies["react-dom"]
  ) {
    const react = resolveVersion(cwd, "react")
    const reactDom = resolveVersion(cwd, "react-dom")
    if (
      (react && !react.startsWith("19.")) ||
      (reactDom && !reactDom.startsWith("19.")) ||
      (react && reactDom && react !== reactDom)
    ) {
      throw new Error(
        "The Fabricator UI package requires matching React 19 and React DOM 19 versions."
      )
    }
    if (
      framework === "next" &&
      !["app", "src/app"].some((directory) =>
        existsSync(path.join(cwd, directory))
      )
    ) {
      throw new Error(
        "Package setup supports Next.js App Router projects. Import the package and stylesheet manually for another layout."
      )
    }
    return framework
  }
  if (findWorkspaceRoot(cwd) === cwd) {
    const apps = path.join(cwd, "apps")
    const candidates = existsSync(apps)
      ? readdirSync(apps).filter((name) => {
          const directory = path.join(apps, name)
          const target = detectFramework(directory)
          return (
            target === "next" ||
            target === "vite" ||
            isExpoProject(readPackageJson(directory))
          )
        })
      : []
    if (candidates.length)
      throw new Error(
        `Choose a React or Expo workspace with --cwd (${candidates.map((name) => `apps/${name}`).join(", ")}).`
      )
  }
  throw new Error(
    "Package setup supports Next.js App Router, Vite React and Expo projects. Run it in the app's directory."
  )
}

type PackageFramework = Exclude<ReturnType<typeof findPackageTarget>, "expo">

function entryText(root: string, framework: PackageFramework) {
  const entries =
    framework === "next"
      ? ["app/layout", "src/app/layout"]
      : ["src/main", "main"]
  for (const name of entries) {
    for (const extension of [".tsx", ".jsx", ".js", ".ts"]) {
      const entry = path.join(root, `${name}${extension}`)
      if (existsSync(entry))
        return { entry, source: readFileSync(entry, "utf8") }
    }
  }
  return undefined
}

export function findPackageStylesheet(
  root: string,
  framework: PackageFramework
) {
  const entry = entryText(root, framework)
  if (!entry) return undefined
  const imports = [
    ...entry.source.matchAll(/^\s*import\s*["'](\.\/[^"'\r\n]+\.css)["']/gm),
  ]
  const name = imports.length === 1 ? imports[0]?.[1] : undefined
  if (!name) return undefined
  const css = path.resolve(path.dirname(entry.entry), name)
  if (!existsSync(css)) return undefined
  const relative = path.relative(realpathSync(root), realpathSync(css))
  return relative.startsWith("..") || path.isAbsolute(relative)
    ? undefined
    : css
}

function hasPackageImport(css: string) {
  return /(?:@import|import)\s*["']@fabricator-ui\/react\/styles\.css["']/.test(
    css
  )
}

export function wirePackageStyles(
  root: string,
  framework: PackageFramework,
  look: string
) {
  const entry = entryText(root, framework)
  const isLoadedByEntry = hasPackageImport(entry?.source ?? "")
  const filename = findPackageStylesheet(root, framework)
  if (!filename) {
    return [
      ...(isLoadedByEntry
        ? []
        : [
            `Add import "${REACT_PACKAGE_STYLES}" to your app entry or root layout.`,
          ]),
      ...(look
        ? [`Place these theme overrides in your app stylesheet:\n${look}`]
        : []),
    ]
  }
  const css = readFileSync(filename, "utf8")
  const imports =
    isLoadedByEntry || hasPackageImport(css)
      ? []
      : [`@import "${REACT_PACKAGE_STYLES}";`]
  const notes: string[] = []
  if (look) {
    const theme = path.join(path.dirname(filename), THEME_FILE)
    if (!existsSync(theme)) writeFileSync(theme, look, { flag: "wx" })
    else if (readFileSync(theme, "utf8") !== look)
      notes.push(
        `Update ${path.relative(root, theme)} with these theme overrides:\n${look}`
      )
    if (!/\bimport\s*["']\.\/fabricator-theme\.css["']/.test(css))
      imports.push(`@import "./${THEME_FILE}";`)
  }
  if (imports.length) {
    const charset = /^@charset [^;]+;\r?\n?/.exec(css)?.[0] ?? ""
    writeFileSync(
      filename,
      `${charset}${imports.join("\n")}\n${css.slice(charset.length)}`
    )
  }
  return notes
}

function resolveVersion(directory: string, name: string) {
  const require = createRequire(path.join(directory, "package.json"))
  let manifest: string
  try {
    manifest =
      name === REACT_PACKAGE || name === REACT_NATIVE_PACKAGE
        ? path.resolve(
            path.dirname(require.resolve(`${name}/styles.css`)),
            "../package.json"
          )
        : require.resolve(`${name}/package.json`)
  } catch {
    return undefined
  }
  return installedManifest.parse(JSON.parse(readFileSync(manifest, "utf8")))
    .version
}

export function getPackageStatus(directory: string) {
  const componentPackage = getComponentPackage(directory)
  const isNative = componentPackage === REACT_NATIVE_PACKAGE
  const framework = detectFramework(directory)
  const entry =
    framework === "next" || framework === "vite"
      ? entryText(directory, framework)
      : undefined
  const css =
    framework === "next" || framework === "vite"
      ? findPackageStylesheet(directory, framework)
      : undefined
  const react = resolveVersion(directory, "react")
  const reactDom = isNative ? undefined : resolveVersion(directory, "react-dom")
  const reactNative = isNative
    ? resolveVersion(directory, "react-native")
    : undefined
  const nativeStylesheet = isNative
    ? path.join(
        directory,
        findCssEntry((entry) => existsSync(path.join(directory, entry)))
      )
    : undefined
  return {
    distribution: "package",
    package: componentPackage,
    declaration: getPackageDeclaration(directory),
    version: resolveVersion(directory, componentPackage),
    react,
    reactDom,
    reactNative,
    hasCompatibleReact: isNative
      ? react === nativePackage.peerDependencies.react &&
        reactNative === nativePackage.peerDependencies["react-native"]
      : Boolean(
          react?.startsWith("19.") &&
            reactDom?.startsWith("19.") &&
            react === reactDom
        ),
    hasStyles: isNative
      ? Boolean(
          nativeStylesheet &&
            existsSync(nativeStylesheet) &&
            readFileSync(nativeStylesheet, "utf8").includes(
              REACT_NATIVE_PACKAGE_STYLES
            )
        )
      : hasPackageImport(entry?.source ?? "") ||
        Boolean(css && hasPackageImport(readFileSync(css, "utf8"))),
    hasRegistry: existsSync(path.join(directory, "components.json")),
  }
}

export const REACT_PACKAGE_VERSION = cliPackage.version

export async function fetchPackageLook({ setup, baseUrl }: SetupContext) {
  if (Object.keys(setup.look).length === 0) return ""
  const url = new URL(`${baseUrl}/init`)
  url.search = new URLSearchParams({
    ...setup.look,
    distribution: "package",
  }).toString()
  const result = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!result.ok) {
    const error = z.object({ error: z.string() }).safeParse(await result.json())
    throw new Error(
      error.success
        ? error.data.error
        : `Could not load your theme (${result.status}).`
    )
  }
  const look = lookResponse.parse(await result.json())
  return Object.entries({ ":root": look.light, ".dark": look.dark })
    .map(([selector, values]) => {
      const lines = Object.entries(values).map(
        ([key, value]) => `  --${key}: ${value};`
      )
      return lines.length ? `${selector} {\n${lines.join("\n")}\n}\n` : ""
    })
    .join("\n")
}

function addPackageArgs(packageManager: PackageManager) {
  const command =
    packageManager === "npm"
      ? ["install", "--save-exact", "--no-audit", "--no-fund"]
      : ["add", "--exact"]
  return [...command, `${REACT_PACKAGE}@${REACT_PACKAGE_VERSION}`]
}

export async function setUpReactPackage(context: SetupContext) {
  const { cwd, logFile, stream } = context
  const framework = findPackageTarget(cwd)
  const root = findWorkspaceRoot(cwd) ?? cwd
  const packageManager = detectPackageManager(root)
  if (framework === "expo") {
    await configureNativePackage(context, cwd, false)
    await runLogged(packageManager, buildInstallArgs(packageManager), {
      cwd: root,
      logFile,
      stream,
    })
    return
  }
  const look = await fetchPackageLook(context)
  const isDeclared = Boolean(getPackageDeclaration(cwd))
  if (!isDeclared || !resolveVersion(cwd, REACT_PACKAGE)) {
    await runLogged(
      packageManager,
      isDeclared
        ? buildInstallArgs(packageManager)
        : addPackageArgs(packageManager),
      {
        cwd: isDeclared ? root : cwd,
        logFile,
        stream,
      }
    )
  }
  context.notes.push(...wirePackageStyles(cwd, framework, look))
}
