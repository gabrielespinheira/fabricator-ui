import { spawnSync } from "node:child_process"
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { z } from "zod"

const metadataSchema = z.object({ inputs: z.record(z.string(), z.unknown()) })
const packageSchema = z.object({
  name: z.string(),
  version: z.string(),
  license: z.string().optional(),
})

export async function bundleDomainEngine(
  projectRoot: string,
  name: "editor" | "calendar" | "document" | "date-picker"
) {
  const metadataRoot = await mkdtemp(path.join(tmpdir(), "fabricator-engine-"))
  const metadataFile = path.join(metadataRoot, `${name}-engine-meta.json`)
  const bundle = spawnSync(
    "bun",
    [
      "build",
      `apps/web/scripts/swiftui/${name}-engine.ts`,
      "--target",
      "browser",
      "--conditions",
      "react-native",
      "--format",
      "iife",
      "--minify",
      `--metafile=${metadataFile}`,
      "--outfile",
      `apps/web/registry/swiftui/resources/${name}-engine.js`,
    ],
    { cwd: projectRoot, stdio: "inherit" }
  )
  if (bundle.error) throw bundle.error
  if (bundle.status !== 0)
    throw new Error(`Canonical ${name} bundling failed (${bundle.status}).`)
  const metadata = metadataSchema.parse(
    JSON.parse(await readFile(metadataFile, "utf8"))
  )
  await rm(metadataRoot, { recursive: true })
  const packageRoots = new Set<string>()
  for (const input of Object.keys(metadata.inputs)) {
    const index = input.lastIndexOf("node_modules/")
    if (index < 0) continue
    const parts = input.slice(index + "node_modules/".length).split("/")
    const name = parts[0]?.startsWith("@")
      ? parts.slice(0, 2).join("/")
      : parts[0]
    if (!name) throw new Error(`Unable to resolve bundled package: ${input}`)
    packageRoots.add(
      path.resolve(projectRoot, input.slice(0, index), "node_modules", name)
    )
  }
  const notices = [
    "Fabricator UI locally bundled canonical domain engine",
    "Repository attribution: see LICENSE.md and NOTICE.md.",
  ]
  for (const packageRoot of [...packageRoots].sort()) {
    const metadata = packageSchema.parse(
      JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"))
    )
    const files = await readdir(packageRoot)
    const licenses = files.filter((file) =>
      /^(license|licence|copying)(\.|$)/i.test(file)
    )
    if (!licenses.length)
      throw new Error(
        `Bundled package ${metadata.name} needs its license text included.`
      )
    notices.push(
      `\n${metadata.name} ${metadata.version} (${metadata.license ?? "see license"})`
    )
    for (const file of licenses)
      notices.push(await readFile(path.join(packageRoot, file), "utf8"))
  }
  await writeFile(
    path.join(
      projectRoot,
      `apps/web/registry/swiftui/resources/${name}-notices.txt`
    ),
    `${notices.join("\n\n")}\n`
  )
}
