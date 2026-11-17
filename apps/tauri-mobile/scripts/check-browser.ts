import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer, { type Page } from "puppeteer-core"
import { z } from "zod"

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const require = createRequire(import.meta.url)
const baseUrl = process.env.TAURI_PREVIEW_URL ?? "http://localhost:1420"
const manifest = z
  .object({
    catalog: z.array(z.object({ name: z.string(), type: z.string() })),
    scenarios: z.array(z.object({ id: z.string(), item: z.string() })),
    blocks: z.array(z.object({ id: z.string(), item: z.string() })),
  })
  .parse(
    JSON.parse(
      readFileSync(path.join(directory, "dist/explorer-manifest.json"), "utf8")
    )
  )
const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((filename) => filename && existsSync(filename))
if (!executablePath)
  throw new Error("An installed Chrome is required. Set CHROME_PATH.")

const outputDirectory = path.join(directory, "build/browser-check")
mkdirSync(outputDirectory, { recursive: true })
const failures: { route: string; message: string }[] = []
const blockedRequests = new Set<string>()
let checked = 0
const browser = await puppeteer.launch({ executablePath, headless: true })

async function openPage() {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.setRequestInterception(true)
  page.on("request", (request) => {
    const url = request.url()
    if (
      url.startsWith(baseUrl) ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    )
      void request.continue()
    else {
      blockedRequests.add(url)
      void request.abort()
    }
  })
  page.on("pageerror", (error: unknown) =>
    failures.push({
      route: page.url(),
      message: error instanceof Error ? error.message : String(error),
    })
  )
  await page.goto(baseUrl, { waitUntil: "networkidle0" })
  return page
}

async function checkRoute(page: Page, route: string, selector: string) {
  await page.goto(`${baseUrl}/${route}`)
  try {
    await page.waitForFunction(
      (expected) =>
        document
          .querySelector(".mobile-host")
          ?.getAttribute("data-explorer-route") === expected,
      { timeout: 8000, polling: 50 },
      route
    )
    await page.waitForSelector(selector, { timeout: 8000 })
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="Loading example"]'),
      { timeout: 8000, polling: 50 }
    )
    const message = await page.$eval(
      selector,
      (element) => element.textContent ?? ""
    )
    if (
      message.includes("Example could not render") ||
      message.includes("No web scenario is registered")
    ) {
      failures.push({ route, message })
      process.stdout.write(`FAIL ${route}: ${message}\n`)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push({ route, message })
    process.stdout.write(`FAIL ${route}: ${message}\n`)
  }
  checked += 1
  writeFileSync(
    path.join(outputDirectory, "progress.json"),
    JSON.stringify(
      { checked, failures, blockedRequests: [...blockedRequests] },
      null,
      2
    )
  )
  if (checked % 50 === 0)
    process.stdout.write(
      `Checked ${checked} routes; ${failures.length} failures.\n`
    )
}

try {
  const routes =
    process.env.TAURI_CHECK_SCOPE === "audits"
      ? []
      : [
          ...manifest.catalog
            .filter((item) => item.type !== "registry:block")
            .map((item) => ({
              route: `#/components/${item.name}`,
              selector: ".demo-stage",
            })),
          ...(process.env.TAURI_CHECK_SCOPE === "families"
            ? []
            : manifest.scenarios.map((scenario) => ({
                route: `#/components/${scenario.item}?scenario=${scenario.id}`,
                selector: ".demo-stage",
              }))),
          ...manifest.blocks.map((block) => ({
            route: `#/blocks/${block.id}`,
            selector: ".block-stage",
          })),
        ]
  const pages = await Promise.all(Array.from({ length: 4 }, openPage))
  await Promise.all(
    pages.map(async (page) => {
      let target = routes.shift()
      while (target) {
        await checkRoute(page, target.route, target.selector)
        target = routes.shift()
      }
    })
  )
  const page = pages[0]
  if (!page) throw new Error("No browser page was created.")
  await page.bringToFront()
  const audits: {
    mode: string
    violations: unknown
    density: string | undefined
    overflow: boolean
  }[] = []
  for (const width of [390, 1280]) {
    for (const theme of ["light", "dark"]) {
      await page.setViewport({ width, height: width === 390 ? 844 : 900 })
      await page.evaluate((value) => {
        localStorage.setItem("fabricator.tauri-mobile.theme", value)
        localStorage.removeItem("fabricator.tauri-mobile.settings")
      }, theme)
      await page.goto(`${baseUrl}/#/components/button`, {
        waitUntil: "networkidle0",
      })
      await page.reload({ waitUntil: "networkidle0" })
      await page.waitForFunction(
        (expected) => document.documentElement.dataset.density === expected,
        { polling: 50 },
        width < 768 ? "spacious" : "default"
      )
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
          if (Number.isFinite(animation.effect?.getComputedTiming().endTime))
            animation.finish()
        }
      })
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") })
      const audit: unknown = await page.evaluate(async () => {
        const axe: unknown = Reflect.get(window, "axe")
        if (
          typeof axe !== "object" ||
          axe === null ||
          !("run" in axe) ||
          typeof axe.run !== "function"
        )
          throw new Error("axe did not initialize")
        const result: unknown = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
        return result
      })
      const parsed = z
        .object({
          violations: z.array(
            z.object({
              id: z.string(),
              impact: z.string().nullable(),
              nodes: z.array(
                z.object({
                  html: z.string(),
                  failureSummary: z.string().optional(),
                })
              ),
            })
          ),
        })
        .parse(audit)
      const layout = await page.evaluate(() => ({
        density: document.documentElement.dataset.density,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      }))
      audits.push({
        mode: `${width}-${theme}`,
        violations: parsed.violations,
        ...layout,
      })
      await page.screenshot({
        path: path.join(outputDirectory, `button-${width}-${theme}.png`),
      })
    }
  }
  await page.goto(`${baseUrl}/#/components/form`, { waitUntil: "networkidle0" })
  await page.focus("#profile-name")
  await page.keyboard.press("Tab")
  await page.keyboard.press("Enter")
  const invalid = await page.$eval("#profile-name", (element) =>
    element.getAttribute("aria-invalid")
  )
  if (invalid !== "true")
    failures.push({
      route: "#/components/form",
      message: "Keyboard submission did not expose form validation.",
    })
  await page.focus("#profile-name")
  await page.keyboard.type("Fabricator")
  await page.keyboard.press("Tab")
  await page.keyboard.press("Enter")
  await page.waitForSelector('[role="status"]', { timeout: 3000 })
  const restoredRoute = "#/components/button?scenario=button-disabled"
  await checkRoute(page, restoredRoute, ".demo-stage")
  await checkRoute(page, "#/components/slider", ".demo-stage")
  await page.goBack()
  await page.waitForFunction(
    (expected) =>
      document
        .querySelector(".mobile-host")
        ?.getAttribute("data-explorer-route") === expected,
    { polling: 50 },
    restoredRoute
  )
  await page.goto(baseUrl, { waitUntil: "networkidle0" })
  await page.waitForFunction(
    (expected) =>
      document
        .querySelector(".mobile-host")
        ?.getAttribute("data-explorer-route") === expected,
    { polling: 50 },
    restoredRoute
  )
  await page.goto(`${baseUrl}/#/services`, { waitUntil: "networkidle0" })
  const isNativeDisabled = await page.$eval("#native-note", (element) =>
    element.hasAttribute("disabled")
  )
  if (!isNativeDisabled)
    failures.push({
      route: "#/services",
      message: "Browser preview incorrectly enabled native storage.",
    })
  await page.goto(`${baseUrl}/#/icons`, { waitUntil: "networkidle0" })
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-slot="card-content"] svg').length > 0,
    { polling: 50 }
  )
  await page.goto(`${baseUrl}/#/settings`, { waitUntil: "networkidle0" })
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (element) => element.textContent?.trim() === "Compact"
    )
    if (!button) throw new Error("Compact density control is missing.")
    button.click()
  })
  await page.waitForFunction(
    () => document.documentElement.dataset.density === "compact",
    { polling: 50 }
  )
  await page.reload({ waitUntil: "networkidle0" })
  await page.waitForFunction(
    () => document.documentElement.dataset.density === "compact",
    { polling: 50 }
  )
  writeFileSync(
    path.join(outputDirectory, "report.json"),
    JSON.stringify(
      { checked, failures, audits, blockedRequests: [...blockedRequests] },
      null,
      2
    )
  )
  process.stdout.write(
    `Checked ${checked} routes. ${failures.length} runtime failures. Report: ${path.join(outputDirectory, "report.json")}\n`
  )
  if (
    failures.length > 0 ||
    audits.some(
      (audit) =>
        z.array(z.unknown()).parse(audit.violations).length > 0 ||
        audit.overflow
    )
  )
    process.exitCode = 1
} finally {
  await browser.close()
}
