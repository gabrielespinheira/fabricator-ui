import { existsSync, promises as fs } from "fs"
import path from "path"

import { FABRICATOR_EXCLUDED_ITEMS } from "@/registry/fabricator/registry"
import { nativeItems } from "@/registry/native/_registry"

import {
  applyExceptions,
  compareShapes,
  findMissingDemoValues,
  findUnresolvedImports,
  getMissingComponentStatus,
  readComponentShape,
  readImports,
  type NativeItem,
  type ParityException,
  type ParityGap,
} from "./native-parity"
import { getNativeSourcePath, rewriteSharedImports } from "./native-registry"

/*
 * Every published web component has a native one with the same exports,
 * variants, props, slots and placeholders, and installing it brings everything
 * it imports. Exceptions live in registry/native/parity-exceptions.json with a
 * reason and a date.
 *
 * `--strict` fails on any gap. `--json <path>` writes the report.
 */

const ROOT = process.cwd()

async function listComponents(dir: string) {
  const full = path.join(ROOT, dir)
  if (!existsSync(full)) return []
  return (await fs.readdir(full))
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(/\.tsx$/, ""))
}

function getWebSourcePath(name: string) {
  return [
    `registry/fabricator/base/ui/${name}.tsx`,
    `registry/fabricator/shared/ui/${name}.tsx`,
    `registry/bases/base/ui/${name}.tsx`,
  ].find((candidate) => existsSync(path.join(ROOT, candidate)))
}

const read = (file: string) => fs.readFile(path.join(ROOT, file), "utf8")

async function main() {
  const args = process.argv.slice(2)
  const isStrict = args.includes("--strict")
  const jsonIndex = args.indexOf("--json")
  const jsonPath = jsonIndex === -1 ? undefined : args[jsonIndex + 1]

  const webNames = [
    ...new Set([
      ...(await listComponents("registry/bases/base/ui")),
      ...(await listComponents("registry/fabricator/base/ui")),
      ...(await listComponents("registry/fabricator/shared/ui")),
    ]),
  ]
    .filter((name) => !(name in FABRICATOR_EXCLUDED_ITEMS))
    .sort()

  const exceptionsPath = "registry/native/parity-exceptions.json"
  const exceptions: ParityException[] = existsSync(
    path.join(ROOT, exceptionsPath)
  )
    ? JSON.parse(await read(exceptionsPath))
    : []
  const items = new Map<string, NativeItem>(
    (nativeItems as NativeItem[]).map((item) => [item.name, item])
  )

  const report = []
  for (const name of webNames) {
    const nativeFile = `registry/native/ui/${name}.tsx`
    if (!items.has(name) || !existsSync(path.join(ROOT, nativeFile))) {
      report.push({
        name,
        status: getMissingComponentStatus(name, exceptions),
        gaps: [] as ParityGap[],
      })
      continue
    }
    const webSource = await read(getWebSourcePath(name) ?? nativeFile)
    const nativeSource = await read(nativeFile)
    const webShape = readComponentShape(webSource)
    const nativeShape = readComponentShape(nativeSource)
    const demoFile = `examples/native/${name}-example.tsx`
    const gaps: ParityGap[] = compareShapes(webShape, nativeShape)
    if (existsSync(path.join(ROOT, demoFile))) {
      gaps.push(...findMissingDemoValues(nativeShape, await read(demoFile)))
    } else {
      gaps.push({ kind: "demo", name: demoFile })
    }
    const left = applyExceptions(name, gaps, exceptions)
    report.push({
      name,
      status: left.length === 0 ? ("ok" as const) : ("gap" as const),
      gaps: left,
    })
  }

  // Every native item, components or not, must bring what it imports.
  const importGaps: { name: string; gaps: ParityGap[] }[] = []
  for (const item of items.values()) {
    const specifiers: string[] = []
    for (const file of item.files ?? []) {
      const sourcePath = getNativeSourcePath(file.path)
      if (!existsSync(path.join(ROOT, sourcePath))) {
        importGaps.push({
          name: item.name,
          gaps: [{ kind: "import", name: `missing file ${sourcePath}` }],
        })
        continue
      }
      specifiers.push(
        ...readImports(rewriteSharedImports(await read(sourcePath)))
      )
    }
    const gaps = applyExceptions(
      item.name,
      findUnresolvedImports(item.name, [...new Set(specifiers)], items),
      exceptions
    )
    if (gaps.length > 0) importGaps.push({ name: item.name, gaps })
  }

  const webBlocks = [
    ...(await fs.readdir(path.join(ROOT, "registry/bases/base/blocks"), {
      withFileTypes: true,
    })),
    ...(await fs.readdir(path.join(ROOT, "registry/fabricator/shared/blocks"), {
      withFileTypes: true,
    })),
  ]
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !(name in FABRICATOR_EXCLUDED_ITEMS))
    .sort()
  const missingBlocks = webBlocks.filter(
    (name) =>
      !items.has(name) ||
      !existsSync(path.join(ROOT, `registry/native/blocks/${name}.tsx`))
  )

  const done = report.filter((entry) => entry.status === "ok")
  const gapped = report.filter((entry) => entry.status === "gap")
  const deferred = report.filter((entry) => entry.status === "deferred")
  const missing = report.filter((entry) => entry.status === "missing")

  for (const entry of gapped) {
    console.log(`△ ${entry.name}`)
    for (const gap of entry.gaps) console.log(`    ${gap.kind}: ${gap.name}`)
  }
  for (const entry of importGaps) {
    console.log(`✗ ${entry.name} imports what it doesn't install`)
    for (const gap of entry.gaps) console.log(`    ${gap.name}`)
  }
  if (deferred.length > 0) {
    console.log(
      `Deferred (dated exceptions): ${deferred.map((entry) => entry.name).join(", ")}`
    )
  }
  if (missing.length > 0) {
    console.log(`Missing: ${missing.map((entry) => entry.name).join(", ")}`)
  }
  if (missingBlocks.length > 0) {
    console.log(`Missing blocks: ${missingBlocks.join(", ")}`)
  }
  console.log(
    `\nNative parity: ${done.length} of ${report.length} components clean, ${gapped.length} with gaps, ${missing.length} missing, ${deferred.length} deferred. ${webBlocks.length - missingBlocks.length} of ${webBlocks.length} blocks.`
  )

  if (jsonPath) {
    await fs.mkdir(path.dirname(path.join(ROOT, jsonPath)), { recursive: true })
    await fs.writeFile(
      path.join(ROOT, jsonPath),
      `${JSON.stringify({ report, missingBlocks, exceptions }, null, 2)}\n`
    )
  }

  if (importGaps.length > 0) process.exit(1)
  if (
    isStrict &&
    (gapped.length > 0 || missing.length > 0 || missingBlocks.length > 0)
  ) {
    process.exit(1)
  }
}

await main()
