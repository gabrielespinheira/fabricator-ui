import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { Command } from "commander"

import {
  getBaseFromStyle,
  getRegistryUrl,
  LEGACY_STYLES,
  readComponentsJson,
  STYLE_PATTERN,
  type ComponentsJson,
  type ReadResult,
} from "../utils/config"
import { highlight, logger } from "../utils/logger"
import { NAMESPACE } from "../utils/names"
import { captureShadcn } from "../utils/shadcn"
import {
  blendRegistryTemplate,
  fabricatorRegistryTemplate,
  getBaseUrl,
} from "../utils/urls"
import { fail, resolveCwd } from "./shared"

export type CheckStatus = "pass" | "warn" | "fail"

export interface Check {
  status: CheckStatus
  label: string
  fix?: string
}

interface ShadcnInfo {
  project?: { tailwindVersion?: string | null; tailwindCss?: string | null }
}

type PackageJson = Partial<
  Record<
    "dependencies" | "devDependencies" | "peerDependencies",
    Record<string, string>
  >
>

export interface DoctorInput {
  componentsJson: ReadResult
  info?: ShadcnInfo
  infoError?: string
  packageJson?: PackageJson
  /** `undefined` when components.json has no `tailwind.css`; `null` when the file does not exist. */
  css?: string | null
  cssPath?: string
  baseUrl: string
}

const STYLE_IDS = "<base>-<style>, e.g. base-nova"

function dependencyVersion(
  pkg: PackageJson | undefined,
  name: string
): string | undefined {
  return (
    pkg?.dependencies?.[name] ??
    pkg?.devDependencies?.[name] ??
    pkg?.peerDependencies?.[name]
  )
}

/** First number in a semver range: `^19.2.0` → 19. `undefined` for `latest`, `workspace:*`, … */
export function majorVersion(range: string): number | undefined {
  const match = /(\d+)/.exec(range)
  return match ? Number(match[1]) : undefined
}

export function collectChecks(input: DoctorInput): Check[] {
  const checks: Check[] = []
  const read = input.componentsJson

  if (!read.exists) {
    checks.push({
      status: "fail",
      label: "components.json not found",
      fix: `Run ${highlight.info("fabricator-ui init")} in your project, or pass ${highlight.info("-c <path>")}.`,
    })
  } else if ("error" in read) {
    checks.push({
      status: "fail",
      label: `components.json is not valid JSON (${read.error})`,
      fix: "Fix the syntax error, or re-run fabricator-ui init --force.",
    })
  } else {
    checks.push({ status: "pass", label: "components.json found and valid" })
  }
  const config: ComponentsJson | undefined =
    read.exists && "config" in read ? read.config : undefined

  if (config) {
    const style = config.style
    if (typeof style === "string" && STYLE_PATTERN.test(style)) {
      checks.push({
        status: "pass",
        label: `style is a valid style id (${style})`,
      })
    } else if (typeof style === "string" && LEGACY_STYLES.includes(style)) {
      checks.push({
        status: "warn",
        label: `style "${style}" is a legacy style id`,
        fix: `Fabricator items are published for ${STYLE_IDS}. Migrate with ${highlight.info("fabricator-ui init --force")}.`,
      })
    } else {
      checks.push({
        status: "fail",
        label: `style ${style === undefined ? "is missing" : `"${String(style)}" is not a valid style id`}`,
        fix: `Set "style" to ${STYLE_IDS}. Never use a Fabricator name there; the look comes from the registry URL.`,
      })
    }

    const registry = getRegistryUrl(config, NAMESPACE)
    if (registry) {
      const mode =
        registry === fabricatorRegistryTemplate(input.baseUrl) ||
        registry.includes("/r/fabricator/")
          ? "Fabricator mode"
          : registry === blendRegistryTemplate(input.baseUrl) ||
              /\/r\/\{style\}\//.test(registry)
            ? "blend mode"
            : "custom URL"
      checks.push({
        status: "pass",
        label: `${NAMESPACE} registry configured (${mode})`,
      })
    } else {
      checks.push({
        status: "fail",
        label: `${NAMESPACE} registry not configured`,
        fix: `Run ${highlight.info("fabricator-ui init")} and choose "Add the @fabricator registry only", or add "${NAMESPACE}": "${fabricatorRegistryTemplate(input.baseUrl)}" to "registries".`,
      })
    }

    const tailwindConfig = config.tailwind?.config
    const version = input.info?.project?.tailwindVersion
    if (version === "v4" || (version == null && tailwindConfig === "")) {
      checks.push({ status: "pass", label: "Tailwind CSS v4" })
    } else if (
      version === "v3" ||
      (typeof tailwindConfig === "string" && tailwindConfig !== "")
    ) {
      checks.push({
        status: "fail",
        label: `Tailwind CSS ${version ?? "v3"} detected (tailwind.config is set)`,
        fix: "Fabricator UI needs Tailwind v4. See https://tailwindcss.com/docs/upgrade-guide.",
      })
    } else {
      checks.push({
        status: "warn",
        label: "Could not detect the Tailwind CSS version",
        fix: "Make sure the project uses Tailwind v4.",
      })
    }
  }

  const react = dependencyVersion(input.packageJson, "react")
  if (!input.packageJson) {
    checks.push({
      status: "fail",
      label: "package.json not found",
      fix: "Run doctor from your app's directory (-c <path>).",
    })
  } else if (!react) {
    checks.push({
      status: "fail",
      label: "react is not a dependency",
      fix: "Install React 19: npm install react@19 react-dom@19.",
    })
  } else {
    const major = majorVersion(react)
    if (major === undefined) {
      checks.push({
        status: "warn",
        label: `Could not read the React version (${react})`,
        fix: "Fabricator UI needs React 19.",
      })
    } else if (major >= 19) {
      checks.push({ status: "pass", label: `React ${major}` })
    } else {
      checks.push({
        status: "fail",
        label: `React ${major} detected`,
        fix: "Fabricator UI needs React 19: npm install react@19 react-dom@19.",
      })
    }
  }

  if (config) {
    if (input.css === undefined) {
      checks.push({
        status: "warn",
        label: 'components.json has no "tailwind.css" path',
        fix: "Set tailwind.css to your global stylesheet.",
      })
    } else if (input.css === null) {
      checks.push({
        status: "fail",
        label: `CSS file not found (${input.cssPath})`,
        fix: 'Fix "tailwind.css" in components.json.',
      })
    } else if (
      /@import\s+(url\()?\s*["']shadcn\/tailwind\.css["']/.test(input.css)
    ) {
      checks.push({
        status: "pass",
        label: `${input.cssPath} imports shadcn/tailwind.css`,
      })
    } else {
      checks.push({
        status: "fail",
        label: `${input.cssPath} does not import shadcn/tailwind.css`,
        fix: `Add ${highlight.info('@import "shadcn/tailwind.css";')} and install the ${highlight.info("shadcn")} package, or run ${highlight.info("fabricator-ui apply")}.`,
      })
    }
  }

  if (input.packageJson) {
    if (dependencyVersion(input.packageJson, "cn")) {
      checks.push({ status: "pass", label: "cn is installed" })
    } else {
      checks.push({
        status: "warn",
        label: "cn is not a dependency",
        fix: `It is installed with ${highlight.info("@fabricator/utils")} on your next ${highlight.info("fabricator-ui add")}, or run ${highlight.info("npm install cn")}.`,
      })
    }
  }

  if (input.infoError) {
    checks.push({
      status: "warn",
      label: `could not read project info: ${input.infoError}`,
    })
  }

  return checks
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch {
    return undefined
  }
}

async function gather(cwd: string): Promise<DoctorInput> {
  const componentsJson = readComponentsJson(cwd)
  const input: DoctorInput = { componentsJson, baseUrl: getBaseUrl() }

  if (componentsJson.exists) {
    const result = await captureShadcn(["info", "--json", "--cwd", cwd])
    if (result.code === 0) {
      try {
        input.info = JSON.parse(result.stdout) as ShadcnInfo
      } catch {
        input.infoError = "unreadable output"
      }
    } else {
      input.infoError =
        (result.stderr || result.stdout).trim().split("\n").find(Boolean) ??
        `exit code ${result.code}`
    }
  }

  const pkgPath = path.join(cwd, "package.json")
  if (existsSync(pkgPath))
    input.packageJson = readJson<PackageJson>(pkgPath) ?? {}

  const config =
    componentsJson.exists && "config" in componentsJson
      ? componentsJson.config
      : undefined
  const cssSetting =
    typeof config?.tailwind?.css === "string" && config.tailwind.css
      ? config.tailwind.css
      : undefined
  if (cssSetting) {
    input.cssPath = cssSetting
    const cssFile = path.resolve(cwd, cssSetting)
    input.css = existsSync(cssFile) ? readFileSync(cssFile, "utf8") : null
  }
  return input
}

const ICONS: Record<CheckStatus, string> = {
  pass: highlight.success("✔"),
  warn: highlight.warn("⚠"),
  fail: highlight.error("✖"),
}

export async function doctor(options: { cwd?: string }): Promise<void> {
  const cwd = resolveCwd(options.cwd)
  const input = await gather(cwd)
  const checks = collectChecks(input)
  const read = input.componentsJson
  const base = getBaseFromStyle(
    read.exists && "config" in read ? read.config.style : undefined
  )

  logger.log(
    `${highlight.bold("fabricator-ui doctor")} ${highlight.dim(cwd)}${base ? highlight.dim(` (base: ${base})`) : ""}`
  )
  logger.break()
  for (const check of checks) {
    logger.log(`${ICONS[check.status]} ${check.label}`)
    if (check.fix && check.status !== "pass")
      logger.log(`    ${highlight.dim("→")} ${check.fix}`)
  }
  logger.break()

  const failures = checks.filter((check) => check.status === "fail").length
  const warnings = checks.filter((check) => check.status === "warn").length
  if (failures) {
    logger.log(
      highlight.error(`${failures} problem${failures === 1 ? "" : "s"} found.`)
    )
    process.exitCode = 1
  } else {
    logger.log(
      highlight.success(
        `All good${warnings ? ` (${warnings} warning${warnings === 1 ? "" : "s"})` : ""}.`
      )
    )
  }
}

export function createDoctorCommand(): Command {
  return new Command("doctor")
    .description("check that your project is ready for Fabricator UI")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(async (options: { cwd?: string }) => {
      try {
        await doctor(options)
      } catch (error) {
        fail(error)
      }
    })
}
