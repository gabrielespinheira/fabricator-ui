import { execFile } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

const execute = promisify(execFile)
const cli = path.resolve("src/index.ts")
let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(os.tmpdir(), "fabricator-init-package-"))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

function runPackageInit(platform: string) {
  return execute(
    "bun",
    [
      cli,
      "init",
      "--distribution",
      "package",
      "--platform",
      platform,
      "--dry-run",
      "--cwd",
      cwd,
    ],
    { env: { ...process.env, FABRICATOR_REGISTRY_URL: "http://127.0.0.1:1" } }
  )
}

function writePackageJson(dependencies: Record<string, string>) {
  return writeFile(
    path.join(cwd, "package.json"),
    JSON.stringify({ name: "app", private: true, dependencies })
  )
}

describe("init --distribution package --platform", () => {
  it("checks an Expo app for package setup with --platform native", async () => {
    await writePackageJson({ expo: "~1.0.0", react: "19.2.0" })
    await expect(runPackageInit("native")).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("Package setup requires an Expo SDK"),
    })
  })

  it("names the platform a web app is when --platform native", async () => {
    await writePackageJson({
      react: "19.2.0",
      "react-dom": "19.2.0",
      vite: "8.0.0",
    })
    await writeFile(path.join(cwd, "vite.config.ts"), "export default {}\n")
    await expect(runPackageInit("native")).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("--platform web"),
    })
  })
})
