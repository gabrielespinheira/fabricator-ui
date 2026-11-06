// Adds the App Shell and the sounds to a project's root file. Each transform
// knows one exact shape; anything else returns null, and the caller prints the
// snippet instead of guessing at someone's code. `@/components` is where `add`
// writes them in every template.

import type { Framework } from "@fabricator-ui/setup"

export type MountOptions = {
  shell: boolean
  sounds: boolean
  /** The project's `components` alias: `~/components` in React Router's template. */
  componentsAlias?: string
}

const DEFAULT_COMPONENTS_ALIAS = "@/components"

const shellImport = (alias = DEFAULT_COMPONENTS_ALIAS) =>
  `import { AppShellRoot } from "${alias}/app-shell-root"`
const soundsImport = (alias = DEFAULT_COMPONENTS_ALIAS) =>
  `import { SoundEffects } from "${alias}/sound-effects"`
const ROOT_IMPORT =
  'import { FabricatorRoot } from "@/components/ui/fabricator-root"'

function addImports(source: string, imports: string[]) {
  const missing = imports.filter((line) => !source.includes(line))
  if (missing.length === 0) return source
  const lines = source.split("\n")
  // The line after the last top-level import ends a multi-line one too.
  let last = -1
  let inImport = false
  lines.forEach((line, index) => {
    if (line.startsWith("import ")) inImport = !isImportEnd(line)
    else if (inImport) inImport = !line.startsWith("}")
    else return
    last = index
  })
  lines.splice(last + 1, 0, ...missing)
  return lines.join("\n")
}

function isImportEnd(line: string) {
  return /from\s+['"][^'"]+['"];?$/.test(line) || /^import\s+['"]/.test(line)
}

function wrapElement(element: string, indent: string, options: MountOptions) {
  const inner = options.shell
    ? element === "{children}"
      ? [`${indent}<AppShellRoot>{children}</AppShellRoot>`]
      : [
          `${indent}<AppShellRoot>`,
          `${indent}  ${element}`,
          `${indent}</AppShellRoot>`,
        ]
    : [`${indent}${element}`]
  return [...inner, ...(options.sounds ? [`${indent}<SoundEffects />`] : [])]
}

function neededImports(options: MountOptions) {
  return [
    ...(options.shell ? [shellImport(options.componentsAlias)] : []),
    ...(options.sounds ? [soundsImport(options.componentsAlias)] : []),
  ]
}

function isMounted(source: string, options: MountOptions) {
  return (
    (!options.shell || source.includes("<AppShellRoot")) &&
    (!options.sounds || source.includes("<SoundEffects"))
  )
}

/** `{children}` on its own line, or as the only child of one element on a line. */
function mountChildren(source: string, options: MountOptions) {
  const lines = source.split("\n")
  const matches = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.includes("{children}"))
  const [match] = matches
  if (!match || matches.length !== 1) return null
  const shape = /^(\s*)(<(\w+)[^>]*>)?\{children\}(<\/\3>)?$/.exec(match.line)
  if (!shape) return null
  const [, indent = "", open, , close] = shape
  if (Boolean(open) !== Boolean(close)) return null
  const body = wrapElement("{children}", open ? `${indent}  ` : indent, options)
  lines.splice(
    match.index,
    1,
    ...(open ? [`${indent}${open}`, ...body, `${indent}${close}`] : body)
  )
  return addImports(lines.join("\n"), neededImports(options))
}

/** One `<App />` on its own line. */
function mountApp(source: string, options: MountOptions) {
  const lines = source.split("\n")
  const matches = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^\s*<App \/>$/.test(line))
  const [match] = matches
  if (!match || matches.length !== 1) return null
  const indent = /^\s*/.exec(match.line)?.[0] ?? ""
  lines.splice(match.index, 1, ...wrapElement("<App />", indent, options))
  return addImports(lines.join("\n"), neededImports(options))
}

/** `return <Outlet />`, on one line. */
function mountOutlet(source: string, options: MountOptions) {
  const lines = source.split("\n")
  const index = lines.findIndex((line) =>
    /^\s*return <Outlet \/>;?$/.test(line)
  )
  if (index === -1) return null
  const indent = /^\s*/.exec(lines[index] ?? "")?.[0] ?? ""
  const needsFragment = options.shell && options.sounds
  const body = wrapElement(
    "<Outlet />",
    `${indent}${needsFragment ? "    " : "  "}`,
    options
  )
  lines.splice(
    index,
    1,
    `${indent}return (`,
    ...(needsFragment ? [`${indent}  <>`, ...body, `${indent}  </>`] : body),
    `${indent})`
  )
  return addImports(lines.join("\n"), neededImports(options))
}

const WEB_MOUNTS: Partial<
  Record<Framework, (source: string, options: MountOptions) => string | null>
> = {
  next: mountChildren,
  start: mountChildren,
  vite: mountApp,
  "react-router": mountOutlet,
}

export function mountWebRoot(
  source: string,
  framework: Framework,
  options: MountOptions
) {
  const mount = WEB_MOUNTS[framework]
  if (!mount) return null
  if (isMounted(source, options)) return source
  return mount(source, options)
}

/** Astro renders the sounds as an island, just before the body ends. */
export function mountAstroRoot(
  source: string,
  componentsAlias = DEFAULT_COMPONENTS_ALIAS
) {
  if (source.includes("<SoundEffects")) return source
  const frontmatter = /^---\n([\s\S]*?)---\n/.exec(source)
  const body = /^(\s*)<\/body>$/m.exec(source)
  if (!frontmatter || !body) return null
  return source
    .replace(
      frontmatter[0],
      `---\n${frontmatter[1]}${soundsImport(componentsAlias)}\n---\n`
    )
    .replace(
      body[0],
      `${body[1]}  <SoundEffects client:load />\n${body[1]}</body>`
    )
}

function nativeBody(
  navigator: string,
  options: MountOptions,
  indent: string
): string[] {
  const shell = options.shell
    ? [
        `${indent}<AppShellRoot>`,
        `${indent}  ${navigator}`,
        `${indent}</AppShellRoot>`,
      ]
    : [`${indent}${navigator}`]
  return options.sounds
    ? [
        `${indent}<SoundEffects>`,
        ...shell.map((line) => `  ${line}`),
        `${indent}</SoundEffects>`,
      ]
    : shell
}

function nativeTree(navigator: string, options: MountOptions) {
  return [
    "    <FabricatorRoot>",
    ...nativeBody(navigator, options, "      "),
    "    </FabricatorRoot>",
  ]
}

const NATIVE_DEMO = /from ['"]@\/components\/app-tabs['"]/

/** An Expo Router root layout: the template's demo, or `return <Stack />`. */
export function mountNativeRoot(
  source: string,
  options: MountOptions & { cssImport: string }
) {
  if (source.includes("<FabricatorRoot")) return source
  const imports = [
    `import "${options.cssImport}"`,
    "",
    ...(options.shell ? [shellImport()] : []),
    ...(options.sounds ? [soundsImport()] : []),
    ROOT_IMPORT,
  ]
  if (NATIVE_DEMO.test(source)) {
    return [
      `import "${options.cssImport}"`,
      "",
      'import { Slot } from "expo-router"',
      "",
      ...imports.slice(2),
      "",
      "export default function RootLayout() {",
      "  return (",
      ...nativeTree("<Slot />", options),
      "  )",
      "}",
      "",
    ].join("\n")
  }
  const lines = source.split("\n")
  const index = lines.findIndex((line) =>
    /^\s*return <(Stack|Slot|Tabs) \/>;?$/.test(line)
  )
  if (index === -1) return null
  const navigator = /<(Stack|Slot|Tabs) \/>/.exec(lines[index] ?? "")?.[0] ?? ""
  lines.splice(index, 1, "  return (", ...nativeTree(navigator, options), "  )")
  return `${imports[0]}\n${addImports(lines.join("\n"), imports.slice(2))}`
}
