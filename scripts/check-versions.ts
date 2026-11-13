// Fabricator versions in lockstep: the root package.json, every workspace package, the desktop
// app's Tauri and Cargo manifests and the lockfiles all carry one version, and CHANGELOG.md opens
// with it. `/release` writes all of them in its version commit; this check fails a pull request
// that leaves one behind, and a `release/v*` branch whose version was never bumped.
//
//   bun run release:check     (CI passes the pull request's branch in RELEASE_BRANCH)
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

type Read = (path: string) => string | null

const VERSION = /^\d+\.\d+\.\d+$/
const RELEASE_BRANCH = /^release\/v(\d+)[.-](\d+)[.-](\d+)$/
const CHANGELOG_HEADING = /^## \[([^\]]+)\]/m

function readJsonVersion(text: string | null): string | null {
  if (text === null) return null
  const { version }: { version?: unknown } = JSON.parse(text)
  return typeof version === "string" ? version : null
}

function readCargoPackage(
  text: string
): { name: string; version: string } | null {
  const section =
    /^\[package\]\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m.exec(text)?.[1] ?? ""
  const name = /^name\s*=\s*"([^"]+)"/m.exec(section)?.[1]
  const version = /^version\s*=\s*"([^"]+)"/m.exec(section)?.[1]
  return name && version ? { name, version } : null
}

function getWorkspaceManifests(paths: readonly string[], read: Read): string[] {
  const root: { workspaces?: string[] } = JSON.parse(
    read("package.json") ?? "{}"
  )
  const patterns = (root.workspaces ?? []).map(
    (pattern) =>
      new RegExp(`^${pattern.replaceAll("*", "[^/]+")}/package\\.json$`)
  )
  return paths.filter((path) => patterns.some((pattern) => pattern.test(path)))
}

function getBunLockVersions(lock: string): Map<string, string> {
  const versions = new Map<string, string>()
  const entry =
    /^ {4}"([^"]+)": \{\n {6}"name": "[^"]+",\n {6}"version": "([^"]+)"/gm
  for (const [, path, version] of lock.matchAll(entry)) {
    if (path && version) versions.set(path, version)
  }
  return versions
}

export function getVersionProblems({
  read,
  paths,
  branch,
}: {
  read: Read
  paths?: readonly string[]
  branch?: string
}): string[] {
  const version = readJsonVersion(read("package.json"))
  if (version === null || !VERSION.test(version))
    return ["package.json has no X.Y.Z version"]

  const problems: string[] = []
  const expect = (path: string, found: string | null) => {
    if (found !== null && found !== version)
      problems.push(`${path} is ${found}, not ${version}`)
  }

  const releaseMatch = branch ? RELEASE_BRANCH.exec(branch) : null
  if (releaseMatch) {
    const released = releaseMatch.slice(1).join(".")
    if (released !== version) {
      problems.push(
        `${branch} releases ${released}, but package.json is ${version}`
      )
      return problems
    }
  }

  // Scaffold templates keep their own versions: they are the starting point of someone else's app.
  const files = (paths ?? []).filter((path) => !path.includes("/templates/"))
  for (const path of getWorkspaceManifests(files, read)) {
    expect(path, readJsonVersion(read(path)))
  }

  expect(
    "apps/mobile/package.json",
    readJsonVersion(read("apps/mobile/package.json"))
  )
  const mobileApp = read("apps/mobile/app.json")
  if (mobileApp !== null) {
    const app: { expo: { version: string } } = JSON.parse(mobileApp)
    expect("apps/mobile/app.json", app.expo.version)
  }

  for (const path of files.filter((file) =>
    file.endsWith("src-tauri/tauri.conf.json")
  )) {
    const found = readJsonVersion(read(path))
    if (found !== null && VERSION.test(found)) expect(path, found)
  }

  for (const path of files.filter((file) =>
    file.endsWith("src-tauri/Cargo.toml")
  )) {
    const crate = readCargoPackage(read(path) ?? "")
    if (!crate) continue
    expect(path, crate.version)
    const lockPath = path.replace(/Cargo\.toml$/, "Cargo.lock")
    const lock = read(lockPath)
    if (lock === null) continue
    const locked = new RegExp(
      `^name = "${crate.name}"\\nversion = "([^"]+)"`,
      "m"
    ).exec(lock)?.[1]
    if (locked && locked !== version) {
      problems.push(
        `${lockPath} lists ${crate.name} at ${locked}, not ${version}`
      )
    }
  }

  const bunLock = read("bun.lock")
  if (bunLock !== null) {
    for (const [path, locked] of getBunLockVersions(bunLock)) {
      if (locked !== version)
        problems.push(`bun.lock lists ${path} at ${locked}, not ${version}`)
    }
  }

  const changelog = read("CHANGELOG.md")
  const opening = changelog ? CHANGELOG_HEADING.exec(changelog)?.[1] : null
  if (opening !== version) {
    problems.push(
      `CHANGELOG.md opens with ${opening ?? "no version"}, not ${version}`
    )
  }
  return problems
}

if (import.meta.main) {
  const paths = execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
  const read: Read = (path) =>
    paths.includes(path) ? readFileSync(path, "utf8") : null
  const problems = getVersionProblems({
    read,
    paths,
    branch: process.env.RELEASE_BRANCH || undefined,
  })
  if (problems.length > 0) {
    console.error(
      `Versions are out of step:\n${problems.map((problem) => `- ${problem}`).join("\n")}`
    )
    console.error(
      "Cut releases with /release, which writes every version file in one commit."
    )
    process.exit(1)
  }
  console.log("Versions are in step.")
}
