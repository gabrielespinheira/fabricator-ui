/**
 * Capture the static images shown on small screens by the homepage and the
 * example apps. On desktop these pages render live components; on mobile they
 * show a screenshot of that desktop view instead.
 *
 * Usage (with the dev server running on :4000):
 *   bun run pages:capture
 *
 * Each page follows the same markup: a `md:hidden` wrapper holding the images,
 * immediately followed by the desktop element that is captured. Uses your
 * installed Chrome through puppeteer-core (set CHROME_PATH to override).
 */
import { existsSync } from "fs"
import path from "path"
import puppeteer from "puppeteer-core"

const BASE_URL = process.env.CAPTURE_URL ?? "http://localhost:4000"
const PUBLIC_DIR = path.join(process.cwd(), "public")
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[]

// Output paths are relative to public/ and end with -{theme}.webp.
const PAGES = [
  { url: "/", output: "images/full", width: 1600 },
  { url: "/examples/dashboard", output: "examples/dashboard", width: 1280 },
  { url: "/examples/tasks", output: "examples/tasks", width: 1280 },
  { url: "/examples/playground", output: "examples/playground", width: 1280 },
  {
    url: "/examples/authentication",
    output: "examples/authentication",
    width: 1280,
  },
]

const DESKTOP_SELECTOR = ".md\\:hidden:has(img) + *"

async function capturePages() {
  const executablePath = CHROME_PATHS.find((candidate) => existsSync(candidate))
  if (!executablePath) {
    throw new Error("Chrome not found. Set CHROME_PATH to a Chromium-based browser.")
  }

  const browser = await puppeteer.launch({ executablePath, headless: true })
  try {
    for (const target of PAGES) {
      const page = await browser.newPage()
      await page.setViewport({
        width: target.width,
        height: 1000,
        deviceScaleFactor: 2,
      })
      await page.goto(`${BASE_URL}${target.url}`, { waitUntil: "networkidle2" })

      for (const theme of ["light", "dark"] as const) {
        await page.emulateMediaFeatures([
          { name: "prefers-color-scheme", value: theme },
        ])
        await page.evaluate((current) => {
          localStorage.setItem("theme", current)
        }, theme)
        await page.reload({ waitUntil: "networkidle2" })
        await new Promise((resolve) => setTimeout(resolve, 1500))
        await page.evaluate(() => {
          document.querySelector("[data-tailwind-indicator]")?.remove()
        })

        const element = await page.$(DESKTOP_SELECTOR)
        if (!element) {
          throw new Error(`${target.url}: no element matches ${DESKTOP_SELECTOR}`)
        }
        const box = await element.boundingBox()
        const file = path.join(PUBLIC_DIR, `${target.output}-${theme}.webp`)
        await element.screenshot({
          path: file as `${string}.webp`,
          type: "webp",
          quality: 80,
        })
        console.log(
          `- ${target.url} (${theme}): ${Math.round(box?.width ?? 0)}x${Math.round(box?.height ?? 0)} → public/${target.output}-${theme}.webp`
        )
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
}

try {
  await capturePages()
  console.log("✅ Done!")
} catch (error) {
  console.error(error)
  process.exit(1)
}
