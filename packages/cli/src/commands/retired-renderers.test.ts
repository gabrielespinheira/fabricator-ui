import { execFile } from "node:child_process"
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

const execute = promisify(execFile)
const cli = path.resolve("src/index.ts")
let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(os.tmpdir(), "fabricator-retired-"))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

function runCli(...args: string[]) {
  return execute("bun", [cli, ...args, "--cwd", cwd], {
    env: { ...process.env, FABRICATOR_REGISTRY_URL: "http://127.0.0.1:1" },
  })
}

describe("retired renderer commands", () => {
  it.each(["swiftui", "compose"])(
    "rejects an explicit %s install without writing files",
    async (platform) => {
      await expect(
        runCli("init", "--platform", platform, "--yes")
      ).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining("preview has been retired"),
      })
      expect(await readdir(cwd)).toEqual([])
    }
  )

  it.each([
    ["init", "--yes"],
    ["add", "button", "--dry-run"],
    ["apply"],
    ["diff", "button"],
    ["view", "button"],
    ["info", "--json"],
    ["doctor"],
  ])("rejects a legacy project when running %s", async (...args) => {
    const config = JSON.stringify({ schemaVersion: 1, renderer: "swiftui" })
    const file = path.join(cwd, "fabricator.json")
    await writeFile(file, config)
    await expect(runCli(...args)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("preview has been retired"),
    })
    expect(await readdir(cwd)).toEqual(["fabricator.json"])
    expect(await readFile(file, "utf8")).toBe(config)
  })

  it("lets React Native setup proceed when fabricator.json belongs to another tool", async () => {
    await writeFile(path.join(cwd, "fabricator.json"), '{"tool":"example"}')
    await expect(
      runCli("init", "--platform", "native", "--yes")
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("No package.json here"),
    })
  })
})
