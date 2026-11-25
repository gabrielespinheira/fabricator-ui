import * as React from "react"
import { useCSSVariable, useUniwind } from "uniwind"

import {
  getPaletteMark,
  PALETTE_ROLES,
} from "@/registry/fabricator/shared/lib/palette-model"
import { oklchToHex } from "@/registry/fabricator/surface-tint"

const VARIABLES = [
  ...PALETTE_ROLES.map((role) => `--${role}`),
  "--muted-foreground",
]
const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/
const VARIABLE = /^var\((--[\w-]+)\)$/

/** Resolves a palette colour to one a native view or drawing takes, per theme. */
function usePaletteMark() {
  const { theme } = useUniwind()
  // A new array each render; the joined values only change with the theme.
  const tokens = useCSSVariable(VARIABLES)
    .map((value) => (typeof value === "string" ? value : ""))
    .join("|")
  return React.useMemo(() => {
    const values = tokens.split("|")
    const read = (name: string) => values[VARIABLES.indexOf(name)]
    return (color: string) => {
      const literal = getPaletteMark(color)[theme === "dark" ? "dark" : "light"]
      const oklch = OKLCH.exec(literal)
      if (oklch)
        return oklchToHex(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]))
      const variable = VARIABLE.exec(literal)
      return variable ? read(variable[1]) : literal
    }
  }, [tokens, theme])
}

export { usePaletteMark }
