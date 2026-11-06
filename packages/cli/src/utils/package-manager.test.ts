import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  buildDlxCommand,
  buildInstallArgs,
  detectPackageManager,
  getRunningPackageManager,
} from "./package-manager"

describe("package managers", () => {
  it("reads the one running this", () => {
    expect(
      getRunningPackageManager({ npm_config_user_agent: "pnpm/11.0.0 node" })
    ).toBe("pnpm")
    expect(getRunningPackageManager({})).toBe("npm")
  })

  it("prefers a project's lockfile", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "fabricator-pm-"))
    writeFileSync(path.join(dir, "pnpm-lock.yaml"), "")
    expect(detectPackageManager(dir, { npm_config_user_agent: "bun/1" })).toBe(
      "pnpm"
    )
    rmSync(dir, { recursive: true, force: true })
  })

  it("never installs with a frozen lockfile", () => {
    expect(buildInstallArgs("pnpm")).toContain("--no-frozen-lockfile")
    expect(buildInstallArgs("yarn")).toContain("--no-immutable")
  })

  it("runs packages through each one's runner", () => {
    expect(buildDlxCommand("npm", ["a"])).toEqual({
      command: "npx",
      args: ["--yes", "a"],
    })
    expect(buildDlxCommand("bun", ["a"]).command).toBe("bunx")
    expect(buildDlxCommand("pnpm", ["a"]).args).toEqual(["dlx", "a"])
  })
})
