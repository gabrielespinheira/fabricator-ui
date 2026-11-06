import { existsSync } from "node:fs"
import path from "node:path"
import type { Framework } from "@fabricator-ui/setup"

import { readPackageJson, type ProjectPackageJson } from "./native"

const DEPENDENCY_SIGNALS: [string, Framework][] = [
  ["expo", "expo"],
  ["next", "next"],
  ["@tanstack/react-start", "start"],
  ["@react-router/dev", "react-router"],
  ["astro", "astro"],
  ["vite", "vite"],
]

function hasDependency(pkg: ProjectPackageJson, name: string) {
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name])
}

/** What a project is built on, from its dependencies. Laravel also uses Vite. */
export function detectFramework(cwd: string): Framework | undefined {
  if (existsSync(path.join(cwd, "artisan"))) return "laravel"
  const pkg = readPackageJson(cwd)
  if (!pkg) return undefined
  return DEPENDENCY_SIGNALS.find(([name]) => hasDependency(pkg, name))?.[1]
}
