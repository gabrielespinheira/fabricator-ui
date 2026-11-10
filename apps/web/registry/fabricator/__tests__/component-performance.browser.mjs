import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"

const root = fileURLToPath(new URL("../../../../../", import.meta.url))
const web = path.join(root, "apps/web")
const baseline = process.argv.includes("--baseline")
const result = await Bun.build({
  entrypoints: [
    fileURLToPath(
      new URL("./component-performance.fixture.tsx", import.meta.url)
    ),
  ],
  target: "browser",
  format: "iife",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "probe",
      setup(build) {
        build.onResolve(
          { filter: /^@\/registry\/bases\/(base|__base__)\// },
          ({ path: specifier }) => {
            const suffix = specifier.replace(
              /^@\/registry\/bases\/(base|__base__)\//,
              ""
            )
            for (const directory of [
              "fabricator/base",
              "fabricator/shared",
              "bases/base",
            ]) {
              for (const extension of [".tsx", ".ts"]) {
                const candidate = path.join(
                  web,
                  "registry",
                  directory,
                  suffix + extension
                )
                if (existsSync(candidate)) return { path: candidate }
              }
            }
          }
        )
        build.onResolve({ filter: /icon-placeholder$/ }, () => ({
          path: "icons",
          namespace: "probe",
        }))
        build.onLoad({ filter: /.*/, namespace: "probe" }, () => ({
          contents:
            'import * as React from "react"; export function IconPlaceholder() { return <svg/> }',
          loader: "tsx",
        }))
        if (baseline)
          build.onLoad(
            {
              filter:
                /registry\/fabricator\/(shared\/ui\/file-tree|shared\/lib\/editor-dom|base\/ui\/(calendar|app-shell))\.tsx?$/,
            },
            ({ path: file }) => ({
              contents: execFileSync(
                "git",
                ["show", `HEAD:${path.relative(root, file)}`],
                { encoding: "utf8" }
              ),
              loader: file.endsWith(".tsx") ? "tsx" : "ts",
            })
          )
      },
    },
  ],
})
if (!result.success) throw new Error(result.logs.join("\n"))
const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((candidate) => candidate && existsSync(candidate))
if (!executablePath)
  throw new Error("Set CHROME_PATH to an installed Chromium browser.")
const browser = await puppeteer.launch({ executablePath, headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.stack))
  await page.setViewport({ width: 1280, height: 1000 })
  await page.setContent(
    '<style>[data-slot=file-tree] {position:relative;height:250px;overflow:auto} [data-slot=file-tree-item]{height:24px;display:flex}</style><div id="root"></div>'
  )
  await page.addScriptTag({ content: await result.outputs[0].text() })
  await page.waitForSelector("[role=treeitem]")
  await page.evaluate(() => new Promise(requestAnimationFrame))
  const editorReads = await page.evaluate(() =>
    Number(document.body.dataset.editorReads)
  )
  const shellMeasurements = await page.evaluate(async () => {
    const shell = document.querySelector("[data-slot=app-shell]")
    const content = document.getElementById("shell-content")
    if (!shell || !content) throw new Error("Missing shell fixture")
    let reads = 0
    const measure = shell.getBoundingClientRect.bind(shell)
    shell.getBoundingClientRect = () => {
      reads += 1
      return measure()
    }
    content.append(document.createElement("span"))
    await new Promise(requestAnimationFrame)
    shell.getBoundingClientRect = measure
    return reads
  })
  await page.evaluate(() => {
    const content = document.getElementById("shell-content")
    const wrapper = document.createElement("div")
    wrapper.innerHTML =
      '<div data-slot="sidebar-gap" style="width:123px"></div>'
    content?.append(wrapper)
  })
  await page.waitForFunction(
    () =>
      document.getElementById("shell-content")?.dataset.sidebarWidth === "123"
  )
  await page.evaluate(() =>
    document.querySelector('[data-slot="sidebar-gap"]')?.remove()
  )
  await page.waitForFunction(
    () => document.getElementById("shell-content")?.dataset.sidebarWidth === "0"
  )
  const initial = await page.evaluate(() =>
    Number(document.body.dataset.iconRenders)
  )
  await page.mouse.move(40, 45)
  await page.waitForFunction(
    (initial) =>
      Number(document.body.dataset.iconRenders) > initial ||
      document.querySelector("[data-fluid-hover-active]"),
    {},
    initial
  )
  await page.evaluate(() => new Promise(requestAnimationFrame))
  const hovered = await page.evaluate(() =>
    Number(document.body.dataset.iconRenders)
  )
  const calendarRoot = await page.$("[data-slot=calendar]")
  const day = await page.$("[data-day]")
  await page.click("#select")
  const retained = await page.evaluate(
    (calendar, day) => ({ root: calendar?.isConnected, day: day?.isConnected }),
    calendarRoot,
    day
  )
  console.info(
    JSON.stringify({
      baseline,
      initial,
      hoverIconRenders: hovered - initial,
      shellMeasurements,
      editorReads,
      retained,
      errors,
    })
  )
  if (
    !baseline &&
    (editorReads > 1000 ||
      shellMeasurements !== 0 ||
      hovered !== initial ||
      !retained.root ||
      !retained.day ||
      errors.length > 0)
  )
    process.exitCode = 1
} finally {
  await browser.close()
}
