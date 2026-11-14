import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const DIRECTORY = path.join(__dirname, "../radix/ui")

// Radix's Tooltip throws without a TooltipProvider above it, and the site's root
// layout provides one, so every page here hides the crash a real project gets.
// A part can't count on the app having one: it brings its own.
describe("Radix tooltips in the Fabricator parts", () => {
  const files = readdirSync(DIRECTORY).filter((file) => file.endsWith(".tsx"))

  // A tooltip held in a const counts when the file wraps that const in a
  // provider: an avatar shares its group's provider and brings its own alone.
  it.each(files)("%s wraps each one in a provider", (file) => {
    const source = readFileSync(path.join(DIRECTORY, file), "utf8")
    const lines = source.split("\n")
    lines.forEach((line, index) => {
      if (!/<Tooltip[ >]/.test(line)) return
      const held = lines[index - 1].match(/^\s*const (\w+) = \($/)?.[1]
      if (held) {
        expect(source, `${file}:${index + 1}`).toContain(
          `<TooltipProvider>{${held}}</TooltipProvider>`
        )
        return
      }
      expect(lines[index - 1], `${file}:${index + 1}`).toContain(
        "<TooltipProvider"
      )
    })
  })
})
