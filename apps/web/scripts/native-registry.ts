// The pure parts of the native registry build, so they can be tested without
// touching the file system. See build-native-registry.mts.

// The token modules, by their name in registry/fabricator. shadcn's CLI rewrites
// imports by a file's last path segment, so an installed module can't share one
// with a component or another lib.
const TOKEN_MODULES: Record<string, string> = {
  "css-object": "css-object",
  "surface-tint": "surface-tint",
  "color-roles": "color-roles",
  "syntax-colors": "syntax-colors",
  density: "density-scale",
  "density-variables": "density-variables",
  motion: "motion-speeds",
  "foundation-tokens": "foundation-tokens",
  look: "look",
  "native-theme": "native-theme",
}

/** The installed path of a token module. */
export function getTokenFile(name: string) {
  const installed = TOKEN_MODULES[name]
  if (!installed) throw new Error(`Unknown token module: ${name}`)
  return `lib/fabricator/${installed}.ts`
}

/** Files every native theme installs from the shared tokens. */
export const SHARED_TOKEN_FILES = Object.keys(TOKEN_MODULES).map(getTokenFile)

const SHARED_LIB_FILES = [
  "app-shell-model",
  "spinner-model",
  "date-picker-model",
  "month-input-model",
  "sidebar-model",
  "sound-recipes",
  "syntax-highlight-model",
  "video-player-model",
] as const

/**
 * Where a native item's file comes from. Most live in registry/native; the
 * token modules and the App Shell's models are the same files the website
 * compiles from, installed under lib/.
 */
export function getNativeSourcePath(filePath: string) {
  const tokenMatch = /^lib\/fabricator\/(.+)\.ts$/.exec(filePath)
  if (tokenMatch) {
    const source = Object.entries(TOKEN_MODULES).find(
      ([, installed]) => installed === tokenMatch[1]
    )
    if (!source) throw new Error(`Unknown token module: ${filePath}`)
    return `registry/fabricator/${source[0]}.ts`
  }
  const sharedLib = SHARED_LIB_FILES.find(
    (name) => filePath === `lib/${name}.ts`
  )
  if (sharedLib) return `registry/fabricator/shared/lib/${sharedLib}.ts`
  return `registry/native/${filePath}`
}

/** Points imports of the shared modules at their installed copies. */
export function rewriteSharedImports(source: string) {
  return source
    .replace(
      /@\/registry\/fabricator\/shared\/lib\//g,
      "@/registry/native/lib/"
    )
    .replace(
      /@\/registry\/fabricator\/([a-z-]+)/g,
      (_match, name: string) =>
        `@/registry/native/${getTokenFile(name).replace(/\.ts$/, "")}`
    )
}

// Literal markers shadcn's CLI resolves at install on the website's items.
const PLACEHOLDER_PATTERN = /\bcn-[a-z][a-z0-9-]*/g

/** Every placeholder left in a source, sorted. */
export function findPlaceholders(source: string) {
  return [...new Set(source.match(PLACEHOLDER_PATTERN) ?? [])].sort()
}

/**
 * Placeholders in a source with no rule. Check before compiling: the compiler
 * silently drops an unknown placeholder from a `cn()` or `cva()` argument.
 */
export function findUnstyledPlaceholders(
  source: string,
  styleMap: Record<string, unknown>
) {
  return findPlaceholders(source).filter((name) => !(name in styleMap))
}

/** Assembles the per-component style maps, as style-fabricator.css is. */
export function assembleNativeStyleMap(parts: string[]) {
  return [
    "/* Generated from registry/styles/native/*.css by scripts/build-native-registry.mts. Do not edit. */",
    `.style-native {\n${parts.map((part) => part.trimEnd()).join("\n\n")}\n}`,
    "",
  ].join("\n")
}

const TEST_FILE = /\.test\.tsx?$/

/** A registry path for a native file, as the website's items write theirs. */
export function getPublishedPath(filePath: string) {
  if (TEST_FILE.test(filePath)) {
    throw new Error(`A test file can't be published: ${filePath}`)
  }
  return `registry/native/${filePath}`
}
