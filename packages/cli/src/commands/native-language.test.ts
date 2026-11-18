import { execFile } from "node:child_process"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createNativeLanguageConfig } from "../utils/native-files"
import { getNativeLanguageChecks } from "./native-language"

const execute = promisify(execFile)
const cli = path.resolve("src/index.ts")
let registryUrl = ""
const server = createServer((request, response) => {
  const name = request.url
    ?.split("/")
    .at(-1)
    ?.replace(/\.json$/, "")
  response.setHeader("Content-Type", "application/json")
  if (name === "registry") {
    response.end(
      JSON.stringify({
        schemaVersion: 1,
        renderer: "swiftui",
        items: ["button", "input"].map((item) => ({ name: item, title: item })),
      })
    )
    return
  }
  response.end(
    JSON.stringify({
      schemaVersion: 1,
      renderer: "swiftui",
      name,
      title: name,
      registryDependencies:
        name === "foundations" ? [] : ["@fabricator/foundations"],
      files: [
        {
          path: name === "foundations" ? "Package.swift" : `ui/${name}.swift`,
          target: name === "foundations" ? "Package.swift" : `ui/${name}.swift`,
          content: `// ${name}\n`,
        },
      ],
    })
  )
})

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("No native test registry port")
  registryUrl = `http://127.0.0.1:${address.port}`
})
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
})

async function runCli(cwd: string, args: string[]) {
  return execute("bun", [cli, ...args, "--cwd", cwd], {
    env: { ...process.env, FABRICATOR_REGISTRY_URL: registryUrl },
  })
}

describe("native language CLI", () => {
  it("installs the full catalog with init --all and preserves a read-only init", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "fabricator-native-all-"))
    await runCli(cwd, [
      "init",
      "--platform",
      "swiftui",
      "--all",
      "--dry-run",
      "--yes",
    ])
    await expect(
      readFile(path.join(cwd, "fabricator.json"))
    ).rejects.toMatchObject({ code: "ENOENT" })
    await runCli(cwd, ["init", "--platform", "swiftui", "--all", "--yes"])
    const info = await runCli(cwd, ["info", "--json"])
    expect(JSON.parse(info.stdout).installed).toEqual([
      "button",
      "foundations",
      "input",
    ])
    expect(await readFile(path.join(cwd, "ui/input.swift"), "utf8")).toBe(
      "// input\n"
    )
  })

  it("rejects unsupported native setup options before writing files", async () => {
    const cwd = await mkdtemp(
      path.join(os.tmpdir(), "fabricator-native-options-")
    )
    for (const args of [
      ["--look", "shape=pill"],
      ["--preset", "custom"],
      ["--spinner", "orbit"],
    ]) {
      await expect(
        runCli(cwd, ["init", "--platform", "swiftui", ...args, "--yes"])
      ).rejects.toMatchObject({ code: 1 })
    }
    await expect(
      readFile(path.join(cwd, "fabricator.json"))
    ).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("rejects per-item path overrides that would split a native module", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "fabricator-native-path-"))
    await runCli(cwd, ["init", "--platform", "swiftui", "--yes"])
    await expect(
      runCli(cwd, ["add", "button", "--path", "custom"])
    ).rejects.toMatchObject({ code: 1 })
    await expect(
      readFile(path.join(cwd, "ui/button.swift"))
    ).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("installs opaque Swift bytes and supports info, view, dry-run and conflict review without a JavaScript project", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "fabricator-native-cli-"))
    await runCli(cwd, ["init", "button", "--platform", "swiftui", "--yes"])
    expect(await readFile(path.join(cwd, "ui/button.swift"), "utf8")).toBe(
      "// button\n"
    )
    await expect(
      readFile(path.join(cwd, "components.json"))
    ).rejects.toMatchObject({ code: "ENOENT" })
    await expect(
      readFile(path.join(cwd, "package.json"))
    ).rejects.toMatchObject({ code: "ENOENT" })
    const info = await runCli(cwd, ["info", "--json"])
    expect(JSON.parse(info.stdout)).toMatchObject({
      renderer: "swiftui",
      installed: ["button", "foundations"],
    })
    const view = await runCli(cwd, ["view", "button"])
    expect(JSON.parse(view.stdout).at(-1).files[0].content).toBe("// button\n")
    await runCli(cwd, ["add", "input", "--dry-run"])
    await expect(
      readFile(path.join(cwd, "ui/input.swift"))
    ).rejects.toMatchObject({ code: "ENOENT" })
    await writeFile(
      path.join(cwd, "ui/button.swift"),
      "// edited by consumer\n"
    )
    const diff = await runCli(cwd, ["diff", "button"])
    expect(diff.stdout).toContain("- // edited by consumer")
    await expect(runCli(cwd, ["add", "button", "--yes"])).rejects.toMatchObject(
      { code: 1 }
    )
    expect(await readFile(path.join(cwd, "ui/button.swift"), "utf8")).toBe(
      "// edited by consumer\n"
    )
    await runCli(cwd, ["add", "button", "--overwrite"])
    expect(await readFile(path.join(cwd, "ui/button.swift"), "utf8")).toBe(
      "// button\n"
    )
  })

  it("checks the native toolchain without requiring React or CSS", () => {
    const checks = getNativeLanguageChecks(
      createNativeLanguageConfig("compose", registryUrl),
      { hasJava: false, hasGradle: true, hasSwift: false, hasManifest: true }
    )
    expect(
      checks.filter(({ status }) => status === "fail").map(({ label }) => label)
    ).toEqual(["Java runtime"])
    expect(checks.map(({ label }) => label).join(" ")).not.toMatch(
      /React|Tailwind|CSS/
    )
  })
})
