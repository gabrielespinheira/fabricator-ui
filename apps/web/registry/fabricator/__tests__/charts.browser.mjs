// Every chart's docs page in a real browser: the hero chart draws, fits a
// phone's width, has no serious axe violations in light or dark, answers the
// pointer and the keyboard with a tooltip, and its legend hides a series.
// Phone screenshots land in tmp/charts/browser/ for a look.
//
// Run with the dev server up:
//   node registry/fabricator/__tests__/charts.browser.mjs [item…]
// BASE=radix or BASE=aria checks another base's pages.
import assert from "node:assert/strict"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import puppeteer from "puppeteer-core"

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8")

const CHARTS = [
  "area-chart",
  "line-chart",
  "bar-chart",
  "composition-chart",
  "candlestick-chart",
  "bump-chart",
  "pie-chart",
  "donut-chart",
  "radial-chart",
  "radar-chart",
  "treemap",
  "funnel-chart",
  "sankey-chart",
  "heat-calendar",
  "status-bar",
]

const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate))
if (!executablePath)
  throw new Error("Set CHROME_PATH to an installed Chromium browser.")

const baseUrl = process.env.CAPTURE_URL ?? "http://localhost:4000"
const base = process.env.BASE ?? "base"
const requested = process.argv.slice(2)
const items = requested.length ? requested : CHARTS
const shots = new URL("../../../../../tmp/charts/browser/", import.meta.url)
mkdirSync(shots, { recursive: true })

const browser = await puppeteer.launch({ executablePath, headless: true })
const failures = []

async function open(item, { width, dark }) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 900, deviceScaleFactor: 2 })
  const response = await page.goto(
    `${baseUrl}/docs/components/${base}/${item}`,
    { waitUntil: "networkidle2", timeout: 180_000 }
  )
  assert.equal(response?.status(), 200, `${item}: page status`)
  if (dark) {
    await page.evaluate(() => document.documentElement.classList.add("dark"))
  }
  const root = `[data-slot="${item}"]`
  await page.waitForSelector(root, { timeout: 60_000 })
  await page.$eval(root, (element) =>
    element.scrollIntoView({ block: "center" })
  )
  // The draw-in runs once the chart is on screen; let it finish.
  await new Promise((resolve) => setTimeout(resolve, 1600))
  return { page, root }
}

async function runAxe(page, root) {
  await page.evaluate(axeSource)
  const { violations } = await page.evaluate(
    (selector) =>
      globalThis.axe.run(document.querySelector(selector), {
        resultTypes: ["violations"],
      }),
    root
  )
  return violations
    .filter((violation) => ["serious", "critical"].includes(violation.impact))
    .map((violation) => `${violation.id} (${violation.nodes[0]?.target})`)
}

async function check(item, { width, dark }) {
  const label = `${item} ${width}px ${dark ? "dark" : "light"}`
  let opened
  try {
    opened = await open(item, { width, dark })
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error))
    console.log(`✗ ${label}`)
    return
  }
  const { page, root } = opened
  try {
    const drawn = await page.$eval(
      root,
      (element) =>
        element.querySelectorAll("svg path, svg rect, svg circle").length
    )
    assert.ok(drawn > 0, `${label}: nothing drawn`)

    const overflow = await page.$eval(root, (element) => {
      const box = element.getBoundingClientRect()
      return {
        right: box.right,
        viewport: document.documentElement.clientWidth,
        scroll: element.scrollWidth - element.clientWidth,
      }
    })
    assert.ok(
      overflow.right <= overflow.viewport + 1,
      `${label}: wider than the viewport (${overflow.right} > ${overflow.viewport})`
    )

    const violations = await runAxe(page, root)
    assert.deepEqual(violations, [], `${label}: axe`)

    const inspector = `${root} [data-slot="chart-inspector"]`
    if (await page.$(inspector)) {
      // Rings and grids have empty middles: try a few points until one
      // lands on a mark.
      const points = await page.$eval(inspector, (element) => {
        const rect = element.getBoundingClientRect()
        return [
          [0.5, 0.5],
          [0.5, 0.15],
          [0.3, 0.5],
          [0.7, 0.4],
          [0.2, 0.25],
          [0.85, 0.75],
        ].map(([x, y]) => ({
          x: rect.x + rect.width * x,
          y: rect.y + rect.height * y,
        }))
      })
      // The donut answers in its centre instead of a tooltip; its inspector
      // still names the slice under the pointer.
      const readout =
        item === "donut-chart"
          ? async () =>
              page.$eval(
                inspector,
                (element) => element.getAttribute("aria-valuetext") ?? ""
              )
          : async () =>
              Boolean(await page.$(`${root} [data-slot="chart-tooltip"]`))
      const resting = await readout()
      let hasAnswered = false
      for (const point of points) {
        await page.mouse.move(point.x, point.y)
        await new Promise((resolve) => setTimeout(resolve, 150))
        const current = await readout()
        if (current !== resting && current !== false) {
          hasAnswered = true
          break
        }
      }
      assert.ok(hasAnswered, `${label}: nothing answers the pointer`)
      await page.mouse.move(0, 0)

      await page.focus(inspector)
      await page.keyboard.press("ArrowRight")
      const valueText = await page.$eval(inspector, (element) =>
        element.getAttribute("aria-valuetext")
      )
      assert.ok(valueText, `${label}: no value text after ArrowRight`)
      await page.keyboard.press("Escape")
    }

    if (!dark && width < 600) {
      await page.screenshot({
        path: new URL(`${item}-${base}-phone.png`, shots).pathname,
        clip: await page.$eval(root, (element) => {
          const rect = element.getBoundingClientRect()
          return {
            x: Math.max(0, rect.x - 8),
            y: Math.max(0, rect.y - 8),
            width: rect.width + 16,
            height: rect.height + 16,
          }
        }),
      })
    }

    const legend = `${root} [data-slot="chart-legend-item"]`
    if (!dark && (await page.$$(legend)).length > 1) {
      await page.click(legend)
      const pressed = await page.$eval(legend, (element) =>
        element.getAttribute("aria-pressed")
      )
      assert.equal(pressed, "false", `${label}: legend didn't hide a series`)
    }
    console.log(`✓ ${label}`)
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error))
    console.log(`✗ ${label}`)
  } finally {
    await page.close()
  }
}

for (const item of items) {
  for (const width of [1280, 390]) {
    for (const dark of [false, true]) {
      await check(item, { width, dark })
    }
  }
}

await browser.close()
if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}
