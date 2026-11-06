import { Uniwind } from "uniwind"

import type { FabricatorLook } from "@/registry/fabricator/look"
import { getNativeRuntimeVariables } from "@/registry/fabricator/native-theme"

/** Changes the app's look at runtime: surface, roles, radius, density, motion. */
export function applyLook(look: FabricatorLook) {
  Uniwind.updateCSSVariables("light", getNativeRuntimeVariables("light", look))
  Uniwind.updateCSSVariables("dark", getNativeRuntimeVariables("dark", look))
}
