/**
 * bun run icons:sheet <names...>
 *
 * Renders a review sheet for outline icons: each icon at 14, 16, 18 and 24px
 * with stroke 1.5 and 2 (Fabricator's resting and hover strokes), beside the
 * `circle` and `square` references, on light and dark. Attach it to the PR.
 */
import fs from "node:fs"
import path from "node:path"
import { Resvg } from "@resvg/resvg-js"

import { loadOutlineIcons } from "../src/outline"
import { PACKAGE_ROOT } from "../src/paths"
import { renderSvgInline } from "../src/svg"

const SIZES = [14, 16, 18, 24]
const STROKES = [1.5, 2]
const CELL = 40
const LABEL = 120
const THEMES = [
  { background: "#fafafa", foreground: "#171717" },
  { background: "#171717", foreground: "#f5f5f5" },
]

const names = process.argv.slice(2)
if (names.length === 0) {
  console.error("Usage: bun run icons:sheet <names...>")
  process.exit(1)
}

const icons = new Map(loadOutlineIcons().map((icon) => [icon.name, icon]))
const rows = [...names, "circle", "square"].map((name) => {
  const icon = icons.get(name)
  if (!icon) throw new Error(`There is no outline icon named ${name}`)
  return icon
})

const columns = SIZES.flatMap((size) =>
  STROKES.map((stroke) => ({ size, stroke }))
)
const panelWidth = LABEL + columns.length * CELL
const height = rows.length * CELL + 24

const panels = THEMES.map((theme, index) => {
  const x = index * panelWidth
  const cells = rows.flatMap((icon, row) => [
    `<text x="${x + 12}" y="${24 + row * CELL + CELL / 2 + 4}" font-family="sans-serif" font-size="12" fill="${theme.foreground}">${icon.name}</text>`,
    ...columns.map(({ size, stroke }, column) => {
      const inner = renderSvgInline({}, icon.node).replace(
        /^<svg >|<\/svg>$/g,
        ""
      )
      const cx = x + LABEL + column * CELL + (CELL - size) / 2
      const cy = 24 + row * CELL + (CELL - size) / 2
      return `<svg x="${cx}" y="${cy}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${theme.foreground}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner.replaceAll('fill="currentColor"', `fill="${theme.foreground}"`)}</svg>`
    }),
  ])
  const headers = columns.map(
    ({ size, stroke }, column) =>
      `<text x="${x + LABEL + column * CELL + CELL / 2}" y="16" text-anchor="middle" font-family="sans-serif" font-size="9" fill="${theme.foreground}" opacity="0.6">${size}·${stroke}</text>`
  )
  return `<rect x="${x}" y="0" width="${panelWidth}" height="${height}" fill="${theme.background}"/>${headers.join("")}${cells.join("")}`
})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${panelWidth * 2}" height="${height}">${panels.join("")}</svg>`
const png = new Resvg(svg, {
  fitTo: { mode: "zoom", value: 2 },
  font: { loadSystemFonts: true },
})
  .render()
  .asPng()
const out = path.join(PACKAGE_ROOT, ".tmp-sheet", `${names.join("-")}.png`)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, png)
console.log(out)
