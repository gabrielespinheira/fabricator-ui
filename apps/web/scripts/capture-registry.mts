/**
 * Capture light and dark screenshots of every block for mobile previews
 * (ComponentPreview type="block" and the block viewer show an image on small
 * screens instead of the iframe).
 *
 * Usage (with the dev server running on :4000):
 *   bun run registry:capture            # only missing screenshots
 *   bun run registry:capture --force    # recapture everything
 *
 * Uses your installed Chrome through puppeteer-core. Set CHROME_PATH to use
 * another Chromium-based browser.
 */
import { existsSync } from "fs"
import fs from "fs/promises"
import path from "path"
import puppeteer from "puppeteer-core"

import { getAllBlockIds } from "../lib/blocks"
import { SITE_BLOCK_STYLE } from "../lib/site-style"

const OUTPUT_DIR = path.join(process.cwd(), "public/images/blocks")
const BASE_URL = process.env.CAPTURE_URL ?? "http://localhost:4000"
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[]

export function getBlockScreenshotPath(name: string, theme: "light" | "dark") {
  return path.join(OUTPUT_DIR, `${name}-${theme}.webp`)
}

async function captureScreenshots() {
  const force = process.argv.includes("--force")
  const executablePath = CHROME_PATHS.find((candidate) => existsSync(candidate))
  if (!executablePath) {
    throw new Error(
      "Chrome not found. Set CHROME_PATH to a Chromium-based browser."
    )
  }

  const blocks = (await getAllBlockIds()).filter(
    (block) =>
      force ||
      !existsSync(getBlockScreenshotPath(block, "light")) ||
      !existsSync(getBlockScreenshotPath(block, "dark"))
  )

  if (blocks.length === 0) {
    console.log("✨ All screenshots exist, nothing to capture")
    return
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  })

  try {
    for (const block of blocks) {
      const page = await browser.newPage()
      const url = `${BASE_URL}/view/${SITE_BLOCK_STYLE}/${block}`
      const response = await page.goto(url, { waitUntil: "networkidle2" })
      if (!response?.ok()) {
        console.warn(
          `⚠ Skipping ${block}: ${url} returned ${response?.status()}`
        )
        await page.close()
        continue
      }

      console.log(`- Capturing ${block}...`)
      for (const theme of ["light", "dark"] as const) {
        await page.emulateMediaFeatures([
          { name: "prefers-color-scheme", value: theme },
        ])
        await page.evaluate((current) => {
          localStorage.setItem("theme", current)
        }, theme)
        await page.reload({ waitUntil: "networkidle2" })

        // Let charts and entry animations settle.
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page.evaluate(() => {
          document.querySelector("[data-tailwind-indicator]")?.remove()
        })

        await page.screenshot({
          path: getBlockScreenshotPath(block, theme) as `${string}.webp`,
          type: "webp",
          quality: 80,
        })
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
}

try {
  console.log("🔍 Capturing screenshots...")
  await captureScreenshots()
  console.log("✅ Done!")
} catch (error) {
  console.error(error)
  process.exit(1)
}
