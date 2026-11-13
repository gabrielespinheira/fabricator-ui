// Run with the dev server up: node registry/fabricator/__tests__/data-table.browser.mjs
// Checks the 10,000-row demo, which reads from a loader: the first window,
// infinite scroll, virtual rows, sorting, search, scrolling, a header filter,
// the settings, editing and Shift-click selection, and prints the timings. Timings
// come from a development build on the docs site, whose stylesheet makes
// every inserted row restyle the page (see docs/plans/data-table.md), so they
// are reported, not asserted.
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import puppeteer from "puppeteer-core"

const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate))
if (!executablePath)
  throw new Error("Set CHROME_PATH to an installed Chromium browser.")
const baseUrl = process.env.CAPTURE_URL ?? "http://localhost:4000"
const base = process.env.DATA_TABLE_BASE ?? "base"
const browser = await puppeteer.launch({ executablePath, headless: true })

const VIEWPORT = '[data-slot="data-table-viewport"]'
const ROW = '[data-slot="data-table-row"]'
const TABLE = '[data-slot="data-table-table"]'

/** Waits until the loader has answered: rows drawn and nothing in flight. */
async function loaded(page) {
  await page.waitForFunction(
    (table, row) =>
      document.querySelector(table)?.getAttribute("aria-busy") === "false" &&
      document.querySelectorAll(row).length > 0,
    { timeout: 10_000 },
    TABLE,
    ROW
  )
  await settle(page)
}

function lastRowIndex(page) {
  return page.$$eval(ROW, (rows) =>
    Math.max(...rows.map((row) => Number(row.getAttribute("aria-rowindex"))))
  )
}

async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
}

/** Milliseconds from an action until the next two frames have painted. */
async function time(page, action) {
  const start = await page.evaluate(() => performance.now())
  await action()
  await settle(page)
  return (await page.evaluate(() => performance.now())) - start
}

function firstCells(page, slot = "data-table-cell") {
  return page.$$eval(
    `${ROW}`,
    (rows, slot) =>
      rows
        .slice(0, 5)
        .map((row) =>
          [...row.querySelectorAll(`[data-slot="${slot}"]`)].map((cell) =>
            cell.textContent?.trim()
          )
        ),
    slot
  )
}

try {
  const page = await browser.newPage()
  // Analytics' session recorder observes every DOM change; keep it out of
  // the timings.
  await page.setRequestInterception(true)
  page.on("request", (request) =>
    /posthog|us-assets|vercel-insights|va\.vercel/.test(request.url())
      ? request.abort()
      : request.continue()
  )
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(`${baseUrl}/examples/${base}-fabricator/data-table-demo`, {
    waitUntil: "networkidle0",
  })
  await loaded(page)

  // Virtual rows: 10,000 in the table, a screenful in the DOM.
  const rowCount = await page.$eval(TABLE, (table) =>
    Number(table.getAttribute("aria-rowcount"))
  )
  const rendered = await page.$$eval(ROW, (rows) => rows.length)
  assert.equal(rowCount, 10_001, "aria-rowcount covers every row and the head")
  assert.ok(rendered < 60, `only visible rows are drawn (${rendered})`)

  // Windows: the scroll covers every match, a jump deep into it shows
  // skeleton rows at once, and the rows for that place arrive without the
  // windows before it.
  const scrollHeight = await page.$eval(VIEWPORT, (viewport) => {
    viewport.scrollTop = 200_000
    return viewport.scrollHeight
  })
  assert.ok(
    scrollHeight > 400_000,
    `the scroll covers 10,000 rows (${scrollHeight})`
  )
  await page.waitForSelector('[data-slot="data-table-skeleton-row"]')
  await page.waitForFunction(
    (row) =>
      [...document.querySelectorAll(row)].some(
        (element) => Number(element.getAttribute("aria-rowindex")) > 4_000
      ),
    { timeout: 10_000 },
    ROW
  )
  assert.ok((await lastRowIndex(page)) > 4_000, "the window in view arrived")
  // A fling draws skeletons ahead of itself, never an empty viewport.
  const fling = await page.$eval(VIEWPORT, (viewport) => {
    const box = viewport.getBoundingClientRect()
    return new Promise((resolve) => {
      let frames = 0
      let empty = 0
      const step = () => {
        viewport.scrollTop += 900
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2
        )
        if (!hit?.closest("tr[data-slot]")) empty++
        if (++frames < 40) requestAnimationFrame(step)
        else resolve({ frames, empty })
      }
      requestAnimationFrame(step)
    })
  })
  assert.ok(
    fling.empty <= 5,
    `a fling stays covered (${fling.empty} empty frames)`
  )
  await page.$eval(VIEWPORT, (viewport) => (viewport.scrollTop = 0))

  // Sorting 10,000 rows by name.
  const sortButton = await page.$(
    'th[data-slot="data-table-head"] [data-slot="data-table-sort"]'
  )
  assert.ok(sortButton, "the first data column sorts")
  const sortTime = await time(page, async () => {
    await sortButton.click()
    await page.waitForSelector(`${TABLE}[aria-busy="true"]`)
    await loaded(page)
  })
  const sortOrder = await page.$eval(
    'th[data-slot="data-table-head"][aria-sort="ascending"]',
    (head) => head.textContent?.trim()
  )
  assert.match(sortOrder ?? "", /Company/)
  const names = (await firstCells(page)).map((cells) => cells[1])
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b))
  )

  // Resizing from a head's edge: the table keeps the resize cursor and a
  // guide follows the edge until the pointer lets go.
  const handle = await page.$(
    'th[data-slot="data-table-head"]:not([data-kind]) [data-slot="data-table-resize"]'
  )
  const handleBox = await handle.boundingBox()
  const startWidth = await handle.evaluate(
    (element) => element.closest("th").getBoundingClientRect().width
  )
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(handleBox.x + 80, handleBox.y + 300, { steps: 8 })
  await settle(page)
  const during = await page.evaluate(() => {
    const root = document.querySelector('[data-slot="data-table-content"]')
    const guide = document.querySelector(
      '[data-slot="data-table-resize-guide"]'
    )
    const box = root.getBoundingClientRect()
    const under = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + 200
    )
    return {
      resizing: root.hasAttribute("data-resizing"),
      guide: Boolean(guide),
      cursor: under ? getComputedStyle(under).cursor : "",
    }
  })
  await page.mouse.up()
  await settle(page)
  assert.deepEqual(during, {
    resizing: true,
    guide: true,
    cursor: "col-resize",
  })
  const after = await page.evaluate(() => ({
    guide: Boolean(
      document.querySelector('[data-slot="data-table-resize-guide"]')
    ),
    cursor: document.documentElement.style.cursor,
  }))
  assert.deepEqual(after, { guide: false, cursor: "" })
  const endWidth = await handle.evaluate(
    (element) => element.closest("th").getBoundingClientRect().width
  )
  assert.ok(endWidth > startWidth + 40, `the column widened (${endWidth})`)

  // The table's own scrollbars: the vertical track starts under the header
  // and ends above the footer; dragging its thumb and a wheel over it scroll
  // the rows.
  await page.$eval(VIEWPORT, (viewport) => (viewport.scrollTop = 0))
  await page.mouse.move(600, 300)
  const bars = await page.evaluate(() => {
    const track = document.querySelector(
      '[data-slot="data-table-scrollbar"][data-orientation="vertical"]'
    )
    const head = document.querySelector('th[data-slot="data-table-head"]')
    const foot = document.querySelector('[data-slot="data-table-footer-cell"]')
    return {
      hidden: track.hasAttribute("data-hidden"),
      top: Math.round(track.getBoundingClientRect().top),
      bottom: Math.round(track.getBoundingClientRect().bottom),
      headBottom: Math.round(head.getBoundingClientRect().bottom),
      footTop: Math.round(foot.getBoundingClientRect().top),
    }
  })
  assert.equal(bars.hidden, false, "the vertical scrollbar shows")
  assert.ok(
    Math.abs(bars.top - bars.headBottom) <= 1,
    `the track starts under the header (${bars.top} vs ${bars.headBottom})`
  )
  assert.ok(
    Math.abs(bars.bottom - bars.footTop) <= 1,
    `the track ends above the footer (${bars.bottom} vs ${bars.footTop})`
  )
  const thumb = await page.$(
    '[data-slot="data-table-scrollbar"][data-orientation="vertical"] [data-slot="data-table-scrollbar-thumb"]'
  )
  const thumbBox = await thumb.boundingBox()
  await page.mouse.move(
    thumbBox.x + thumbBox.width / 2,
    thumbBox.y + thumbBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    thumbBox.x + thumbBox.width / 2,
    thumbBox.y + thumbBox.height / 2 + 100,
    { steps: 5 }
  )
  await page.mouse.up()
  const dragged = await page.$eval(VIEWPORT, (viewport) => viewport.scrollTop)
  assert.ok(dragged > 200, `dragging the thumb scrolls (${dragged})`)
  const draggedBox = await thumb.boundingBox()
  await page.mouse.move(
    draggedBox.x + draggedBox.width / 2,
    draggedBox.y + draggedBox.height / 2
  )
  await page.mouse.wheel({ deltaY: 300 })
  await page.waitForFunction(
    (viewport, before) =>
      document.querySelector(viewport).scrollTop > before + 100,
    {},
    VIEWPORT,
    dragged
  )
  await page.$eval(VIEWPORT, (viewport) => (viewport.scrollTop = 0))
  await loaded(page)

  // Pinned edges: a hairline and a fade show only while rows scroll under
  // the pinned columns.
  const edges = async () =>
    page.$eval('[data-slot="data-table-scroll-layer"]', (layer) => ({
      start: layer.hasAttribute("data-overflow-start"),
      end: layer.hasAttribute("data-overflow-end"),
    }))
  await page.$eval(VIEWPORT, (viewport) => (viewport.scrollLeft = 0))
  await settle(page)
  assert.deepEqual(await edges(), { start: false, end: true })
  await page.$eval(VIEWPORT, (viewport) => {
    viewport.scrollLeft = viewport.scrollWidth
  })
  await settle(page)
  assert.deepEqual(await edges(), { start: true, end: false })
  await page.$eval(VIEWPORT, (viewport) => (viewport.scrollLeft = 0))

  // Searching.
  const searchTime = await time(page, async () => {
    await page.type('[data-slot="search-input"]', "orbit", { delay: 0 })
    await page.waitForFunction(
      (row) =>
        [...document.querySelectorAll(row)]
          .slice(0, 5)
          .every((element) => /orbit/i.test(element.textContent ?? "")),
      { timeout: 10_000 },
      ROW
    )
  })
  await page.click('[data-slot="search-input"]', { count: 3 })
  await page.keyboard.press("Backspace")
  await page.waitForFunction(
    (table) =>
      document.querySelector(table)?.getAttribute("aria-rowcount") === "10001",
    { timeout: 10_000 },
    TABLE
  )
  await loaded(page)

  // Scrolling: one second of steady scrolling through the rows.
  const frames = await page.$eval(VIEWPORT, (viewport) => {
    return new Promise((resolve) => {
      const durations = []
      let last = performance.now()
      const end = last + 1000
      const step = (now) => {
        durations.push(now - last)
        last = now
        viewport.scrollTop += 240
        if (now < end) requestAnimationFrame(step)
        else resolve(durations.slice(1))
      }
      requestAnimationFrame(step)
    })
  })
  const sorted = [...frames].sort((a, b) => a - b)
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  const longFrames = frames.filter((duration) => duration > 50).length
  const firstShown = await page.$eval(ROW, (row) =>
    Number(row.getAttribute("aria-rowindex"))
  )
  assert.ok(firstShown > 20, `the rows follow the scroll (${firstShown})`)

  // A status filter from the header popover.
  await page.$eval(VIEWPORT, (viewport) => (viewport.scrollTop = 0))
  const stageHead = await page.$$('th[data-slot="data-table-head"]')
  let stageTrigger
  for (const head of stageHead) {
    const text = await head.evaluate((element) => element.textContent)
    if (text?.includes("Stage")) {
      stageTrigger = await head.$('[data-slot="data-table-column-trigger"]')
    }
  }
  assert.ok(stageTrigger, "the Stage head has options")
  await stageTrigger.click()
  await page.waitForSelector('[data-slot="data-table-filter-option"]')
  const options = await page.$$('[data-slot="data-table-filter-option"]')
  let won
  for (const option of options) {
    const text = await option.evaluate((element) => element.textContent)
    if (text?.startsWith("Won")) won = option
  }
  assert.ok(won, "Won is one of the options")
  await won.click()
  await page.keyboard.press("Escape")
  await page.waitForFunction(
    (table) =>
      document.querySelector(table)?.getAttribute("aria-rowcount") !== "10001",
    { timeout: 10_000 },
    TABLE
  )
  await loaded(page)
  const stages = await page.$$eval(
    `${ROW} [data-slot="data-table-status"]`,
    (badges) => [...new Set(badges.map((badge) => badge.textContent?.trim()))]
  )
  assert.deepEqual(stages, ["Won"])
  const filtered = await page.$$eval(
    '[data-slot="data-table-column-trigger"][data-filtered]',
    (triggers) => triggers.map((trigger) => trigger.getAttribute("aria-label"))
  )
  assert.deepEqual(filtered, ["Stage options"])

  // The settings sit in the header: the footer switches off and on, and
  // the filters clear.
  await page.click('[data-slot="data-table-settings-trigger"]')
  const calculations = await page.waitForSelector(
    '[role="switch"][aria-label="Calculations"], label:has([role="switch"])'
  )
  assert.ok(calculations, "the settings have switches")
  await page.$$eval('[role="switch"]', (switches) => {
    const footer = switches.find((element) =>
      (
        element.getAttribute("aria-label") ??
        element.closest("label")?.textContent ??
        ""
      ).includes("Calculations")
    )
    footer?.click()
  })
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="data-table-footer"]')
  )
  await page.$$eval('[role="switch"]', (switches) => {
    const footer = switches.find((element) =>
      (
        element.getAttribute("aria-label") ??
        element.closest("label")?.textContent ??
        ""
      ).includes("Calculations")
    )
    footer?.click()
  })
  await page.waitForSelector('[data-slot="data-table-footer"]')
  const clear = await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Clear filters"
    )
  )
  await clear.asElement()?.click()
  await page.waitForFunction(
    (table) =>
      document.querySelector(table)?.getAttribute("aria-rowcount") === "10001",
    { timeout: 10_000 },
    TABLE
  )
  await page.keyboard.press("Escape")
  await loaded(page)

  // Editing: a text cell takes typing, a status cell picks from its options.
  const companyCell = await page.$(
    `${ROW} [data-type="text"] [data-slot="data-table-edit-trigger"]`
  )
  assert.ok(companyCell, "the company cell edits")
  await companyCell.click()
  await page.waitForSelector('[data-slot="data-table-edit-input"]')
  await page.keyboard.down(process.platform === "darwin" ? "Meta" : "Control")
  await page.keyboard.press("a")
  await page.keyboard.up(process.platform === "darwin" ? "Meta" : "Control")
  await page.keyboard.type("Renamed Account")
  await page.keyboard.press("Enter")
  await page.waitForFunction(
    (row) =>
      document
        .querySelector(`${row} [data-type="text"]`)
        ?.textContent?.includes("Renamed Account"),
    {},
    ROW
  )
  const stageCell = await page.$(
    `${ROW} [data-type="status"] [data-slot="data-table-edit-trigger"]`
  )
  await stageCell.click()
  await page.waitForSelector('[data-slot="data-table-picker-option"]')
  const target = await page.$$eval(
    '[data-slot="data-table-picker-option"]',
    (items) => {
      const item = items.find(
        (element) =>
          element.getAttribute("aria-pressed") !== "true" &&
          element.getAttribute("aria-selected") !== "true"
      )
      item?.click()
      return item?.textContent?.trim()
    }
  )
  await page.waitForFunction(
    (row, label) =>
      document
        .querySelector(`${row} [data-type="status"]`)
        ?.textContent?.includes(label),
    {},
    ROW,
    target
  )

  // Filter Won again for the selection checks below.
  await stageTrigger.click()
  await page.waitForSelector('[data-slot="data-table-filter-option"]')
  for (const option of await page.$$(
    '[data-slot="data-table-filter-option"]'
  )) {
    const text = await option.evaluate((element) => element.textContent)
    if (text?.startsWith("Won")) await option.click()
  }
  await page.keyboard.press("Escape")
  await page.waitForFunction(
    (table) =>
      document.querySelector(table)?.getAttribute("aria-rowcount") !== "10001",
    { timeout: 10_000 },
    TABLE
  )
  await loaded(page)

  // Shift-click selects a range and the selection bar counts it.
  const boxes = await page.$$(
    `${ROW} [data-kind="select"] [data-slot="checkbox"]`
  )
  await boxes[0].click()
  await page.keyboard.down("Shift")
  await boxes[4].click()
  await page.keyboard.up("Shift")
  await settle(page)
  const selectedRows = await page.$$eval(
    `${ROW}[data-state="selected"]`,
    (rows) => rows.length
  )
  assert.equal(selectedRows, 5)
  const bar = await page.$eval(
    '[data-slot="data-table-selection-bar"]',
    (element) => ({
      state: element.dataset.state,
      text: element.textContent ?? "",
    })
  )
  assert.equal(bar.state, "open")
  assert.match(bar.text, /5 selected/)

  console.log(
    JSON.stringify(
      {
        rendered,
        sortMs: Math.round(sortTime),
        searchMs: Math.round(searchTime),
        scrollFrames: frames.length,
        scrollP95Ms: Math.round(p95 * 10) / 10,
        longFrames,
      },
      null,
      2
    )
  )
  console.log("data-table: ok")
} finally {
  await browser.close()
}
