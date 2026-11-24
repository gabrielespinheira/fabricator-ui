import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { cp, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

import {
  createNativeLanguageConfig,
  installNativeFiles,
  NATIVE_LANGUAGE_RENDERERS,
  nativeFileItemSchema,
  planNativeFiles,
  resolveNativeItems,
} from "../packages/cli/src/utils/native-files"

const argumentsList = process.argv.slice(2)
function readArgument(name: string) {
  const index = argumentsList.indexOf(name)
  return index < 0 ? undefined : argumentsList[index + 1]
}
const renderer = z
  .enum(NATIVE_LANGUAGE_RENDERERS)
  .parse(readArgument("--renderer") ?? "swiftui")
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const registry = path.join(repository, "apps/web/public/r", renderer)
const catalog = z
  .object({ items: z.array(z.object({ name: z.string() })) })
  .parse(
    JSON.parse(await readFile(path.join(registry, "registry.json"), "utf8"))
  )
const requested =
  readArgument("--items")?.split(",") ?? catalog.items.map(({ name }) => name)
const config = createNativeLanguageConfig(renderer, "http://localhost:4000")
// A CI runner starts without Gradle's dependencies; nothing else downloads them.
const gradleNetwork = process.env.CI ? [] : ["--offline"]
const seen = new Set<string>()
const results: {
  items: string[]
  sourceRoot: string
  status: "installed" | "built" | "failed"
  log?: string
}[] = []
function resolveItems(names: string[]) {
  return resolveNativeItems(names, renderer, async (name) =>
    nativeFileItemSchema.parse(
      JSON.parse(await readFile(path.join(registry, `${name}.json`), "utf8"))
    )
  )
}
type Items = Awaited<ReturnType<typeof resolveItems>>
async function installConsumer(items: Items, folder: string) {
  const sourceRoot = path.join(
    repository,
    "tmp/native-consumers",
    renderer,
    folder
  )
  await mkdir(sourceRoot, { recursive: true })
  const plans = await planNativeFiles(sourceRoot, config, items)
  await installNativeFiles(sourceRoot, config, plans, {
    installed: items.map(({ name }) => name),
  })
  return sourceRoot
}
async function runInConsumer(
  [program, ...parameters]: [string, ...string[]],
  sourceRoot: string,
  label: string
) {
  const child = spawn(program, parameters, { cwd: sourceRoot, stdio: "pipe" })
  child.stdin.end()
  const output: Buffer[] = []
  const errors: Buffer[] = []
  child.stdout.on("data", (chunk: Buffer) => output.push(chunk))
  child.stderr.on("data", (chunk: Buffer) => errors.push(chunk))
  const code = await new Promise<number>((resolve, reject) => {
    child.once("error", reject)
    child.once("close", (code) => resolve(code ?? 1))
  })
  const stdout = Buffer.concat(output).toString("utf8")
  const stderr = Buffer.concat(errors).toString("utf8")
  const log = path.join(sourceRoot, "build.log")
  await writeFile(log, `${stdout}\n${stderr}`)
  const status = code === 0 ? ("built" as const) : ("failed" as const)
  process.stdout.write(`${status}: ${label} (${sourceRoot})\n`)
  if (code !== 0) {
    process.stderr.write(`${stdout}\n${stderr}`)
    process.exitCode = 1
  }
  return { status, log }
}
for (const name of requested) {
  const items = await resolveItems([name])
  const files = new Map(
    items.flatMap((item) =>
      item.files.map((file) => [file.target, file] as const)
    )
  )
  const signature = createHash("sha256")
    .update(
      JSON.stringify(
        [...files.values()].sort((left, right) =>
          left.target.localeCompare(right.target)
        )
      )
    )
    .digest("hex")
    .slice(0, 12)
  if (seen.has(signature)) continue
  seen.add(signature)
  const sourceRoot = await installConsumer(items, signature)
  const result: (typeof results)[number] = {
    items: items.map(({ name }) => name),
    sourceRoot,
    status: "installed",
  }
  if (argumentsList.includes("--build")) {
    const command: [string, ...string[]] =
      renderer === "swiftui"
        ? [
            "swift",
            "build",
            "--disable-automatic-resolution",
            "--package-path",
            sourceRoot,
          ]
        : ["gradle", ...gradleNetwork, "desktopMainClasses"]
    Object.assign(result, await runInConsumer(command, sourceRoot, name))
  }
  results.push(result)
}
// Compose has no package of its own to test, so its tests run in a consumer
// that installs everything. SwiftUI's run with `swift test`.
if (renderer === "compose" && argumentsList.includes("--tests")) {
  const items = await resolveItems(catalog.items.map(({ name }) => name))
  const sourceRoot = await installConsumer(items, "all")
  await cp(
    path.join(repository, "apps/web/registry/compose/tests"),
    path.join(sourceRoot, "src/commonTest/kotlin"),
    { recursive: true }
  )
  if (argumentsList.includes("--build"))
    await runInConsumer(
      ["gradle", ...gradleNetwork, "desktopTest", "assemble"],
      sourceRoot,
      "every item, with the library's tests"
    )
}
const report = path.join(
  repository,
  "tmp/native-consumers",
  `${renderer}-report.json`
)
await writeFile(report, `${JSON.stringify(results, null, 2)}\n`)
process.stdout.write(
  `${renderer}: ${requested.length} items resolved, ${seen.size} distinct source closures checked. Report: ${report}\n`
)
