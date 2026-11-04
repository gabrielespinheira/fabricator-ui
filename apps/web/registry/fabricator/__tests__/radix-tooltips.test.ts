import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const DIRECTORY = path.join(__dirname, "../radix/ui")

// Radix's Tooltip throws without a TooltipProvider above it, and the site's root
// layout provides one, so every page here hides the crash a real project gets.
// A part can't count on the app having one: it brings its own.
describe("Radix tooltips in the Fabricator parts", () => {
  const files = readdirSync(DIRECTORY).filter((file) => file.endsWith(".tsx"))

  it.each(files)("%s wraps each one in a provider", (file) => {
    const lines = readFileSync(path.join(DIRECTORY, file), "utf8").split("\n")
    lines.forEach((line, index) => {
      if (!/<Tooltip[ >]/.test(line)) return
      expect(lines[index - 1], `${file}:${index + 1}`).toContain(
        "<TooltipProvider"
      )
    })
  })
})
