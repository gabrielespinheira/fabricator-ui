// Run with the dev server up: node registry/fabricator/__tests__/event-calendar.browser.mjs
// EVENT_CALENDAR_BASE=radix|aria checks the other trees.
//
// Checks the Event Calendar demo: axe on the calendar in light and dark at
// desktop and phone widths, opening an event, creating one by dragging,
// moving one with the keyboard, the view shortcuts, the 100,000-event
// loader demo's month navigation, and that its agenda draws only the days on
// screen. Timings come from a development build and are reported, not
// asserted.
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import puppeteer from "puppeteer-core"

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8")

const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate))
if (!executablePath)
  throw new Error("Set CHROME_PATH to an installed Chromium browser.")
const baseUrl = process.env.CAPTURE_URL ?? "http://localhost:4000"
const base = process.env.EVENT_CALENDAR_BASE ?? "base"
const browser = await puppeteer.launch({ executablePath, headless: true })

const ROOT = '[data-slot="event-calendar"]'
const CHIP = '[data-slot="event-calendar-event"]'
const results = { base, axe: {}, timings: {} }

async function open(name, { width, height, dark = false }) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/view/${base}-fabricator/${name}`, {
    waitUntil: "networkidle2",
    timeout: 180_000,
  })
  if (dark) {
    await page.evaluate(() => document.documentElement.classList.add("dark"))
  }
  await page.waitForSelector(CHIP, { timeout: 60_000 })
  return page
}

/** Serious and critical axe violations inside the calendar. */
async function runAxe(page) {
  await page.evaluate(axeSource)
  const { violations } = await page.evaluate(
    (root) =>
      globalThis.axe.run(document.querySelector(root), {
        resultTypes: ["violations"],
      }),
    ROOT
  )
  return violations
    .filter((violation) => ["serious", "critical"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      count: violation.nodes.length,
      sample: violation.nodes[0]?.target.join(" "),
    }))
}

/** The FullCalendar element around the chip with this title. */
async function eventHandle(page, title) {
  const handle = await page.evaluateHandle(
    (chipSelector, wanted) =>
      [...document.querySelectorAll(chipSelector)]
        .find((chip) => chip.textContent?.startsWith(wanted))
        ?.closest("[tabindex]"),
    CHIP,
    title
  )
  const element = handle.asElement()
  assert.ok(element, `No event titled ${title}`)
  return element
}

async function center(handle) {
  const box = await handle.boundingBox()
  assert.ok(box)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

// --- Axe, light and dark, desktop and phone ----------------------------------

for (const dark of [false, true]) {
  for (const [label, width, height] of [
    ["desktop", 1280, 800],
    ["phone", 390, 844],
  ]) {
    const page = await open("event-calendar-demo", { width, height, dark })
    const key = `${dark ? "dark" : "light"}-${label}`
    results.axe[key] = await runAxe(page)
    if (label === "phone") {
      const view = await page.$eval(ROOT, (root) => root.dataset.view)
      assert.equal(view, "days", "a phone opens on the N-day view")
    }
    await page.close()
  }
}

// --- Interactions ------------------------------------------------------------

const page = await open("event-calendar-demo", { width: 1280, height: 800 })

// Opening an event shows its details beside it.
const planning = await eventHandle(page, "Sprint planning")
await planning.click()
await page.waitForSelector('[data-slot="event-calendar-event-details"]')
await page.keyboard.press("Escape")
await page.waitForFunction(
  () => !document.querySelector('[data-slot="event-calendar-event-details"]')
)

// Dragging across empty time creates a draft with quick create.
// A continuous grid draws days either side of the ones in view; drag in
// the last one on screen.
const header = await page.$$('[data-slot="event-calendar-day-header-number"]')
const visible = []
for (const handle of header) {
  if (await handle.isIntersectingViewport({ threshold: 1 }))
    visible.push(handle)
}
const lastDay = await center(visible.at(-1))
const startY = lastDay.box.y + 330
await page.mouse.move(lastDay.x, startY)
await page.mouse.down()
await page.mouse.move(lastDay.x, startY + 30, { steps: 6 })
await page.mouse.move(lastDay.x, startY + 60, { steps: 6 })
await page.mouse.up()
await page.waitForSelector('[data-slot="event-calendar-event-form"]')
await page.keyboard.type("Created by the test")
await page.keyboard.press("Enter")
await page.waitForFunction(
  (chip) =>
    [...document.querySelectorAll(chip)].some((element) =>
      element.textContent?.startsWith("Created by the test")
    ),
  {},
  CHIP
)

// The keyboard picks up an event and moves it a day and half an hour.
const review = await eventHandle(page, "Design review")
const before = await center(review)
await review.focus()
await page.keyboard.press("Space")
await page.keyboard.press("ArrowRight")
await page.keyboard.press("ArrowDown")
await page.keyboard.press("ArrowDown")
await page.keyboard.press("Enter")
await page.waitForFunction(
  (chip, x) => {
    const moved = [...document.querySelectorAll(chip)].find((element) =>
      element.textContent?.startsWith("Design review")
    )
    return moved && moved.getBoundingClientRect().left > x
  },
  {},
  CHIP,
  before.box.x + before.box.width / 2
)
const focusedTitle = await page.evaluate(
  () => document.activeElement?.textContent ?? ""
)
assert.ok(
  focusedTitle.startsWith("Design review"),
  "the moved event keeps focus"
)

// View shortcuts, with focus inside the calendar.
for (const [key, view] of [
  ["m", "month"],
  ["a", "agenda"],
  ["w", "week"],
]) {
  const started = performance.now()
  await page.keyboard.press(key)
  await page
    .waitForFunction(
      (root, wanted) => document.querySelector(root)?.dataset.view === wanted,
      { timeout: 5_000 },
      ROOT,
      view
    )
    .catch(async (error) => {
      const state = await page.evaluate(
        (root) => ({
          view: document.querySelector(root)?.dataset.view,
          active: document.activeElement?.outerHTML.slice(0, 160),
          dialogs: document.querySelectorAll('[role="dialog"]').length,
        }),
        ROOT
      )
      throw new Error(`${key} did not open ${view}: ${JSON.stringify(state)}`, {
        cause: error,
      })
    })
  results.timings[`view ${view}`] = Math.round(performance.now() - started)
}

// Continuity: a sideways scroll moves the week by days and settles on one;
// Today lines the week up again.
const firstVisibleDay = () =>
  page.evaluate(() => {
    const engine = document.querySelector('[data-slot="event-calendar-engine"]')
    const edge = engine.getBoundingClientRect().left + 40
    const heads = [...engine.querySelectorAll('[role="columnheader"]')]
    const first = heads.find(
      (head) => head.getBoundingClientRect().left >= edge
    )
    return first?.querySelector("[aria-label]")?.getAttribute("aria-label")
  })
await page.click('[data-slot="event-calendar-today"]')
const weekStart = await firstVisibleDay()
await page.mouse.move(700, 450)
for (let step = 0; step < 20; step += 1) {
  await page.mouse.wheel({ deltaX: 18 })
}
// Settled: the scroll's offset is handed back to the grid's new start.
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-slot="event-calendar-engine"]')
      ?.style.getPropertyValue("--event-calendar-offset") === "0px",
  { timeout: 5_000 }
)
await new Promise((resolve) => setTimeout(resolve, 400))
const scrolledTo = await firstVisibleDay()
results.continuity = { from: weekStart, to: scrolledTo }
assert.notEqual(scrolledTo, weekStart, "a sideways scroll moves the days")
await page.click('[data-slot="event-calendar-today"]')
await page.waitForFunction(
  (start) => {
    const engine = document.querySelector('[data-slot="event-calendar-engine"]')
    const edge = engine.getBoundingClientRect().left + 40
    const first = [...engine.querySelectorAll('[role="columnheader"]')].find(
      (head) => head.getBoundingClientRect().left >= edge
    )
    return (
      first?.querySelector("[aria-label]")?.getAttribute("aria-label") === start
    )
  },
  { timeout: 5_000 },
  weekStart
)
await page.close()

// --- 100,000 events from a loader --------------------------------------------

const loader = await open("event-calendar-loader", { width: 1280, height: 800 })
await loader.focus(ROOT)
await loader.keyboard.press("m")
await loader.waitForSelector('[aria-label="Next month"]')
const title = () =>
  loader.$eval('[data-slot="event-calendar-title"]', (node) => node.textContent)
for (let step = 0; step < 4; step += 1) {
  const previous = await title()
  const started = performance.now()
  await loader.click('[aria-label="Next month"]')
  await loader.waitForFunction(
    (selector, before) =>
      document.querySelector(selector)?.textContent !== before &&
      !document.querySelector(
        '[data-slot="event-calendar-content"][data-loading]'
      ),
    { timeout: 30_000 },
    '[data-slot="event-calendar-title"]',
    previous
  )
  await loader.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  )
  results.timings[`next month ${step + 1}`] = Math.round(
    performance.now() - started
  )
}
results.monthEvents = await loader.$$eval(CHIP, (chips) => chips.length)

// The agenda draws the days on screen, not the month's 28 events a day.
await loader.focus(ROOT)
await loader.keyboard.press("a")
await loader.waitForSelector('[data-slot="event-calendar-agenda-day"]')
results.agendaDaysDrawn = await loader.$$eval(
  '[data-slot="event-calendar-agenda-day"]',
  (days) => days.length
)
assert.ok(
  results.agendaDaysDrawn < 10,
  `the agenda drew ${results.agendaDaysDrawn} days`
)
await loader.close()

await browser.close()
console.log(JSON.stringify(results, null, 2))
const violations = Object.values(results.axe).flat()
assert.deepEqual(violations, [], "axe found serious or critical violations")
