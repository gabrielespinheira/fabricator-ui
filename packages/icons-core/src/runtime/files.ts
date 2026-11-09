import type { IconElement } from "./types.js"

export class FileIconError extends Error {
  override name = "FileIconError"
}

export type FilePalette = Record<string, { light: string; dark: string }>
export type FileIconData = {
  name: string
  node: IconElement[]
  masks?: {
    id: string
    attributes: Record<string, string>
    node: IconElement[]
  }[]
}
export type FileAssociations = {
  fileNames: Record<string, string>
  fileExtensions: Record<string, string>
  folderNames: Record<string, string>
}

function own(map: Record<string, string>, key: string) {
  return Object.hasOwn(map, key) ? map[key] : undefined
}

function basename(name: string) {
  return name.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? ""
}

export function resolveFileIconName(
  name: string,
  associations: FileAssociations
) {
  const file = basename(name)
  const exact = own(associations.fileNames, file)
  if (exact) return exact
  let dot = file.indexOf(".")
  while (dot >= 0) {
    const icon = own(associations.fileExtensions, file.slice(dot + 1))
    if (icon) return icon
    dot = file.indexOf(".", dot + 1)
  }
  return "default-file"
}

export function resolveFolderIconName(
  name: string,
  open: boolean,
  associations: FileAssociations
) {
  const icon = own(associations.folderNames, basename(name)) ?? "default-folder"
  return open ? `${icon}-open` : icon
}

/** CSS variables on the web, concrete fills for native and standalone exports. */
export function resolveFilePaint(
  node: IconElement[],
  palette: FilePalette,
  scheme: "light" | "dark"
): IconElement[] {
  return node.map(([tag, attributes]) => [
    tag,
    Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => {
        const token = /^var\(--file-icon-([a-z-]+),/.exec(value)?.[1]
        if (!token) return [key, value]
        const colors = palette[token]
        if (!colors)
          throw new FileIconError(`Unknown file icon token: ${token}`)
        return [key, colors[scheme]]
      })
    ),
  ])
}
