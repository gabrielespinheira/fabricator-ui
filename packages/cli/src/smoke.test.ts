import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const bin = path.join(root, "dist", "index.js")

// Build once if dist is missing and bun is available; otherwise skip.
if (!existsSync(bin)) {
  try {
    execFileSync("bun", ["run", "build"], { cwd: root, stdio: "ignore" })
  } catch {
    // bun not on PATH
  }
}

function run(args: string[], cwd = root, env: NodeJS.ProcessEnv = {}): string {
  const { FABRICATOR_REGISTRY_URL: _ignored, ...rest } = process.env
  return execFileSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...rest, NO_COLOR: "1", ...env },
  })
}

describe.skipIf(!existsSync(bin))("built CLI (node dist/index.js)", () => {
  it("prints help with every command", () => {
    const help = run(["--help"])
    expect(help).toContain("fabricator-ui")
    for (const command of [
      "init",
      "add",
      "apply",
      "search",
      "view",
      "docs",
      "diff",
      "info",
      "doctor",
      "mcp",
    ]) {
      expect(help).toContain(command)
    }
  })

  it("prints the version", () => {
    expect(run(["--version"]).trim()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it("prints the exact shadcn command for init --dry-run", () => {
    const dir = realpathSync(
      mkdtempSync(path.join(tmpdir(), "fabricator-smoke-"))
    )
    try {
      const output = run(["init", "--dry-run", "-t", "next"], dir)
      expect(output).toContain(
        `init "https://fabricator-ui.com/init?base=base&preset=fabricator&template=next" --template next --base base --cwd ${dir}`
      )
      expect(output).toContain(
        `add @fabricator/button --overwrite --yes --cwd ${path.join(dir, "next-app")}`
      )

      const local = run(["init", "--dry-run"], dir, {
        FABRICATOR_REGISTRY_URL: "http://localhost:4000/",
      })
      expect(local).toContain(
        '"http://localhost:4000/init?base=base&preset=fabricator"'
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
