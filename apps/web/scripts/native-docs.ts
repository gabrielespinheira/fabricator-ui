// The pure parts of the native docs generator: turning a component's demo and
// shape into a page. See build-native-docs.mts.

import type { ComponentShape } from "./native-parity"

/** A demo's code as a reader installs it: user-facing paths, no demo wrappers. */
export function toReaderSource(source: string) {
  return source
    .replace(/^import \{[^}]*\} from "@\/examples\/native\/example"\n/m, "")
    .replace(/@\/registry\/native\/ui\//g, "@/components/ui/")
    .replace(/@\/registry\/native\/lib\//g, "@/lib/")
    .replace(/@\/registry\/native\/hooks\//g, "@/hooks/")
}

function dedent(lines: string[]) {
  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => line.length - line.trimStart().length)
  const indent = indents.length > 0 ? Math.min(...indents) : 0
  return lines.map((line) => line.slice(indent)).join("\n")
}

/** The first example's body: the shortest real usage a demo has. */
export function getUsageSnippet(source: string) {
  const open = /<Example\b[^>]*>\n/.exec(source)
  if (!open) return null
  const start = open.index + open[0].length
  const end = source.indexOf("</Example>", start)
  if (end === -1) return null
  const lines = source.slice(start, end).split("\n")
  while (lines.at(-1)?.trim() === "") lines.pop()
  return dedent(lines)
}

/** Imports from the demo that belong to the library. */
export function getUsageImports(source: string) {
  const imports =
    toReaderSource(source).match(
      /^import \{[^}]*\} from "@\/components\/ui\/[^"]+"$/gm
    ) ?? []
  return imports.join("\n")
}

function escapeCell(value: string) {
  return value.replace(/\|/g, "\\|")
}

export function getPartsList(shape: ComponentShape) {
  return shape.exports.filter((name) => /^[A-Z]/.test(name))
}

export function getVariantsTable(shape: ComponentShape) {
  const rows = Object.entries(shape.variants).map(
    ([axis, values]) =>
      `| \`${axis}\` | ${values.map((value) => `\`${escapeCell(value)}\``).join(", ")} |`
  )
  if (rows.length === 0) return null
  return ["| Prop | Values |", "| --- | --- |", ...rows].join("\n")
}

const INHERITED_PROPS = new Set(["className", "children", "style", "ref"])

export function getPropsList(shape: ComponentShape) {
  return shape.props.filter((name) => !INHERITED_PROPS.has(name))
}

/** Roles a source sets, for the accessibility section. */
export function getRoles(source: string) {
  return [
    ...new Set(
      [...source.matchAll(/\brole="([a-z]+)"/g)].map((match) => match[1])
    ),
  ].sort()
}

export function toTitleCase(name: string) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
