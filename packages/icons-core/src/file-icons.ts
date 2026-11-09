import fs from "node:fs"
import path from "node:path"
import { parseSync, stringify } from "svgson"
import { z } from "zod"

import { FILE_SOURCES } from "./paths"
import type { FileIconData, FilePalette } from "./runtime/files"
import { readJson } from "./schemas"
import { parseSvg } from "./svg"
import type { IconElement } from "./types"

export const fileMetadataSchema = z.object({
  palette: z.record(
    z.string(),
    z.object({
      light: z.string().regex(/^#[0-9a-f]{6}$/i),
      dark: z.string().regex(/^#[0-9a-f]{6}$/i),
    })
  ),
  fileNames: z.record(z.string(), z.string()),
  fileExtensions: z.record(z.string(), z.string()),
  folderNames: z.record(z.string(), z.string()),
})

export class FileIconSourceError extends Error {
  override name = "FileIconSourceError"
}

export function transformFileSvg(
  source: string,
  palette: FilePalette
): IconElement[] {
  const root = parseSync(source)
  // The exported Figma clips cover exactly the SVG viewport. Drop only those
  // redundant clips; flatten the one-shape opacity group without changing paint.
  const clips = new Set<string>()
  for (const defs of root.children.filter((child) => child.name === "defs")) {
    for (const clip of defs.children) {
      const rect = clip.children[0]
      if (
        clip.name !== "clipPath" ||
        clip.children.length !== 1 ||
        rect?.name !== "rect" ||
        rect.attributes.width !== "16" ||
        rect.attributes.height !== "16" ||
        Object.keys(rect.attributes).some(
          (key) => !["width", "height", "fill"].includes(key)
        )
      )
        throw new FileIconSourceError("Unsupported file icon clip")
      clips.add(`url(#${clip.attributes.id})`)
    }
  }
  root.children = root.children.filter(
    (child) => child.name !== "defs" && child.name !== "mask"
  )
  for (const group of root.children.filter((child) => child.name === "g")) {
    const clip = group.attributes["clip-path"]
    if (clip && !clips.has(clip))
      throw new FileIconSourceError(`Unsupported clip ${clip}`)
    delete group.attributes["clip-path"]
    if (
      Object.keys(group.attributes).some((key) => key !== "opacity") ||
      (group.attributes.opacity && group.children.length !== 1)
    )
      throw new FileIconSourceError("Unsupported file icon group")
  }
  const parsed = parseSvg(stringify(root))
  if (parsed.attributes.viewBox !== "0 0 16 16")
    throw new FileIconSourceError("File icons must use a 16 × 16 grid")
  const node = parsed.ordered.flatMap((entry) =>
    "node" in entry
      ? entry.node.map(
          ([tag, attributes]): IconElement => [
            tag,
            { ...entry.attributes, ...attributes },
          ]
        )
      : [entry]
  )
  const names = new Map<string, string>()
  // Upstream replaces the first palette entry when two names share a paint.
  for (const [name, colors] of Object.entries(palette)) {
    if (!names.has(colors.dark.toLowerCase()))
      names.set(colors.dark.toLowerCase(), name)
  }
  return node.map(([tag, attributes]) => [
    tag,
    Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => {
        if (!value.startsWith("#")) return [key, value]
        const name = names.get(value.toLowerCase())
        const colors = name ? palette[name] : undefined
        if (!name || !colors)
          throw new FileIconSourceError(`Unknown file icon colour ${value}`)
        return [
          key,
          `var(--file-icon-${name}, light-dark(${colors.light}, ${colors.dark}))`,
        ]
      })
    ),
  ])
}

export function loadFileIcons() {
  const metadata = readJson(
    path.join(FILE_SOURCES, "metadata.json"),
    fileMetadataSchema
  )
  const icons: FileIconData[] = fs
    .readdirSync(path.join(FILE_SOURCES, "icons"))
    .filter((file) => file.endsWith(".svg"))
    .sort()
    .map((file) => {
      const source = fs.readFileSync(
        path.join(FILE_SOURCES, "icons", file),
        "utf8"
      )
      const masks = parseSync(source)
        .children.filter((child) => child.name === "mask")
        .map((mask) => {
          const { id, ...attributes } = mask.attributes
          if (!id) throw new FileIconSourceError(`Mask without id in ${file}`)
          return {
            id,
            attributes,
            node: parseSvg(stringify({ ...mask, name: "svg", attributes: {} }))
              .node,
          }
        })
      return {
        name: file.slice(0, -4),
        node: transformFileSvg(source, metadata.palette),
        ...(masks.length > 0 && { masks }),
      }
    })
  const names = new Set(icons.map(({ name }) => name))
  for (const name of [
    "default-file",
    "default-folder",
    "default-folder-open",
    ...Object.values(metadata.fileNames),
    ...Object.values(metadata.fileExtensions),
    ...Object.values(metadata.folderNames),
  ]) {
    if (!names.has(name))
      throw new FileIconSourceError(`Missing file artwork: ${name}`)
  }
  for (const name of Object.values(metadata.folderNames)) {
    if (!names.has(`${name}-open`))
      throw new FileIconSourceError(`Missing expanded folder artwork: ${name}`)
  }
  return { icons, ...metadata }
}
