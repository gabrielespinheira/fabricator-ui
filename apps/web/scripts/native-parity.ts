// What makes a native item the same component as its web one: exports, variants,
// declared props, slots and placeholders, read from source. check-native-parity
// compares them and reports each gap. See docs/plans/react-native.md.

import { Node, Project, ScriptKind, type SourceFile } from "ts-morph"

export type ComponentShape = {
  exports: string[]
  variants: Record<string, string[]>
  props: string[]
  slots: string[]
  placeholders: string[]
}

export type ParityGap = {
  kind:
    | "component"
    | "export"
    | "variant"
    | "prop"
    | "slot"
    | "placeholder"
    | "demo"
    | "import"
  name: string
}

// DOM props with a different name on native, or no meaning there.
export const PROP_RENAMES: Record<string, string | null> = {
  onClick: "onPress",
  htmlFor: "nativeID",
  href: null,
}

// Literal markers the CLI resolves at install on web items.
const INSTALL_MARKERS = new Set([
  "cn-menu-target",
  "cn-menu-translucent",
  "cn-font-heading",
  "cn-rtl-flip",
  "cn-logical-sides",
])

const project = new Project({ useInMemoryFileSystem: true })

function parse(source: string): SourceFile {
  return project.createSourceFile("component.tsx", source, {
    overwrite: true,
    scriptKind: ScriptKind.TSX,
  })
}

function getExports(file: SourceFile) {
  return [...file.getExportedDeclarations().keys()].sort()
}

function getVariants(file: SourceFile) {
  const axes: Record<string, Set<string>> = {}
  for (const call of file.getDescendants().filter(Node.isCallExpression)) {
    if (call.getExpression().getText() !== "cva") continue
    const config = call.getArguments()[1]
    if (!config || !Node.isObjectLiteralExpression(config)) continue
    const variants = config.getProperty("variants")
    if (!variants || !Node.isPropertyAssignment(variants)) continue
    const value = variants.getInitializer()
    if (!value || !Node.isObjectLiteralExpression(value)) continue
    for (const axis of value.getProperties()) {
      if (!Node.isPropertyAssignment(axis)) continue
      const options = axis.getInitializer()
      if (!options || !Node.isObjectLiteralExpression(options)) continue
      const name = axis.getName().replace(/^["']|["']$/g, "")
      axes[name] ??= new Set()
      for (const option of options.getProperties()) {
        if (Node.isPropertyAssignment(option)) {
          axes[name].add(option.getName().replace(/^["']|["']$/g, ""))
        }
      }
    }
  }
  return Object.fromEntries(
    Object.entries(axes).map(([axis, values]) => [axis, [...values].sort()])
  )
}

/** Props a component declares itself, in type literals on its parameter. */
function getProps(file: SourceFile) {
  const props = new Set<string>()
  const exported = new Set(getExports(file))
  for (const fn of file.getFunctions()) {
    const name = fn.getName()
    if (!name || !exported.has(name) || !/^[A-Z]/.test(name)) continue
    const parameter = fn.getParameters()[0]
    const typeNode = parameter?.getTypeNode()
    if (!typeNode) continue
    const literals = [
      ...(Node.isTypeLiteral(typeNode) ? [typeNode] : []),
      ...typeNode.getDescendants().filter(Node.isTypeLiteral),
    ]
    for (const literal of literals) {
      // A literal inside a member is that prop's own shape, not more props.
      if (literal.getFirstAncestor(Node.isPropertySignature)) continue
      for (const member of literal.getProperties()) {
        props.add(member.getName())
      }
    }
  }
  return [...props].sort()
}

export function readComponentShape(source: string): ComponentShape {
  const file = parse(source)
  return {
    exports: getExports(file),
    variants: getVariants(file),
    props: getProps(file),
    slots: [
      ...new Set(
        [...source.matchAll(/data-slot"?\s*[=:]\s*"([^"]+)"/g)].map(
          (match) => match[1]
        )
      ),
    ].sort(),
    placeholders: [...new Set(source.match(/\bcn-[a-z][a-z0-9-]*/g) ?? [])]
      .filter((name) => !INSTALL_MARKERS.has(name))
      .sort(),
  }
}

/** What the native item is missing from the web one. Extra is fine: it only adds. */
export function compareShapes(
  web: ComponentShape,
  native: ComponentShape
): ParityGap[] {
  const gaps: ParityGap[] = []
  const missing = (from: string[], to: string[]) =>
    from.filter((name) => !to.includes(name))

  for (const name of missing(web.exports, native.exports)) {
    gaps.push({ kind: "export", name })
  }
  for (const [axis, values] of Object.entries(web.variants)) {
    for (const value of missing(values, native.variants[axis] ?? [])) {
      gaps.push({ kind: "variant", name: `${axis}.${value}` })
    }
  }
  for (const name of web.props) {
    const renamed = name in PROP_RENAMES ? PROP_RENAMES[name] : name
    if (renamed === null) continue
    if (!native.props.includes(renamed) && !native.props.includes(name)) {
      gaps.push({ kind: "prop", name })
    }
  }
  for (const name of missing(web.slots, native.slots)) {
    gaps.push({ kind: "slot", name })
  }
  for (const name of missing(web.placeholders, native.placeholders)) {
    gaps.push({ kind: "placeholder", name })
  }
  return gaps
}

/** Variant values a demo never mentions. */
export function findMissingDemoValues(
  shape: ComponentShape,
  demoSource: string
): ParityGap[] {
  const gaps: ParityGap[] = []
  for (const [axis, values] of Object.entries(shape.variants)) {
    for (const value of values) {
      if (value === "default") continue
      if (!demoSource.includes(`"${value}"`)) {
        gaps.push({ kind: "demo", name: `${axis}.${value}` })
      }
    }
  }
  return gaps
}

const IMPLICIT_PACKAGES = new Set(["react", "react-native"])

/** Module specifiers a source imports, as written. */
export function readImports(source: string) {
  return [
    ...new Set(
      [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1])
    ),
  ]
}

function toPackageName(specifier: string) {
  const parts = specifier.split("/")
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]
}

function stripVersion(dependency: string) {
  return dependency.replace(/(?!^)@[^/]*$/, "")
}

export type NativeItem = {
  name: string
  dependencies?: string[]
  registryDependencies?: string[]
  files?: { path: string }[]
}

/** Everything an item brings when installed: its own and its dependencies'. */
export function getItemClosure(
  name: string,
  items: Map<string, NativeItem>,
  seen = new Set<string>()
) {
  const packages = new Set<string>()
  const files = new Set<string>()
  if (seen.has(name)) return { packages, files }
  seen.add(name)
  const item = items.get(name)
  if (!item) return { packages, files }
  for (const dependency of item.dependencies ?? []) {
    packages.add(stripVersion(dependency))
  }
  for (const file of item.files ?? []) files.add(file.path)
  for (const dependency of item.registryDependencies ?? []) {
    const nested = getItemClosure(
      dependency.replace(/^@fabricator\//, ""),
      items,
      seen
    )
    nested.packages.forEach((value) => packages.add(value))
    nested.files.forEach((value) => files.add(value))
  }
  return { packages, files }
}

/**
 * Imports an install wouldn't satisfy: a package or registry file the item
 * doesn't bring. `sourceImports` holds specifiers after the build's rewrite.
 */
export function findUnresolvedImports(
  name: string,
  sourceImports: string[],
  items: Map<string, NativeItem>
): ParityGap[] {
  const { packages, files } = getItemClosure(name, items)
  const gaps: ParityGap[] = []
  for (const specifier of sourceImports) {
    if (specifier.startsWith("@/registry/native/")) {
      const stem = specifier.slice("@/registry/native/".length)
      if (![".ts", ".tsx"].some((ext) => files.has(`${stem}${ext}`))) {
        gaps.push({ kind: "import", name: specifier })
      }
      continue
    }
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      gaps.push({ kind: "import", name: specifier })
      continue
    }
    const packageName = toPackageName(specifier)
    if (!IMPLICIT_PACKAGES.has(packageName) && !packages.has(packageName)) {
      gaps.push({ kind: "import", name: specifier })
    }
  }
  return gaps
}

export type ParityException = {
  item: string
  kind: ParityGap["kind"]
  name: string
  reason: string
  date: string
}

/** Gaps left once the reviewed exceptions are applied. */
export function applyExceptions(
  item: string,
  gaps: ParityGap[],
  exceptions: ParityException[]
) {
  return gaps.filter(
    (gap) =>
      !exceptions.some(
        (exception) =>
          exception.item === item &&
          exception.kind === gap.kind &&
          exception.name === gap.name
      )
  )
}

/** Whole-component exceptions never suppress gaps in an implemented item. */
export function getMissingComponentStatus(
  item: string,
  exceptions: ParityException[]
): "missing" | "deferred" {
  const deferred = exceptions.some((exception) => {
    if (
      exception.item !== item ||
      exception.kind !== "component" ||
      exception.name !== item ||
      !exception.reason.trim()
    )
      return false
    const date = new Date(exception.date)
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === exception.date
    )
  })
  return deferred ? "deferred" : "missing"
}
