// Multi Select in a real browser, on every base: picking keeps the list open,
// chips leave in place then the rest glide over, the keyboard picks and
// removes, and reduced motion drops chips at once.
//
// Run with the dev server up: node registry/fabricator/__tests__/multi-select.browser.mjs
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

const CHIP = '[data-slot="multi-select-chip"]'
const OPTION = '[role="option"]'

const chipState = (page) =>
  page.$$eval(CHIP, (chips) =>
    chips.map((chip) => ({
      text: chip.textContent?.trim() ?? "",
      isExiting: chip.hasAttribute("data-exiting"),
      translate: getComputedStyle(chip).translate,
    }))
  )
const isOpen = (page) =>
  page.$$eval(OPTION, (options) => options.some((o) => o.offsetParent !== null))
const labels = async (page) =>
  (await chipState(page)).filter((c) => !c.isExiting).map((c) => c.text)
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
      `${baseUrl}/examples/${base}-fabricator/multi-select-demo`,
      { waitUntil: "networkidle2" }
    )
    await page.waitForFunction(
      (selector) => document.querySelectorAll(selector).length === 2,
      {},
      CHIP
    )
    assert.deepEqual(await labels(page), ["Design", "Engineering"], base)

    // A press on the field opens the list and focuses the search.
    await page.click('[data-slot="multi-select-icon"]')
    await page.waitForSelector(OPTION, { visible: true })
    assert.equal(
      await page.evaluate(
        () => document.activeElement?.getAttribute("data-slot") ?? ""
      ),
      "multi-select-input",
      `${base}: field press focuses the search`
    )

    // Hovering lights one shared highlight under the row; holding the row
    // fills it and presses it in. Releasing picks it and keeps the list open.
    const product = await page.waitForSelector(`${OPTION}::-p-text(Product)`)
    const box = await product.boundingBox()
    await page.mouse.move(box.x + 40, box.y + box.height / 2, { steps: 4 })
    const highlight = () =>
      page.$eval(
        '[data-slot="multi-select-list"] > [data-slot="fluid-hover-highlight"]',
        (element) => {
          const style = getComputedStyle(element)
          return {
            opacity: style.opacity,
            scale: style.scale,
            background: style.backgroundColor,
            top: Math.round(element.getBoundingClientRect().top),
          }
        }
      )
    await pause(400)
    const hovered = await highlight()
    assert.equal(hovered.opacity, "1", `${base}: the highlight shows on hover`)
    const row = await product.boundingBox()
    assert.equal(hovered.top, Math.round(row.y), `${base}: it sits on the row`)
    await page.mouse.down()
    await pause(400)
    const pressed = await highlight()
    assert.notEqual(pressed.scale, "none", `${base}: a press scales it`)
    assert.notEqual(
      pressed.background,
      hovered.background,
      `${base}: a press fills it`
    )
    await page.mouse.up()
    await pause(50)
    assert.equal(await isOpen(page), true, `${base}: list stays open`)
    assert.deepEqual(
      await labels(page),
      ["Design", "Engineering", "Product"],
      base
    )

    // Typing filters; Enter picks the highlighted option and clears the search.
    await page.keyboard.type("mark")
    await page.waitForFunction(
      (selector) =>
        [...document.querySelectorAll(selector)].filter(
          (o) => o.offsetParent !== null
        ).length === 1,
      {},
      OPTION
    )
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Enter")
    await page.waitForFunction(
      (selector) =>
        [...document.querySelectorAll(selector)].some((c) =>
          c.textContent?.includes("Marketing")
        ),
      {},
      CHIP
    )
    assert.equal(
      await page.$eval('[data-slot="multi-select-input"]', (i) => i.value),
      "",
      `${base}: picking clears the search`
    )

    // Escape closes.
    await page.keyboard.press("Escape")
    await page.waitForFunction(
      (selector) =>
        ![...document.querySelectorAll(selector)].some(
          (o) => o.offsetParent !== null
        ),
      {},
      OPTION
    )

    // Removing a chip keeps it in place while it wipes out; then the chips
    // after it glide over.
    await page.evaluate(() => {
      document.documentElement.dataset.motion = "smooth"
    })
    await page.click('[aria-label="Remove Engineering"]')
    await pause(16)
    const leaving = await chipState(page)
    assert.deepEqual(
      leaving.map((c) => (c.isExiting ? `-${c.text}` : c.text)),
      ["Design", "-Engineering", "Product", "Marketing"],
      `${base}: the removed chip leaves in place`
    )
    await page.waitForFunction(
      (selector) =>
        [...document.querySelectorAll(selector)].some(
          (c) => getComputedStyle(c).translate !== "none"
        ),
      { timeout: 2000 },
      CHIP
    )
    await page.waitForFunction(
      (selector) =>
        [...document.querySelectorAll(selector)].every(
          (c) =>
            !c.hasAttribute("data-exiting") &&
            getComputedStyle(c).translate === "none"
        ),
      { timeout: 3000 },
      CHIP
    )
    assert.deepEqual(
      await labels(page),
      ["Design", "Product", "Marketing"],
      base
    )

    // Backspace in an empty search removes the last chip.
    await page.focus('[data-slot="multi-select-input"]')
    await page.keyboard.press("Backspace")
    await page.waitForFunction(
      (selector) =>
        ![...document.querySelectorAll(selector)].some(
          (c) =>
            c.textContent?.includes("Marketing") &&
            !c.hasAttribute("data-exiting")
        ),
      {},
      CHIP
    )

    await page.waitForFunction(
      (selector) =>
        ![...document.querySelectorAll(selector)].some((c) =>
          c.hasAttribute("data-exiting")
        ),
      {},
      CHIP
    )

    // Reduced motion: a removed chip goes at once.
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ])
    await page.click('[aria-label="Remove Design"]')
    await pause(50)
    assert.deepEqual(
      (await chipState(page)).map((c) => c.text),
      ["Product"],
      `${base}: reduced motion removes at once`
    )
    console.log(`✓ ${base}`)
  }

  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
