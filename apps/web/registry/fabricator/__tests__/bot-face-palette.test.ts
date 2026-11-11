import { readFileSync } from "node:fs"
import { expect, it } from "vitest"

import { roleLiterals } from "@/registry/fabricator/color-roles"
import { ROLE_PRESETS } from "@/registry/fabricator/look-presets"

it("keeps named BotFace hues equal to Fabricator's primary colour presets", () => {
  for (const platform of ["fabricator", "native"]) {
    const source = readFileSync(
      `registry/styles/${platform}/bot-face.css`,
      "utf8"
    )
    for (const preset of ROLE_PRESETS.primary.filter(
      (preset) => preset.value !== "neutral"
    )) {
      for (const mode of ["light", "dark"] as const) {
        const fill = roleLiterals("primary", mode, preset.color).primary
        expect(source).toContain(`text-[${fill.replaceAll(" ", "_")}]`)
      }
    }
  }
})
