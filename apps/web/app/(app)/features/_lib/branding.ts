import type * as React from "react"

import { type RoleColor } from "@/registry/fabricator/color-roles"
import { type SurfaceTint } from "@/registry/fabricator/surface-tint"

/** The scene's brand inputs: the primary role and the surface tint. */
export function getBrandVars(primary: RoleColor, surface: SurfaceTint) {
  return {
    "--primary-hue": String(primary.hue),
    "--primary-chroma": String(primary.chroma),
    "--surface-hue": String(surface.hue),
    "--surface-chroma": String(surface.chroma),
  } satisfies Record<`--${string}`, string> as React.CSSProperties
}
