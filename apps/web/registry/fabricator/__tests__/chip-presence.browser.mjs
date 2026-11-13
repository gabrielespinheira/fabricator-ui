import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import puppeteer from "puppeteer-core"

const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate))
assert.ok(executablePath, "Set CHROME_PATH to an installed Chromium browser")
const browser = await puppeteer.launch({ executablePath, headless: true })
try {
  const page = await browser.newPage()
  for (const base of ["base", "radix", "aria"]) {
    await page.goto(
      `${process.env.CAPTURE_URL ?? "http://localhost:4000"}/examples/${base}-fabricator/multi-select-demo`,
      { waitUntil: "networkidle2" }
    )
    await page.addStyleTag({
      content: "[data-chip-key] { transition: opacity 1s !important; }",
    })
    await page.click('[aria-label="Remove Design"]')
    await page.click('[aria-label="Remove Engineering"]')
    await page.waitForFunction(
      () => document.querySelectorAll("[data-chip-key]").length === 0,
      { timeout: 3000 }
    )
    assert.equal(await page.$("[data-exiting]"), null, base)
    console.log(`✓ ${base}: overlapping chip exits finish`)
  }
} finally {
  await browser.close()
}
