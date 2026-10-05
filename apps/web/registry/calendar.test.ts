import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const registryDir = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(registryDir, "..")

function findFiles(dir: string, fileName: string): string[] {
  // Fabricator does not ship the frozen v3 styles (public/r/styles/default,
  // new-york), so their directories may not exist.
  if (!existsSync(dir)) {
    return []
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      return findFiles(path, fileName)
    }

    return entry.name === fileName ? [path] : []
  })
}

describe("calendar registry items", () => {
  // React Aria's calendar is built on react-aria-components, not
  // react-day-picker, so the aria base and its styles are out of scope.
  const sourceFiles = [
    ...findFiles(resolve(appDir, "registry/bases"), "calendar.tsx"),
    ...findFiles(resolve(appDir, "registry/new-york-v4"), "calendar.tsx"),
    ...findFiles(resolve(appDir, "styles"), "calendar.tsx"),
  ].filter((file) => !/[\\/](aria|aria-[a-z]+)[\\/]/.test(file))
  // Only the frozen legacy styles are checked here: they have no .tsx source
  // and are maintained by editing the published JSON directly in git. All
  // other styles are generated from the sources checked above.
  const publicFiles = [
    ...findFiles(resolve(appDir, "public/r/styles/default"), "calendar.json"),
    ...findFiles(resolve(appDir, "public/r/styles/new-york"), "calendar.json"),
  ]

  it.each(sourceFiles.map((file) => [relative(appDir, file), file]))(
    "%s uses the react-day-picker v10 month_grid class key",
    (_, file) => {
      const source = readFileSync(file, "utf-8")

      expect(source).not.toContain('table: "w-full border-collapse"')
      expect(source).toContain(
        'month_grid: cn("w-full border-collapse", defaultClassNames.month_grid)'
      )
    }
  )

  it.each(publicFiles.map((file) => [relative(appDir, file), file]))(
    "%s publishes the react-day-picker v10 month_grid class key",
    (_, file) => {
      const source = readFileSync(file, "utf-8")

      expect(source).not.toContain('table: \\"w-full border-collapse\\"')
      expect(source).toContain(
        'month_grid: cn(\\"w-full border-collapse\\", defaultClassNames.month_grid)'
      )
    }
  )
})
