import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// Every Fabricator style map takes its corners from the radius roles
// (registry/fabricator/radius.ts): `rounded-(--radius-control)`,
// `rounded-(--radius-surface)`, `rounded-(--radius-nested)` and the rest.
// Tailwind's rungs (`rounded-lg`) and fixed radii ignore the look's shape and
// the density, so they fail here. `rounded-full`, `rounded-none` and
// `rounded-[inherit]` stay: round things are round in every shape.

const STYLES = path.join(process.cwd(), "registry/styles/fabricator")

const RUNG =
  /(?:^|:)rounded(?:-(?:[trblse]|tl|tr|bl|br|ss|se|es|ee))?(?:-(?:xs|sm|md|lg|xl|2xl|3xl|4xl))?!?$/
const FIXED = /(?:^|:)rounded(?:-[a-z]{1,2})?-\[(?!inherit\])[^\]]+\]!?$/
// A rung read through a variable: `[--cell-radius:var(--radius-lg)]`.
const RUNG_VARIABLE = /var\(--radius-(?:sm|md|lg|xl|2xl|3xl|4xl)\)/
const ROLE =
  /var\(--radius-(?:control|surface|panel|mark|nested|inner|wrap)\)|--radius-(?:control|surface|panel|mark|nested|inner|wrap)\b/

// Fixed on purpose, as "<placeholder> <class>": chart keys and the folder
// illustration scale with their box; Markdown's inline code and task boxes
// scale with the text; the one-line Chat Input is a capsule around round
// buttons in every shape; the page revealed behind the phone sidebar takes
// a phone screen's corner.
const ALLOWED = new Set([
  "cn-chat-input data-[layout=default]:rounded-[calc(var(--density-36)/2+var(--density-8))]",
  "cn-sidebar-inset group-data-[reveal=open]/sidebar-wrapper:rounded-[48px]",
  "cn-candlestick-chart-legend-key rounded-[2px]",
  "cn-chart-legend-key data-[shape=square]:rounded-[2px]",
  "cn-donut-chart-list-key rounded-[2px]",
  "cn-folder-back rounded-[5cqw]",
  "cn-folder-file rounded-[2.5cqw]",
  "cn-markdown-code rounded-[0.3em]",
  "cn-markdown-task-checkbox rounded-[0.375em]",
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
          .filter((token) => {
            if (RUNG.test(token) || RUNG_VARIABLE.test(token)) return true
            return FIXED.test(token) && !ROLE.test(token)
          })
          .map((token) => `${name} .${placeholder}: ${token}`)
      )
    )
}

describe("radius usage", () => {
  it("style maps take their corners from the radius roles", () => {
    expect(findViolations()).toEqual([])
  })
})
