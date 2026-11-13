// Rating in a real browser, on every base: hover previews without setting,
// a click on a star's left half sets half a star, a drag scrubs, the keys
// step and jump, and a read-only rating takes no input.
//
// Run with the dev server up: node registry/fabricator/__tests__/rating.browser.mjs
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

const SLIDER = '[data-slot="rating"][role="slider"]'
const STAR = '[data-slot="rating-star"]'

const valueNow = (page) =>
  page.$eval(SLIDER, (slider) => slider.getAttribute("aria-valuenow"))
const states = (page) =>
  page.$$eval(STAR, (stars) =>
    stars.map((star) => star.getAttribute("data-state"))
  )
const starBoxes = (page) =>
  page.$$eval(STAR, (stars) =>
    stars.map((star) => {
      const box = star.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    })
  )
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

try {
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewport({ width: 900, height: 700 })

  for (const base of ["base", "radix", "aria"]) {
    await page.goto(`${baseUrl}/examples/${base}/rating-controlled`, {
      waitUntil: "networkidle2",
    })
    await page.waitForSelector(STAR)
    assert.equal(await valueNow(page), "2.5", `${base}: starts at 2.5`)
    const boxes = await starBoxes(page)
    const at = (index, share) => ({
      x: boxes[index].x + boxes[index].width * share,
      y: boxes[index].y + boxes[index].height / 2,
    })

    // Hover previews the score under the pointer without setting it.
    const fifth = at(4, 0.8)
    await page.mouse.move(fifth.x, fifth.y, { steps: 3 })
    await pause(50)
    assert.deepEqual(
      await states(page),
      ["full", "full", "full", "full", "full"],
      `${base}: hover previews five`
    )
    assert.equal(await valueNow(page), "2.5", `${base}: hover keeps the value`)

    // Leaving drops the preview.
    await page.mouse.move(fifth.x, fifth.y + 200)
    await pause(50)
    assert.deepEqual(
      await states(page),
      ["full", "full", "half", "empty", "empty"],
      `${base}: leaving shows the value again`
    )

    // A click on the fourth star's left half sets 3.5.
    const fourthLeft = at(3, 0.25)
    await page.mouse.click(fourthLeft.x, fourthLeft.y)
    assert.equal(await valueNow(page), "3.5", `${base}: left half sets a half`)
    assert.equal(
      await page.$eval("span.tabular-nums", (text) => text.textContent),
      "3.5 / 5",
      `${base}: onValueChange reached the app`
    )

    // A drag scrubs down to the first star.
    const firstRight = at(0, 0.9)
    await page.mouse.down()
    await page.mouse.move(firstRight.x, firstRight.y, { steps: 6 })
    assert.equal(await valueNow(page), "1", `${base}: a drag scrubs`)
    await page.mouse.up()

    // Keys step by half a star, jump with Page Up, Home and End, and take a
    // digit.
    await page.keyboard.press("ArrowRight")
    assert.equal(await valueNow(page), "1.5", `${base}: arrow steps`)
    await page.keyboard.press("PageUp")
    assert.equal(await valueNow(page), "2.5", `${base}: Page Up adds a star`)
    await page.keyboard.press("End")
    assert.equal(await valueNow(page), "5", `${base}: End fills every star`)
    await page.keyboard.press("Home")
    assert.equal(await valueNow(page), "0", `${base}: Home clears`)
    await page.keyboard.press("4")
    assert.equal(await valueNow(page), "4", `${base}: a digit sets it`)

    // Read-only takes no focus and no clicks.
    await page.goto(`${baseUrl}/examples/${base}/rating-read-only`, {
      waitUntil: "networkidle2",
    })
    const readOnly = await page.waitForSelector('[data-slot="rating"]')
    assert.equal(
      await readOnly.evaluate((element) => element.getAttribute("role")),
      "img",
      `${base}: read-only is an image`
    )
    assert.deepEqual(
      await states(page),
      ["full", "full", "full", "full", "partial"],
      `${base}: read-only keeps the fraction`
    )
    await readOnly.click()
    assert.deepEqual(
      await states(page),
      ["full", "full", "full", "full", "partial"],
      `${base}: read-only ignores a click`
    )
    console.log(`✓ ${base}`)
  }

  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
