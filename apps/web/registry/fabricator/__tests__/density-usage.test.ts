import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// Every Fabricator style map sizes its controls with the density tokens
// (registry/fabricator/density.ts): `h-(--density-36)`,
// `text-(length:--density-text-13)`, `size-(--density-icon-16)`. Fixed
// heights, text sizes and icon sizes would ignore the density a project or a
// container picks, so they fail here. New components follow the same rule.

const STYLES = path.join(process.cwd(), "registry/styles/fabricator")

const RULES: [string, RegExp][] = [
  [
    "a fixed text size (use text-(length:--density-text-<px>))",
    /(?:^|:)text-\[1[1-6]px\]!?$/,
  ],
  [
    "a fixed control size (use --density-<px>)",
    /(?:^|:)-?(?:h|size|min-h|min-w)-(?:5|6|7|8|9|10|11|12)!?$/,
  ],
  [
    "a fixed icon size (use size-(--density-icon-16) or -14)",
    /svg.*:size-(?:3\.5|4|\[18px\])!?$/,
  ],
]

// Deliberately fixed, as "<placeholder> <class>": the extra-small button is
// the 24px floor in every density, the drawer's swipe area and the resizable
// grip keep their shape, and Native Select is left out of the Fabricator
// library.
const ALLOWED = new Set([
  "cn-button-size-xs h-6",
  "cn-button-size-xs text-[12px]",
  "cn-button-size-icon-xs size-6",
  "cn-drawer-swipe-handle group-data-[swipe-axis=x]/drawer-popup:after:h-12",
  "cn-resizable-handle-icon h-6",
])

const SKIPPED_FILES = new Set(["native-select.css"])

function findViolations() {
  return readdirSync(STYLES)
    .filter((name) => name.endsWith(".css") && !SKIPPED_FILES.has(name))
    .flatMap((name) =>
      [
        ...readFileSync(path.join(STYLES, name), "utf8").matchAll(
          /\.(cn-[\w-]+)\s*\{\s*@apply ([^;]*);/g
        ),
      ].flatMap(([, placeholder, classes]) =>
        classes
          .split(/\s+/)
          .filter((token) => !ALLOWED.has(`${placeholder} ${token}`))
          .flatMap((token) =>
            RULES.filter(([, pattern]) => pattern.test(token)).map(
              ([reason]) => `${name} .${placeholder}: ${token} (${reason})`
            )
          )
      )
    )
}

describe("density usage", () => {
  it("style maps size controls with the density tokens", () => {
    expect(findViolations()).toEqual([])
  })
})
