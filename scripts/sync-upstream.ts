/**
 * Import shadcn/ui upstream into the `upstream/shadcn` vendor branch.
 *
 * The vendor branch holds pristine upstream files mapped to this repo's
 * layout (apps/v4 -> apps/web). Fabricator changes live on `main`; merging the
 * vendor branch into `main` turns every upstream upgrade into a normal,
 * reviewable 3-way merge (PLAN.md D10, AGENTS.md "Upstream sync").
 *
 * Usage:
 *   bun run sync:upstream --ref <sha|tag|branch>   # default: main
 *   bun run sync:upstream --ref main --dry-run     # import, show stats, no commit
 *
 * Then:
 *   git merge upstream/shadcn                      # first time: --allow-unrelated-histories
 *   bun run rebrand && bun run registry:build && bun run test:parity --styles all
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const UPSTREAM_REPO = "https://github.com/shadcn-ui/ui.git"
const VENDOR_BRANCH = "upstream/shadcn"
const WORKTREE_DIR = path.join(ROOT, ".git", "upstream-worktree")
const LOCK_FILE = "upstream.lock.json"

// Upstream path -> path in this repo.
const PATH_MAP = [{ from: "apps/v4", to: "apps/web" }] as const

// Upstream files that are shadcn-only infrastructure (their registry
// directory, registry health monitoring, legacy v3 registry output, internal
// test harnesses). Kept out of the vendor branch so they never re-enter main.
const EXCLUDED = [
  "node_modules",
  ".next",
  ".source",
  "public/r/styles",
  "public/r/templates",
  "public/r/registries-legacy.json",
  "public/r/themes",
  "public/r/themes.css",
  "public/r/colors",
  "scripts/monitor-registries.mts",
  "scripts/validate-registries.mts",
  "scripts/build-test-app.mts",
  "app/r/registries.json",
  "app/(app)/(styles)",
  "registry/directory.json",
  "registry.json",
  "components/directory-list.tsx",
  "hooks/use-search-registry.ts",
  "lib/registry-health",
  "content/docs/(root)/directory.mdx",
  "content/docs/registry/health.mdx",
]

const args = process.argv.slice(2)
const ref = getArg("--ref") ?? "main"
const dryRun = args.includes("--dry-run")

function getArg(name: string) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

function git(cwd: string, ...gitArgs: string[]) {
  return execFileSync("git", gitArgs, { cwd, encoding: "utf8" }).trim()
}

function branchExists(branch: string) {
  try {
    git(ROOT, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`)
    return true
  } catch {
    return false
  }
}

async function cloneUpstream() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "shadcn-upstream-"))
  console.log(`⬇️  Fetching ${UPSTREAM_REPO}@${ref}...`)
  git(dir, "init", "--quiet")
  git(dir, "remote", "add", "origin", UPSTREAM_REPO)
  git(dir, "config", "core.sparseCheckout", "true")
  await fs.writeFile(
    path.join(dir, ".git/info/sparse-checkout"),
    PATH_MAP.map(({ from }) => `/${from}/`).join("\n") + "\n"
  )
  git(
    dir,
    "fetch",
    "--quiet",
    "--depth",
    "1",
    "--filter=blob:none",
    "origin",
    ref
  )
  git(dir, "checkout", "--quiet", "FETCH_HEAD")
  const sha = git(dir, "rev-parse", "HEAD")
  const date = git(dir, "show", "-s", "--format=%cI", "HEAD")
  return { dir, sha, date }
}

async function prepareWorktree() {
  await fs.rm(WORKTREE_DIR, { recursive: true, force: true })
  try {
    git(ROOT, "worktree", "prune")
  } catch {}

  if (branchExists(VENDOR_BRANCH)) {
    git(ROOT, "worktree", "add", "--quiet", WORKTREE_DIR, VENDOR_BRANCH)
  } else {
    // Orphan branch: upstream history stays separate from main's.
    git(
      ROOT,
      "worktree",
      "add",
      "--quiet",
      "--orphan",
      "-b",
      VENDOR_BRANCH,
      WORKTREE_DIR
    )
  }
}

async function copyMappedPaths(upstreamDir: string) {
  for (const { from, to } of PATH_MAP) {
    const target = path.join(WORKTREE_DIR, to)
    await fs.rm(target, { recursive: true, force: true })
    await fs.cp(path.join(upstreamDir, from), target, {
      recursive: true,
      filter: (source) => {
        const relative = path.relative(path.join(upstreamDir, from), source)
        return !EXCLUDED.some(
          (excluded) =>
            relative === excluded ||
            relative.startsWith(`${excluded}${path.sep}`)
        )
      },
    })
  }
}

const upstream = await cloneUpstream()
console.log(`📌 Upstream commit ${upstream.sha} (${upstream.date})`)

try {
  await prepareWorktree()
  await copyMappedPaths(upstream.dir)

  const lock = {
    repository: UPSTREAM_REPO,
    ref,
    sha: upstream.sha,
    date: upstream.date,
    paths: PATH_MAP,
    excluded: EXCLUDED,
  }
  await fs.writeFile(
    path.join(WORKTREE_DIR, LOCK_FILE),
    JSON.stringify(lock, null, 2) + "\n"
  )

  git(WORKTREE_DIR, "add", "-A")
  const stat = git(WORKTREE_DIR, "diff", "--cached", "--shortstat")
  console.log(stat ? `📦 ${stat}` : "📦 No changes since the last sync.")

  if (dryRun || !stat) {
    console.log(
      dryRun ? "🔍 Dry run: nothing committed." : "✅ Already up to date."
    )
  } else {
    git(
      WORKTREE_DIR,
      "commit",
      "--quiet",
      "-m",
      `chore(upstream): sync shadcn-ui/ui@${upstream.sha.slice(0, 7)}`,
      "-m",
      `Imported ${PATH_MAP.map(({ from, to }) => `${from} -> ${to}`).join(", ")} from ${UPSTREAM_REPO} at ${upstream.sha}.`
    )
    console.log(`✅ Committed to ${VENDOR_BRANCH}. Next:`)
    console.log(
      `   git merge ${VENDOR_BRANCH}   (first sync: add --allow-unrelated-histories)`
    )
    console.log(
      "   bun run rebrand && bun run registry:build && bun run test:parity --styles all"
    )
  }
} finally {
  git(ROOT, "worktree", "remove", "--force", WORKTREE_DIR)
  await fs.rm(upstream.dir, { recursive: true, force: true })
}
