/**
 * Look at every screen block the way a reader can't: at five widths and in both
 * themes, failing on what a screenshot hides.
 *
 * Usage (with the dev server running on :4000):
 *   bun run blocks:check                      # every block, every base
 *   bun run blocks:check finance-01 --base base --width 390
 *
 * Reports console errors, sideways scroll, axe violations, controls under
 * something else that the keyboard still reaches, touch targets under 24px on
 * phones, a page without one h1, and a navigation row that lost its icon.
 * Uses your installed Chrome through puppeteer-core (CHROME_PATH overrides).
 */
import { existsSync } from "fs"
import fs from "fs/promises"
import { createRequire } from "module"
import { parseArgs } from "util"
import puppeteer, { type Browser, type Page } from "puppeteer-core"

import { BASES } from "../registry/bases"
import { fabricatorItems } from "../registry/fabricator/registry"

const BASE_URL = process.env.CAPTURE_URL ?? "http://localhost:4000"
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].flatMap((path) => (path ? [path] : []))

const THEMES = ["light", "dark"] as const
const PHONE = 390
const VIEWPORTS = [
  { width: PHONE, height: 844 },
  { width: 834, height: 1112 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]
const MAX_TAB_STOPS = 80
const NAVIGATION_TIMEOUT = 90_000

async function readAxeSource() {
  const require = createRequire(import.meta.url)
  return fs.readFile(require.resolve("axe-core/axe.min.js"), "utf8")
}

function findPageProblems({ isPhone }: { isPhone: boolean }) {
  const problems: string[] = []
  const overflow = document.documentElement.scrollWidth - innerWidth
  if (overflow > 0) problems.push(`scrolls sideways by ${overflow}px`)

  const headings = [
    ...document.querySelectorAll('h1, [role="heading"][aria-level="1"]'),
  ].filter(
    (heading) => !heading.closest("[inert], [hidden], [aria-hidden=true]")
  )
  if (headings.length !== 1)
    problems.push(`${headings.length} level-one headings`)

  // A list either has icons or it doesn't.
  for (const list of document.querySelectorAll(
    '[data-slot="sidebar-menu"], [data-slot="app-shell-bottom-nav"]'
  )) {
    const rows = [
      ...list.querySelectorAll(
        ':scope > [data-slot="app-nav-item"] > a, :scope > a'
      ),
    ]
    const iconless = rows.filter((row) => !row.querySelector("svg"))
    if (iconless.length > 0 && iconless.length < rows.length) {
      problems.push(`${iconless.length} navigation rows without their icon`)
    }
  }
  const rail = document.querySelector('[data-collapsible="icon"]')
  if (rail?.querySelector('[data-slot="app-nav-item"] > a:not(:has(svg))')) {
    problems.push("an icon rail with a row that has no icon")
  }

  if (!isPhone) return problems
  const small = [...document.querySelectorAll("button, a[href]")].filter(
    (control) => {
      if (control.closest("[inert], [aria-hidden=true], .sr-only, p")) {
        return false
      }
      const { width, height } = control.getBoundingClientRect()
      return width > 2 && height > 2 && Math.min(width, height) < 24
    }
  )
  for (const control of small) {
    const name = control.getAttribute("aria-label") ?? control.textContent ?? ""
    problems.push(`"${name.trim().slice(0, 32)}" is under 24px`)
  }
  return problems
}

/** The focused control's name when something else is drawn over it. */
function readCoveredFocus() {
  const control = document.activeElement
  if (!control || control === document.body) return null
  const { left, top, width, height } = control.getBoundingClientRect()
  const x = left + width / 2
  const y = top + height / 2
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null
  const hit = document.elementFromPoint(x, y)
  if (!hit || control.contains(hit) || hit.contains(control)) return null
  const label = control.closest("label")
  if (label?.contains(hit)) return null
  return (control.getAttribute("aria-label") ?? control.textContent ?? "")
    .trim()
    .slice(0, 32)
}

async function findCoveredStops(page: Page) {
  const covered = new Set<string>()
  for (let stop = 0; stop < MAX_TAB_STOPS; stop += 1) {
    await page.keyboard.press("Tab")
    const name = await page.evaluate(readCoveredFocus)
    if (name) covered.add(name)
    const isDone = await page.evaluate(
      () => document.activeElement === document.body
    )
    if (isDone) break
  }
  return [...covered].map((name) => `"${name}" takes focus under something`)
}

async function checkBlock(
  browser: Browser,
  axeSource: string,
  target: { url: string; theme: string; width: number; height: number }
) {
  const isPhone = target.width === PHONE
  const page = await browser.newPage()
  const problems: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`)
  })
  page.on("pageerror", (error) => problems.push(`error: ${String(error)}`))
  try {
    await page.setViewport({
      width: target.width,
      height: target.height,
      isMobile: isPhone,
      hasTouch: isPhone,
    })
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ])
    await page.evaluateOnNewDocument((theme) => {
      localStorage.setItem("theme", theme)
    }, target.theme)
    const response = await page.goto(target.url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT,
    })
    if (!response?.ok()) return [`HTTP ${response?.status() ?? "unavailable"}`]
    await page.waitForSelector("html[data-preview-ready]", {
      timeout: NAVIGATION_TIMEOUT,
    })
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    problems.push(...(await page.evaluate(findPageProblems, { isPhone })))
    await page.evaluate(axeSource)
    const violations = await page.evaluate(`
      axe.run({ exclude: ["nextjs-portal"] }).then((result) =>
        result.violations.map(
          (violation) => violation.id + ": " + violation.nodes[0].target.join(" ")
        )
      )
    `)
    if (Array.isArray(violations)) {
      problems.push(...violations.map((violation) => `axe ${violation}`))
    }
    if (target.theme === "light" && (isPhone || target.width === 1440)) {
      problems.push(...(await findCoveredStops(page)))
    }
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error))
  } finally {
    await page.close()
  }
  return [...new Set(problems)]
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { base: { type: "string" }, width: { type: "string" } },
})
const executablePath = CHROME_PATHS.find((candidate) => existsSync(candidate))
if (!executablePath) {
  throw new Error("Chrome not found. Set CHROME_PATH to a Chromium browser.")
}
const baseNames = BASES.map(({ name }) => name)
const bases = baseNames.filter((base) => !values.base || base === values.base)
if (bases.length === 0) {
  throw new Error(
    `Unknown base ${values.base}. Choose ${baseNames.join(", ")}.`
  )
}
const viewports = VIEWPORTS.filter(
  ({ width }) => values.width === undefined || String(width) === values.width
)
if (viewports.length === 0) {
  throw new Error(
    `Unknown width ${values.width}. Choose ${VIEWPORTS.map(({ width }) => width).join(", ")}.`
  )
}
const blockNames = fabricatorItems
  .filter((item) => item.type === "registry:block")
  .map(({ name }) => name)
const unknown = positionals.filter((name) => !blockNames.includes(name))
if (unknown.length > 0) {
  throw new Error(`Unknown blocks: ${unknown.join(", ")}`)
}
const names = positionals.length > 0 ? positionals : blockNames
const axeSource = await readAxeSource()
const browser = await puppeteer.launch({ executablePath, headless: true })
let failures = 0
try {
  for (const base of bases) {
    for (const name of names) {
      const url = `${BASE_URL}/view/${base}-fabricator/${name}`
      const found = new Map<string, string[]>()
      for (const { width, height } of viewports) {
        for (const theme of THEMES) {
          const target = { url, theme, width, height }
          for (const problem of await checkBlock(browser, axeSource, target)) {
            found.set(problem, [
              ...(found.get(problem) ?? []),
              `${width} ${theme}`,
            ])
          }
        }
      }
      failures += found.size
      console.log(`${found.size === 0 ? "✅" : "❌"} ${base} ${name}`)
      for (const [problem, places] of found) {
        console.log(`   ${problem} (${places.join(", ")})`)
      }
    }
  }
} finally {
  await browser.close()
}
if (failures > 0) process.exitCode = 1
