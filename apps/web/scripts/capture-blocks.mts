/**
 * Capture the pictures on /blocks: each screen block's first fold, light and
 * dark, at 1280 by 720 and twice the resolution.
 *
 * Usage (with the dev server running on :4000):
 *   bun run blocks:capture                 # every block
 *   bun run blocks:capture finance-01      # only the named ones
 *
 * Writes public/blocks/<name>-<theme>.webp, each under 90KB, which the site
 * ships: commit them with the block they show. Uses your installed Chrome
 * through puppeteer-core. Set CHROME_PATH to use another Chromium-based browser.
 */
import { existsSync } from "fs"
import fs from "fs/promises"
import path from "path"
import puppeteer, { type Page } from "puppeteer-core"

import { SITE_BLOCK_STYLE } from "../lib/site-style"
import { fabricatorBlocks } from "../registry/fabricator/blocks"

const OUTPUT_DIR = path.resolve(import.meta.dirname, "../public/blocks")
const BASE_URL = process.env.CAPTURE_URL ?? "http://localhost:4000"
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].flatMap((candidate) => (candidate ? [candidate] : []))

const THEMES = ["light", "dark"] as const
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 }
const MAX_BYTES = 90 * 1024
const QUALITIES = [88, 82, 76, 70, 64, 58, 52, 46, 40, 34, 28]
// The dev server may have the block to compile first.
const NAVIGATION_TIMEOUT_MS = 120_000
const SETTLE_INTERVAL_MS = 500
const MAX_SETTLE_CHECKS = 20

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

class CaptureError extends Error {
  override name = "CaptureError"
}

function getBlockNames() {
  const names = fabricatorBlocks.map(({ name }) => name)
  const requested = process.argv.slice(2)
  const unknown = requested.filter((name) => !names.includes(name))
  if (unknown.length > 0) {
    throw new CaptureError(`Unknown blocks: ${unknown.join(", ")}`)
  }
  return requested.length > 0 ? requested : names
}

/** Fonts and the pictures in view have loaded. */
async function waitForAssets(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const visible = [...document.images].filter((image) => {
      const { top, bottom, left, right } = image.getBoundingClientRect()
      return bottom > 0 && top < innerHeight && right > 0 && left < innerWidth
    })
    // A picture that fails to decode is the block's to fix, not a reason to
    // stop: the capture shows it.
    await Promise.allSettled(visible.map((image) => image.decode()))
  })
}

/**
 * Two pictures in a row are the same: charts have drawn in, entrances are over
 * and data has loaded, whatever drives them. An endless loop stops the wait.
 */
async function waitUntilStill(page: Page) {
  let previous = ""
  for (let check = 0; check < MAX_SETTLE_CHECKS; check++) {
    await wait(SETTLE_INTERVAL_MS)
    const current = await page.screenshot({ encoding: "base64" })
    if (current === previous) return true
    previous = current
  }
  return false
}

/** The best quality that stays under the size limit. */
async function takeScreenshot(page: Page) {
  for (const quality of QUALITIES) {
    const picture = await page.screenshot({ type: "webp", quality })
    if (picture.byteLength <= MAX_BYTES) return { picture, quality }
  }
  throw new CaptureError(`Screenshot exceeds ${MAX_BYTES / 1024}KB`)
}

async function captureBlock(page: Page, name: string) {
  for (const theme of THEMES) {
    const { identifier } = await page.evaluateOnNewDocument((current) => {
      localStorage.setItem("theme", current)
    }, theme)
    const response = await page.goto(
      `${BASE_URL}/view/${SITE_BLOCK_STYLE}/${name}`,
      { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS }
    )
    await page.removeScriptToEvaluateOnNewDocument(identifier)
    if (!response?.ok()) {
      throw new CaptureError(`${name} returned ${response?.status()}`)
    }
    await page.waitForSelector(
      "html[data-preview-ready] [data-slot='view-preview'] h1",
      {
        timeout: NAVIGATION_TIMEOUT_MS,
      }
    )
    // Development chrome, and a caret that would blink.
    await page.addStyleTag({
      content:
        "[data-tailwind-indicator], nextjs-portal { display: none !important } * { caret-color: transparent !important }",
    })
    await waitForAssets(page)
    const isStill = await waitUntilStill(page)

    const { picture, quality } = await takeScreenshot(page)
    const file = path.join(OUTPUT_DIR, `${name}-${theme}.webp`)
    await fs.writeFile(file, picture)
    const size = `${Math.round(picture.byteLength / 1024)}KB`
    console.log(
      `- ${name} (${theme}): ${size} at quality ${quality}` +
        (isStill ? "" : ", still moving")
    )
  }
}

async function captureBlocks() {
  const executablePath = CHROME_PATHS.find((candidate) => existsSync(candidate))
  if (!executablePath) {
    throw new CaptureError(
      "Chrome not found. Set CHROME_PATH to a Chromium-based browser."
    )
  }

  const names = getBlockNames()
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    // At this resolution a screen of many layers outgrows Chrome's default
    // memory budget, and the layers past it come out blank.
    args: ["--force-gpu-mem-available-mb=4096"],
    defaultViewport: VIEWPORT,
  })
  const failures: string[] = []
  try {
    for (const name of names) {
      const page = await browser.newPage()
      // Charts draw at once and loops rest.
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ])
      try {
        await captureBlock(page, name)
      } catch (error) {
        failures.push(name)
        console.error(`- ${name}:`, error)
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
  if (failures.length > 0) {
    throw new CaptureError(`Not captured: ${failures.join(", ")}`)
  }
}

try {
  await captureBlocks()
} catch (error) {
  console.error(error)
  process.exit(1)
}
