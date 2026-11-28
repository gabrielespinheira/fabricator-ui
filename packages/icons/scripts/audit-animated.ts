/**
 * bun run icons:audit: opens every animated icon in Chrome and checks what
 * only a browser can show. Run it after drawing or motion changes.
 *
 *   - hover and the ref handle both animate it
 *   - it returns to rest on its own or when stopped
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
const SETTLED_MILLISECONDS = 1000

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

async function open(
  mode: string,
  { reduced = false, weight = "outline", loop = "" } = {}
) {
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
  const query = new URLSearchParams({ mode, weight, loop })
  await page.goto(`file://${output}/index.html?${query}`)
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

async function auditWeight(weight: string) {
  const controlled = await open("controlled", { weight })
  const names = await controlled.evaluate(() => window.audit.names)

  const staticPage = await open("outline", { weight })
  const staticDrawing = await shoot(staticPage, `${weight}.png`)
  await staticPage.close()

  const rest = await shoot(controlled, `${weight}-rest.png`)
  // Start one group at a time so a short animation cannot finish while Chrome
  // is busy painting thousands of simultaneously moving SVGs for a screenshot.
  for (let index = 0; index < names.length; index += MOTION_BATCH_SIZE) {
    const group = names.slice(index, index + MOTION_BATCH_SIZE)
    const still = await controlled.evaluate(async (selection) => {
      const readPose = (elements: Element[]) =>
        elements
          .map((element) => {
            const { transform, opacity, strokeDasharray, strokeDashoffset } =
              getComputedStyle(element)
            const isStill =
              transform === "none" ||
              new DOMMatrixReadOnly(transform).isIdentity
            return `${isStill ? "" : transform}:${opacity}:${strokeDasharray}:${strokeDashoffset}:${element.getAttribute("d") ?? ""}`
          })
          .join(";")
      const pending = new Map(
        selection.map((name) => {
          const elements = Array.from(
            document.querySelectorAll(`[data-name="${name}"] svg :is(g, path)`)
          )
          return [name, { elements, rest: readPose(elements) }]
        })
      )
      window.audit.start(selection)
      const deadline = performance.now() + 600
      do {
        await new Promise(requestAnimationFrame)
        for (const [name, { elements, rest }] of pending) {
          if (readPose(elements) !== rest) pending.delete(name)
        }
      } while (pending.size > 0 && performance.now() < deadline)
      return [...pending.keys()]
    }, group)
    for (const name of still)
      problems.push(`${weight} ${name}: the ref handle shows no movement`)
  }
  await wait(SETTLED_MILLISECONDS)
  const finished = await shoot(controlled, `${weight}-after-play.png`)
  await controlled.close()

  names.forEach((name, index) => {
    if (difference(finished, rest, index) > RETURNED_TO_REST)
      problems.push(`${weight} ${name}: doesn't return to rest after playing`)
    const drift = difference(rest, staticDrawing, index)
    if (drift > SAME_DRAWING)
      problems.push(
        `${weight} ${name}: differs from the static drawing by ${drift.toFixed(3)}`
      )
  })
  return { names, rest }
}

const { names, rest } = await auditWeight("outline")
await auditWeight("fill")
await auditWeight("duotone")

// Real hover, from a corner of the box, where no shape is painted.
const hover = await open("hover")
const hoverSamples = [
  "archive",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-down",
  "arrow-up-right",
  "arrow-down-left",
  "bell",
  "bookmark",
  "calendar-arrow-right",
  "calendar-check-2",
  "check",
  "circle-arrow-right",
  "download",
  "heart",
  "pencil",
  "panel-left",
  "panel-right",
  "refresh-cw",
  "send",
  "sidebar-toggle",
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

for (const weight of ["outline", "fill", "duotone"]) {
  const animation = await open("samples", { weight, loop: "arrow-up-right" })
  const names = await animation.evaluate(() => window.audit.names)
  const original = await shoot(animation)

  const result = await animation.evaluate(async (weight) => {
    function paths(name: string) {
      return Array.from(
        document.querySelectorAll<SVGPathElement>(
          `[data-name="${name}"] svg path`
        )
      )
    }
    function position(name: string, index = 0) {
      const matrix = paths(name)[index]?.getCTM()
      return { x: matrix?.e ?? 0, y: matrix?.f ?? 0 }
    }
    const first = position("arrow-up-right")
    const second = position("arrow-down-left")
    const diagonal = { forward: false, reverse: false, loop: false }
    const morphs = ["eye", "menu", "activity", "sliders-horizontal"].map(
      (name) => {
        const path = paths(name)[0]
        const length = path?.getTotalLength() ?? 0
        const point = path?.getPointAtLength(length * 0.16)
        return { name, path, length, point, moved: false }
      }
    )
    const house = document.querySelector('[data-name="house"] svg')
    let houseAssembled = false
    window.audit.start([
      "arrow-up-right",
      "arrow-down-left",
      ...morphs.map(({ name }) => name),
      "house",
    ])
    const began = performance.now()
    do {
      await new Promise(requestAnimationFrame)
      const up = position("arrow-up-right")
      const down = position("arrow-down-left")
      if (up.x - first.x > 1 && up.y - first.y < -1) {
        diagonal.forward = true
        if (performance.now() - began > 750) diagonal.loop = true
      }
      if (down.x - second.x < -1 && down.y - second.y > 1)
        diagonal.reverse = true
      for (const morph of morphs) {
        if (!morph.path || !morph.point || morph.moved) continue
        const length = morph.path.getTotalLength()
        const point = morph.path.getPointAtLength(length * 0.16)
        morph.moved =
          Math.abs(length - morph.length) > 0.5 ||
          Math.hypot(point.x - morph.point.x, point.y - morph.point.y) > 0.5
      }
      if (house) {
        const line = house.querySelector("path[pathLength]")
        const face = house.querySelector("g")
        if (
          weight === "fill"
            ? face && Number(getComputedStyle(face).opacity) < 0.7
            : line &&
              Number.parseFloat(getComputedStyle(line).strokeDashoffset) > 0.2
        )
          houseAssembled = true
      }
    } while (performance.now() - began < 1150)
    window.audit.stop(["arrow-up-right"])

    function getDivider(name: string) {
      return document
        .querySelector(`[data-name="${name}"] svg g[transform]`)
        ?.getAttribute("transform")
    }
    const panel = { moved: false, open: false, closed: false }
    window.audit.setPanelOpen(true)
    const openedAt = performance.now()
    do {
      await new Promise(requestAnimationFrame)
      const left = getDivider("panel-left")
      const right = getDivider("panel-right")
      if (left && left !== "translate(3.6 0)") panel.moved = true
      if (left === "translate(3.6 0)" && right === "translate(-3.6 0)")
        panel.open = true
    } while (performance.now() - openedAt < 470)
    window.audit.setPanelOpen(false)
    const closedAt = performance.now()
    do {
      await new Promise(requestAnimationFrame)
    } while (performance.now() - closedAt < 390)
    panel.closed = !getDivider("panel-left") && !getDivider("panel-right")
    const pathMorphs = Object.fromEntries(
      morphs.map(({ name, moved }) => [name, moved])
    )
    return { ...diagonal, ...panel, ...pathMorphs, houseAssembled }
  }, weight)
  for (const [check, passed] of Object.entries(result)) {
    if (!passed) problems.push(`${weight}: ${check} motion check failed`)
  }
  const restored = await shoot(animation)
  names.forEach((name, index) => {
    if (difference(original, restored, index) > RETURNED_TO_REST)
      problems.push(
        `${weight} ${name}: doesn't return to rest after stopping or closing`
      )
  })
  // This pose is the rightward keyframe of a nearly full-width arrow.
  const hasRoom = await animation.evaluate(() => {
    const svg = document.querySelector('[data-name="arrow-big-right"] svg')
    svg?.querySelector("g")?.setAttribute("transform", "translate(2.55 0)")
    return svg && getComputedStyle(svg).overflow === "visible"
  })
  const visible = await shoot(animation)
  await animation.evaluate(() =>
    document
      .querySelector('[data-name="arrow-big-right"] svg')
      ?.setAttribute("overflow", "hidden")
  )
  const clipped = await shoot(animation)
  if (
    !hasRoom ||
    difference(visible, clipped, names.indexOf("arrow-big-right")) === 0
  )
    problems.push(
      `${weight}: the forward keyframe loses ink at the SVG viewport`
    )
  await animation.close()
}

await browser.close()

const unique = [...new Set(problems)]
for (const problem of unique) console.error(`✗ ${problem}`)
console.log(
  `${names.length} animated icons in three weights, ${hoverSamples.length} actual hover checks, ${unique.length} problems. Frames: ${path.relative(process.cwd(), output)}`
)
if (unique.length > 0) process.exit(1)
