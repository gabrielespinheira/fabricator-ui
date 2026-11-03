import fs from "node:fs"
import path from "node:path"

import { DUOTONE_SOURCES } from "./paths"
import { parseSvg } from "./svg"
import type { DuotoneIcon } from "./types"

export class DuotoneSourceError extends Error {
  override name = "DuotoneSourceError"
}

/**
 * Duotone icons: each file is its outline icon plus one `<g id="secondary">`.
 * The group's shapes become the secondary layer; its id is dropped, since ids
 * collide when several SVGs share a page.
 */
export function loadDuotoneIcons(directory = DUOTONE_SOURCES): DuotoneIcon[] {
  if (!fs.existsSync(directory)) return []
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".svg"))
    .sort()
    .map((file) => {
      const name = file.slice(0, -4)
      const parsed = parseSvg(
        fs.readFileSync(path.join(directory, file), "utf8")
      )
      const secondary = parsed.groups.find(
        (group) => group.attributes.id === "secondary"
      )
      if (!secondary)
        throw new DuotoneSourceError(`${name}: missing <g id="secondary">`)
      return { name, node: parsed.node, secondary: secondary.node }
    })
}
