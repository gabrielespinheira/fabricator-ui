/**
 * Renders a review page from the real components: outline icons at the
 * Fabricator sizes and strokes, and every brand in both colour modes, on
 * light and dark panels. Writes .tmp-preview/index.html (gitignored).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { brandCatalog } from "../src/catalog"
import { loadIcon } from "../src/dynamic"
import type { IconProps } from "../src/icon"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SAMPLE = [
  "house",
  "bell",
  "search",
  "settings",
  "user",
  "mail",
  "calendar",
  "chevron-down",
  "check",
  "x",
  "plus",
  "trash-2",
  "pencil",
  "copy",
  "download",
  "upload",
  "heart",
  "star",
  "circle",
  "square",
  "panel-left",
  "menu",
  "funnel",
  "info",
  "triangle-alert",
  "circle-check",
  "lock",
  "globe",
]
const PAIRS: [outline: string, brand: string][] = [
  ["house", "github"],
  ["mail", "google"],
  ["calendar", "google-calendar"],
  ["square", "x"],
  ["circle", "instagram"],
  ["users", "linkedin"],
  ["code", "node-js"],
  ["file-code", "typescript"],
]

async function renderer(set: "outline" | "brands") {
  const names =
    set === "outline"
      ? [...SAMPLE, ...PAIRS.map(([name]) => name)]
      : brandCatalog.map((entry) => entry.name)
  const components = new Map(
    await Promise.all(
      names.map(async (name) => {
        const component = await loadIcon(name, set)
        if (!component) throw new Error(`There is no ${set} icon named ${name}`)
        return [name, component] as const
      })
    )
  )
  return (name: string, props: IconProps) => {
    const component = components.get(name)
    if (!component) throw new Error(`${name} was not loaded`)
    return renderToStaticMarkup(createElement(component, props))
  }
}

const icon = await renderer("outline")
const brand = await renderer("brands")

function outlineRows() {
  return [14, 16, 18, 24]
    .flatMap((size) =>
      [1.5, 2].map(
        (strokeWidth) =>
          `<div class="row"><span class="label">${size}px · ${strokeWidth}</span>${SAMPLE.map((name) => icon(name, { size, strokeWidth })).join("")}</div>`
      )
    )
    .join("")
}

function brandGrid() {
  return brandCatalog
    .map((entry) => {
      return `<figure>${brand(entry.name, { size: 24 })}${brand(entry.name, { size: 24, color: "brand" })}<figcaption>${entry.title}</figcaption></figure>`
    })
    .join("")
}

function mixedRow() {
  return PAIRS.map(
    ([outlineName, brandName]) =>
      `<span class="pair">${icon(outlineName, { size: 16, strokeWidth: 1.5 })}${brand(brandName, { size: 16 })}${brand(brandName, { size: 16, color: "brand" })}</span>`
  ).join("")
}

function panel(scheme: "light" | "dark") {
  return `<section class="panel ${scheme}">
  <h2>${scheme}</h2>
  <h3>Outline (Lucide 1.66.0), sizes × strokes</h3>${outlineRows()}
  <h3>Outline beside brands at 16px: outline · one colour · brand colour</h3><div class="row">${mixedRow()}</div>
  <h3>Brands: one colour · brand colour (${brandCatalog.length})</h3><div class="grid">${brandGrid()}</div>
</section>`
}

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Fabricator Icons preview</title><style>
body{margin:0;font:13px/1.4 system-ui,sans-serif;display:grid;grid-template-columns:1fr 1fr}
.panel{padding:24px}.light{background:#fafafa;color:#171717;color-scheme:light}.dark{background:#171717;color:#f5f5f5;color-scheme:dark}
h2{margin:0 0 8px;text-transform:capitalize}h3{font-size:12px;font-weight:500;opacity:.7;margin:20px 0 8px}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:6px 0}.label{width:72px;opacity:.6;font-size:11px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
figure{margin:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;padding:10px 4px;border-radius:8px;background:color-mix(in oklab,currentColor 4%,transparent)}
figcaption{width:100%;text-align:center;font-size:10px;opacity:.65}.pair{display:inline-flex;gap:6px;padding:6px 8px;border-radius:6px;background:color-mix(in oklab,currentColor 5%,transparent)}
</style></head><body>${panel("light")}${panel("dark")}</body></html>`

const out = path.join(root, ".tmp-preview")
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, "index.html"), html)
console.log(path.join(out, "index.html"))
