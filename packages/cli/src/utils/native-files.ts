import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"

export const NATIVE_LANGUAGE_RENDERERS = ["swiftui", "compose"] as const
export type NativeLanguageRenderer = (typeof NATIVE_LANGUAGE_RENDERERS)[number]

const relativePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !path.posix.isAbsolute(value) &&
      !path.win32.isAbsolute(value) &&
      !value.includes("\\") &&
      !value.split("/").includes(".."),
    "Expected a relative path inside the native project"
  )
const slugSchema = z.string().regex(/^[a-z][a-z0-9-]*$/)
export const nativeLanguageConfigSchema = z.object({
  schemaVersion: z.literal(1),
  renderer: z.enum(NATIVE_LANGUAGE_RENDERERS),
  platforms: z
    .array(z.enum(["ios", "ipados", "android", "macos", "windows", "linux"]))
    .min(1),
  sourceRoot: relativePathSchema,
  packageName: z.string().regex(/^[A-Za-z][A-Za-z0-9_.]*$/),
  registry: z.url(),
  installed: z.array(slugSchema),
})
export type NativeLanguageConfig = z.infer<typeof nativeLanguageConfigSchema>
export const nativeFileItemSchema = z.object({
  schemaVersion: z.literal(1),
  renderer: z.enum(NATIVE_LANGUAGE_RENDERERS),
  name: slugSchema,
  title: z.string(),
  registryDependencies: z
    .array(z.string().regex(/^@fabricator\/[a-z][a-z0-9-]*$/))
    .default([]),
  files: z.array(
    z.object({
      path: relativePathSchema,
      target: relativePathSchema,
      content: z.string(),
      encoding: z.enum(["utf8", "base64"]).default("utf8"),
    })
  ),
})
// Input permits the omitted utf8 default used by authored manifests.
export type NativeFileItem = z.input<typeof nativeFileItemSchema>
export type NativeFilePlan = {
  item: string
  target: string
  content: Buffer
  previous: Buffer | null
  status: "create" | "unchanged" | "conflict"
}

export class NativeFilesError extends Error {
  override name = "NativeFilesError"
}

export function isNativeLanguageRenderer(
  value: unknown
): value is NativeLanguageRenderer {
  return NATIVE_LANGUAGE_RENDERERS.some((renderer) => renderer === value)
}

export function createNativeLanguageConfig(
  renderer: NativeLanguageRenderer,
  baseUrl: string
): NativeLanguageConfig {
  return nativeLanguageConfigSchema.parse({
    schemaVersion: 1,
    renderer,
    platforms:
      renderer === "swiftui"
        ? ["ios", "ipados", "macos"]
        : ["android", "macos", "windows", "linux"],
    sourceRoot: ".",
    packageName: renderer === "swiftui" ? "FabricatorUI" : "dev.fabricator.ui",
    registry: `${baseUrl.replace(/\/$/, "")}/r/fabricator/${renderer}/{name}.json`,
    installed: [],
  })
}

function isMissingFile(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}

export async function readNativeLanguageConfig(
  cwd: string
): Promise<NativeLanguageConfig | undefined> {
  let content: string
  try {
    content = await readFile(path.join(cwd, "fabricator.json"), "utf8")
  } catch (error) {
    if (isMissingFile(error)) return undefined
    throw error
  }
  return nativeLanguageConfigSchema.parse(JSON.parse(content))
}

export async function resolveNativeItems(
  names: string[],
  renderer: NativeLanguageRenderer,
  fetchItem: (name: string) => Promise<unknown>
): Promise<z.output<typeof nativeFileItemSchema>[]> {
  const resolved = new Map<string, z.output<typeof nativeFileItemSchema>>()
  const active = new Set<string>()
  async function visit(address: string) {
    const name = slugSchema.parse(address.replace(/^@fabricator\//, ""))
    if (active.has(name))
      throw new NativeFilesError(`Native dependency cycle at ${name}.`)
    if (resolved.has(name)) return
    active.add(name)
    const item = nativeFileItemSchema.parse(await fetchItem(name))
    if (item.renderer !== renderer || item.name !== name)
      throw new NativeFilesError(
        `Registry renderer/name mismatch for ${renderer}/${name}.`
      )
    for (const dependency of item.registryDependencies) await visit(dependency)
    active.delete(name)
    resolved.set(name, item)
  }
  for (const name of names) await visit(name)
  return [...resolved.values()]
}

async function assertInsideProject(cwd: string, target: string) {
  relativePathSchema.parse(target)
  if (target === "fabricator.json" || target.startsWith(".git/"))
    throw new NativeFilesError(`Reserved native target: ${target}`)
  const root = await realpath(cwd)
  const absolute = path.resolve(cwd, target)
  let candidate = absolute
  while (true) {
    try {
      const actual = await realpath(candidate)
      const relative = path.relative(root, actual)
      if (relative.startsWith("..") || path.isAbsolute(relative))
        throw new NativeFilesError(
          `Native path escapes outside the project through a symlink: ${target}`
        )
      break
    } catch (error) {
      if (!isMissingFile(error)) throw error
      const parent = path.dirname(candidate)
      if (parent === candidate)
        throw new NativeFilesError(
          `Cannot resolve native target path: ${target}`
        )
      candidate = parent
    }
  }
  // A broken symlink cannot be safely replaced by an installer either.
  const entry = await lstat(absolute).catch((error: unknown) => {
    if (isMissingFile(error)) return null
    throw error
  })
  if (entry?.isSymbolicLink())
    throw new NativeFilesError(`Native target is a symlink: ${target}`)
  return absolute
}

export async function planNativeFiles(
  cwd: string,
  config: NativeLanguageConfig,
  items: NativeFileItem[]
): Promise<NativeFilePlan[]> {
  const plans = new Map<string, NativeFilePlan>()
  for (const rawItem of items) {
    const item = nativeFileItemSchema.parse(rawItem)
    for (const file of item.files) {
      const target = path.posix.join(config.sourceRoot, file.target)
      const absolute = await assertInsideProject(cwd, target)
      const content = Buffer.from(file.content, file.encoding)
      const duplicate = plans.get(target)
      if (duplicate) {
        if (!duplicate.content.equals(content))
          throw new NativeFilesError(
            `Conflicting native registry files at ${target}.`
          )
        continue
      }
      const previous = await readFile(absolute).catch((error: unknown) => {
        if (isMissingFile(error)) return null
        throw error
      })
      plans.set(target, {
        item: item.name,
        target,
        content,
        previous,
        status:
          previous === null
            ? "create"
            : previous.equals(content)
              ? "unchanged"
              : "conflict",
      })
    }
  }
  return [...plans.values()]
}

export async function installNativeFiles(
  cwd: string,
  config: NativeLanguageConfig,
  plans: NativeFilePlan[],
  options: { dryRun?: boolean; overwrite?: boolean; installed?: string[] } = {}
) {
  if (options.dryRun) return { written: 0 }
  const conflicts = plans.filter(({ status }) => status === "conflict")
  if (conflicts.length && !options.overwrite)
    throw new NativeFilesError(
      `Native source already exists: ${conflicts.map(({ target }) => target).join(", ")}. Review with --diff or use --overwrite.`
    )
  // Revalidate all destinations before writing anything, including stale plans.
  for (const file of plans) await assertInsideProject(cwd, file.target)
  let written = 0
  for (const file of plans) {
    if (file.status === "unchanged") continue
    const absolute = path.resolve(cwd, file.target)
    await mkdir(path.dirname(absolute), { recursive: true })
    await writeFile(absolute, file.content)
    written += 1
  }
  const installed = [
    ...new Set([
      ...config.installed,
      ...(options.installed ?? plans.map(({ item }) => item)),
    ]),
  ].sort()
  await writeFile(
    path.join(cwd, "fabricator.json"),
    `${JSON.stringify({ ...config, installed }, null, 2)}\n`
  )
  return { written }
}

export async function fetchNativeItem(
  config: NativeLanguageConfig,
  name: string
) {
  const url = config.registry.replace("{name}", encodeURIComponent(name))
  const response = await fetch(url)
  if (!response.ok)
    throw new NativeFilesError(
      `Cannot fetch native registry item ${name}: HTTP ${response.status} (${url}).`
    )
  return nativeFileItemSchema.parse(await response.json())
}
