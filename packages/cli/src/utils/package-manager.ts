import { existsSync } from "node:fs"
import path from "node:path"
import { PACKAGE_MANAGERS, type PackageManager } from "@fabricator-ui/setup"

const LOCKFILES: Record<string, PackageManager> = {
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
}

/** The package manager that ran this command, from npm's user agent. */
export function getRunningPackageManager(
  env: NodeJS.ProcessEnv = process.env
): PackageManager {
  const name = env.npm_config_user_agent?.split("/")[0]
  return PACKAGE_MANAGERS.find((manager) => manager === name) ?? "npm"
}

/** A project's own package manager: its lockfile, or whatever ran this. */
export function detectPackageManager(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): PackageManager {
  for (const [file, manager] of Object.entries(LOCKFILES)) {
    if (existsSync(path.join(cwd, file))) return manager
  }
  return getRunningPackageManager(env)
}

/** CI defaults to a frozen lockfile, which nothing here wants. */
export function buildInstallArgs(packageManager: PackageManager) {
  switch (packageManager) {
    case "pnpm":
      return ["install", "--no-frozen-lockfile"]
    case "yarn":
      return ["install", "--no-immutable"]
    case "npm":
      return ["install", "--no-audit", "--no-fund"]
    case "bun":
      return ["install"]
  }
}

/** Runs a package from the registry with the project's package manager. */
export function buildDlxCommand(
  packageManager: PackageManager,
  args: string[]
) {
  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["dlx", ...args] }
    case "yarn":
      return { command: "yarn", args: ["dlx", ...args] }
    case "bun":
      return { command: "bunx", args }
    case "npm":
      return { command: "npx", args: ["--yes", ...args] }
  }
}
