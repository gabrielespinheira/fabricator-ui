/**
 * bun run icons:audit: opens every animated icon in Chrome and checks what
 * only a browser can show. Run it after `icons:animated` and Lucide upgrades.
 *
 *   - hover and the ref handle both animate it
 *   - it returns to rest afterwards
 *   - at rest it draws the current outline icon
 *   - reduced motion and data-motion="off" stop it
 *   - nothing logs an error
 *
 * Set CHROME_PATH if Chrome isn't in the default macOS place. Frames for a
 * human to review stay in .tmp-audit/ (gitignored).
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer, { type Page } from "puppeteer-core"
import sharp from "sharp"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.join(root, ".tmp-audit")
const CELL = 64
const COLUMNS = 24
/** Share of a cell's inked pixels that may differ before it counts as different. */
const SAME_DRAWING = 0.02
const RETURNED_TO_REST = 0.1
const MOTION_BATCH_SIZE = 128

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

fs.rmSync(output, { recursive: true, force: true })
execFileSync(
  process.execPath,
  [
    "build",
    path.join(root, "scripts/audit-animated-page.tsx"),
    "--outdir",
    output,
    "--target",
    "browser",
    "--define",
    'process.env.NODE_ENV="production"',
  ],
  { cwd: root, stdio: "pipe" }
)
fs.writeFileSync(
  path.join(output, "index.html"),
  '<!doctype html><html><body style="margin:0;background:#fff"><div id="root"></div><script type="module" src="./audit-animated-page.js"></script></body></html>'
)

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--allow-file-access-from-files"],
})
const problems: string[] = []

async function open(mode: string, { reduced = false } = {}) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1536, height: 1400 })
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warn")
      problems.push(`[${mode}] logged: ${message.text().slice(0, 200)}`)
  })
  page.on("pageerror", (error) =>
    problems.push(`[${mode}] threw: ${String(error).slice(0, 200)}`)
  )
  if (reduced) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ])
  }
  await page.goto(`file://${output}/index.html?mode=${mode}`)
  await page.waitForFunction(() => window.audit !== undefined)
  await wait(400)
  return page
}

type Shot = { pixels: Buffer; width: number }

async function shoot(page: Page, file?: string): Promise<Shot> {
  const png = Buffer.from(await page.screenshot({ fullPage: true }))
  if (file) fs.writeFileSync(path.join(output, file), png)
  const { data, info } = await sharp(png)
    .flatten({ background: "#fff" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { pixels: data, width: info.width }
}

function difference(a: Shot, b: Shot, index: number) {
  const left = (index % COLUMNS) * CELL
  const top = Math.floor(index / COLUMNS) * CELL
  let inked = 0
  let different = 0
  for (let y = top; y < top + CELL; y++) {
    for (let x = left; x < left + CELL; x++) {
      const first = a.pixels[y * a.width + x] ?? 255
      const second = b.pixels[y * b.width + x] ?? 255
      if (first < 128 || second < 128) inked++
      if (Math.abs(first - second) > 96) different++
    }
  }
  return inked === 0 ? 0 : different / inked
}

const controlled = await open("controlled")
const names = await controlled.evaluate(() => window.audit.names)

const outlinePage = await open("outline")
const outline = await shoot(outlinePage, "outline.png")
await outlinePage.close()

const rest = await shoot(controlled, "rest.png")
// Start one group at a time so a short animation cannot finish while Chrome
// is busy painting thousands of simultaneously moving SVGs for a screenshot.
for (let index = 0; index < names.length; index += MOTION_BATCH_SIZE) {
  const group = names.slice(index, index + MOTION_BATCH_SIZE)
  const still = await controlled.evaluate(async (selection) => {
    const pending = new Map(
      selection.map((name) => [
        name,
        document.querySelector(`[data-name="${name}"] svg > g`),
      ])
    )
    window.audit.start(selection)
    const deadline = performance.now() + 600
    do {
      await new Promise(requestAnimationFrame)
      for (const [name, element] of pending) {
        if (!element) continue
        const { transform, opacity } = getComputedStyle(element)
        const moves =
          transform !== "none" && !new DOMMatrixReadOnly(transform).isIdentity
        if (moves || Number(opacity) < 0.98) pending.delete(name)
      }
    } while (pending.size > 0 && performance.now() < deadline)
    window.audit.stop(selection)
    return [...pending.keys()]
  }, group)
  for (const name of still)
    problems.push(`${name}: the ref handle shows no movement`)
}
await wait(200)
const stopped = await shoot(controlled, "stopped.png")
await controlled.close()

names.forEach((name, index) => {
  if (difference(stopped, rest, index) > RETURNED_TO_REST)
    problems.push(`${name}: doesn't return to rest after stopAnimation`)
  const drift = difference(rest, outline, index)
  if (drift > SAME_DRAWING)
    problems.push(
      `${name}: differs from the static drawing by ${drift.toFixed(3)}`
    )
})

// Real hover, from a corner of the box, where no shape is painted.
const hover = await open("hover")
const hoverSamples = [
  "archive",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-down",
  "bell",
  "bookmark",
  "check",
  "heart",
  "pencil",
  "refresh-cw",
  "send",
  "toggle-right",
  "view",
]
for (const name of hoverSamples) {
  const box = await hover.evaluate((each) => {
    const icon = document.querySelector(`[data-name="${each}"] svg`)
    if (!icon) throw new Error(`Missing hover sample: ${each}`)
    icon.scrollIntoView({ block: "center" })
    const { x, y } = icon.getBoundingClientRect()
    return { x, y }
  }, name)
  await hover.mouse.move(1530, 1395)
  await hover.evaluate((each) => window.audit.watch(each), name)
  await hover.mouse.move(box.x + 1.5, box.y + 1.5)
  await wait(120)
  const early = await hover.evaluate(() => window.audit.activity())
  await wait(250)
  const late = await hover.evaluate(() => window.audit.activity())
  if (early + late === 0) problems.push(`${name}: hover does nothing`)
}
await hover.mouse.move(1530, 1395)
await wait(2500)
const afterHover = await shoot(hover, "after-hover.png")
await hover.close()
names.forEach((name, index) => {
  if (difference(afterHover, rest, index) > RETURNED_TO_REST)
    problems.push(`${name}: doesn't return to rest after hover`)
})

for (const [label, reduced] of [
  ["reduced motion", true],
  ['data-motion="off"', false],
] as const) {
  const page = await open("controlled", { reduced })
  await page.evaluate((isReduced) => {
    if (!isReduced) document.documentElement.dataset.motion = "off"
    window.audit.watch()
    window.audit.start()
  }, reduced)
  await wait(900)
  const activity = await page.evaluate(() => window.audit.activity())
  if (activity > 0) problems.push(`${label}: icons still animate (${activity})`)
  await page.close()
}

await browser.close()

const unique = [...new Set(problems)]
for (const problem of unique) console.error(`✗ ${problem}`)
console.log(
  `${names.length} animated icons, ${hoverSamples.length} actual hover checks, ${unique.length} problems. Frames: ${path.relative(process.cwd(), output)}`
)
if (unique.length > 0) process.exit(1)
