// Preview Rail in a real browser, on every base: the card opens in place and
// glides between ticks, Escape hides it, focus shows it, a finger scrubs and
// lifting follows the lit tick, reduced motion snaps, and the controlled,
// horizontal examples behave.
//
// Run with the dev server up: node registry/fabricator/__tests__/preview-rail.browser.mjs
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
const browser = await puppeteer.launch({ executablePath, headless: true })

const ITEM = '[data-slot="preview-rail-item"]'
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const tickCenters = (page) =>
  page.$$eval(ITEM, (items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })
  )

const cardState = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('[data-slot="preview-rail-card"]')
    const layer = document.querySelector('[data-slot="preview-rail-preview"]')
    if (!card || !layer) return null
    const rect = card.getBoundingClientRect()
    return {
      isOpen: card.hasAttribute("data-open"),
      title: card.textContent ?? "",
      centerY: rect.y + rect.height / 2,
      centerX: rect.x + rect.width / 2,
      top: rect.top,
      bottom: rect.bottom,
    }
  })

const litLabel = (page) =>
  page.$eval(`${ITEM}[data-lit]`, (item) => item.getAttribute("aria-label"))
const currentLabel = (page) =>
  page.$eval(`${ITEM}[aria-current]`, (item) => item.getAttribute("aria-label"))

try {
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewport({ width: 900, height: 700 })

  for (const base of ["base", "radix", "aria"]) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "no-preference" },
    ])
    await page.goto(
      `${baseUrl}/examples/${base}-fabricator/preview-rail-demo`,
      {
        waitUntil: "networkidle0",
      }
    )
    await page.waitForSelector(ITEM)
    const ticks = await tickCenters(page)

    // At rest the swell sits on the current item and no card shows.
    assert.equal(await litLabel(page), "Components", `${base}: rest`)
    assert.equal(await currentLabel(page), "Components", `${base}: current`)
    assert.equal(await cardState(page), null, `${base}: no card at rest`)

    // The card opens in place beside the hovered tick.
    await page.mouse.move(ticks[2].x, ticks[2].y)
    await pause(30)
    let card = await cardState(page)
    assert.ok(card?.isOpen, `${base}: card opens on hover`)
    assert.match(card.title, /Theming/, `${base}: card names the tick`)
    assert.ok(
      Math.abs(card.centerY - ticks[2].y) < 2,
      `${base}: card opens at its tick, not gliding (${card.centerY} vs ${ticks[2].y})`
    )
    assert.equal(await litLabel(page), "Theming", `${base}: hovered tick lit`)

    // Moving on glides the card: partway there soon after, on the tick later.
    await page.mouse.move(ticks[6].x, ticks[6].y)
    await pause(120)
    card = await cardState(page)
    assert.match(card.title, /Icons/, `${base}: card follows the pointer`)
    assert.ok(
      card.centerY > ticks[2].y + 2 && card.centerY < ticks[6].y - 2,
      `${base}: card glides (${card.centerY} between ${ticks[2].y} and ${ticks[6].y})`
    )
    await pause(600)
    card = await cardState(page)
    assert.ok(
      Math.abs(card.centerY - ticks[6].y) < 2,
      `${base}: card settles on its tick`
    )

    // Escape hides the card; leaving the rail closes it too.
    await page.keyboard.press("Escape")
    await pause(30)
    assert.equal((await cardState(page)).isOpen, false, `${base}: Escape hides`)
    await page.mouse.move(ticks[7].x, ticks[7].y)
    await pause(30)
    assert.ok((await cardState(page)).isOpen, `${base}: next tick reopens`)
    await page.mouse.move(600, 650)
    await pause(30)
    assert.equal((await cardState(page)).isOpen, false, `${base}: leave closes`)
    assert.equal(await litLabel(page), "Components", `${base}: swell returns`)

    // Focus from the keyboard shows the card.
    await page.$eval(ITEM, (item) => item.blur())
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await pause(30)
    const focused = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label")
    )
    card = await cardState(page)
    assert.ok(card?.isOpen, `${base}: focus shows the card`)
    assert.ok(card.title.includes(focused), `${base}: card names ${focused}`)
    await page.keyboard.press("Enter")
    await pause(30)
    assert.equal(
      new URL(page.url()).hash,
      `#${focused.toLowerCase().replace(" ", "-")}`,
      `${base}: Enter follows the link`
    )
    assert.equal(await currentLabel(page), focused, `${base}: Enter selects`)

    // A finger scrubs: press on one tick, drag to another, lift there.
    await page.mouse.move(600, 650)
    await page.$eval(ITEM, (item) => item.blur())
    await page.touchscreen.touchStart(ticks[1].x, ticks[1].y)
    await pause(30)
    assert.equal(await litLabel(page), "Installation", `${base}: press lights`)
    assert.ok((await cardState(page)).isOpen, `${base}: press shows the card`)
    await page.touchscreen.touchMove(ticks[4].x, ticks[4].y)
    await pause(30)
    assert.equal(await litLabel(page), "Motion", `${base}: drag scrubs`)
    await page.touchscreen.touchEnd()
    await pause(60)
    assert.equal(new URL(page.url()).hash, "#motion", `${base}: lift follows`)
    assert.equal(await currentLabel(page), "Motion", `${base}: lift selects`)
    assert.equal((await cardState(page)).isOpen, false, `${base}: lift closes`)

    // A lift far from the rail does nothing.
    await page.touchscreen.touchStart(ticks[8].x, ticks[8].y)
    await page.touchscreen.touchMove(ticks[8].x + 300, ticks[8].y)
    await page.touchscreen.touchEnd()
    await pause(60)
    assert.equal(
      await currentLabel(page),
      "Motion",
      `${base}: far lift ignored`
    )

    // Reduced motion: the card jumps from tick to tick.
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ])
    await page.mouse.move(ticks[0].x, ticks[0].y)
    await pause(30)
    await page.mouse.move(ticks[7].x, ticks[7].y)
    await pause(30)
    card = await cardState(page)
    assert.ok(
      Math.abs(card.centerY - ticks[7].y) < 2,
      `${base}: reduced motion snaps`
    )

    // Near the ends the card stays within the rail.
    const list = await page.$eval('[data-slot="preview-rail-list"]', (el) =>
      el.getBoundingClientRect().toJSON()
    )
    await page.mouse.move(ticks[9].x, ticks[9].y)
    await pause(30)
    card = await cardState(page)
    assert.ok(
      Math.abs(card.bottom - list.bottom) < 1,
      `${base}: last card ends with the rail (${card.bottom} vs ${list.bottom})`
    )
    await page.mouse.move(ticks[0].x, ticks[0].y)
    await pause(30)
    card = await cardState(page)
    assert.ok(
      Math.abs(card.top - list.top) < 1,
      `${base}: first card starts with the rail (${card.top} vs ${list.top})`
    )
    await page.mouse.move(600, 650)

    // Controlled, card before the rail, a disabled item skipped.
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "no-preference" },
    ])
    await page.goto(
      `${baseUrl}/examples/${base}-fabricator/preview-rail-controlled`,
      { waitUntil: "networkidle0" }
    )
    await page.waitForSelector(ITEM)
    const folders = await tickCenters(page)
    await page.mouse.click(folders[2].x, folders[2].y)
    await pause(30)
    assert.match(
      await page.$eval("p", (p) => p.textContent),
      /Showing Drafts/,
      `${base}: controlled value follows a click`
    )
    card = await cardState(page)
    const rail = await page.$eval('[data-slot="preview-rail-list"]', (list) =>
      list.getBoundingClientRect().toJSON()
    )
    assert.ok(card.centerX < rail.x, `${base}: side="start" puts the card left`)
    await page.mouse.move(folders[5].x, folders[5].y)
    await pause(30)
    assert.notEqual(await litLabel(page), "Spam", `${base}: disabled skipped`)
    await page.mouse.click(folders[5].x, folders[5].y)
    await pause(30)
    assert.doesNotMatch(
      await page.$eval("p", (p) => p.textContent),
      /Spam/,
      `${base}: disabled not chosen`
    )
    await page.mouse.move(600, 650)
    await page.touchscreen.tap(folders[5].x, folders[5].y)
    await pause(60)
    assert.match(
      await page.$eval("p", (p) => p.textContent),
      /Showing Drafts/,
      `${base}: a tap on a disabled tick chooses nothing`
    )

    // Horizontal: the card sits above the rail, centred on the tick.
    await page.goto(
      `${baseUrl}/examples/${base}-fabricator/preview-rail-horizontal`,
      { waitUntil: "networkidle0" }
    )
    await page.waitForSelector(ITEM)
    const months = await tickCenters(page)
    await page.mouse.move(months[3].x, months[3].y)
    await pause(30)
    card = await cardState(page)
    assert.match(card.title, /April/, `${base}: horizontal card`)
    assert.ok(card.bottom < months[3].y, `${base}: horizontal card above`)
    const monthsRail = await page.$eval(
      '[data-slot="preview-rail-list"]',
      (el) => el.getBoundingClientRect().toJSON()
    )
    const cardBox = await page.$eval('[data-slot="preview-rail-card"]', (el) =>
      el.getBoundingClientRect().toJSON()
    )
    assert.ok(
      cardBox.left >= monthsRail.left - 1 &&
        cardBox.right <= monthsRail.right + 1 &&
        cardBox.left <= months[3].x &&
        cardBox.right >= months[3].x,
      `${base}: horizontal card over its tick, within the rail`
    )
    await page.mouse.move(months[6].x, months[6].y)
    await pause(400)
    card = await cardState(page)
    assert.ok(
      Math.abs(card.centerX - months[6].x) < 2,
      `${base}: a middle card centres on its tick`
    )
    console.log(`✓ ${base}`)
  }

  assert.deepEqual(errors, [], "no page errors")
  console.log("Preview Rail: all checks passed")
} finally {
  await browser.close()
}
