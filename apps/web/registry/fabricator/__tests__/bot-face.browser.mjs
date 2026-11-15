// Run with the dev server up: node registry/fabricator/__tests__/bot-face.browser.mjs
import assert from "node:assert/strict"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import puppeteer from "puppeteer-core"

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8")
const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate))
if (!executablePath)
  throw new Error("Set CHROME_PATH to an installed Chromium browser.")
const browser = await puppeteer.launch({ executablePath, headless: true })
await browser
  .defaultBrowserContext()
  .overridePermissions("http://localhost:4000", [
    "clipboard-read",
    "clipboard-write",
  ])
const preview = '[data-testid="bot-face-preview"]'
const shots = new URL("../../../../../tmp/bot-face/browser/", import.meta.url)
mkdirSync(shots, { recursive: true })

try {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => localStorage.setItem("theme", "light"))
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const base of ["base", "radix", "aria"]) {
    await page.setViewport({ width: 1280, height: 1000 })
    await page.goto(`http://localhost:4000/examples/${base}/bot-face-states`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })
    await page.waitForFunction(
      (selector) =>
        document.querySelector(`${selector} [data-slot="bot-face-body"]`)?.style
          .transform,
      {},
      preview
    )
    // The standalone examples route has a transparent canvas. Match the docs'
    // explicit surface so axe can resolve the background in both themes.
    await page.addStyleTag({
      content:
        "body { background: var(--background); color: var(--foreground); }",
    })
    await page.evaluate((selector) => {
      globalThis.botFaceIdentity = document.querySelector(selector)
      globalThis.botEyeIdentity = document.querySelector(
        `${selector} [data-slot="bot-face-eye"]`
      )
    }, preview)
    const layout = await page.evaluate(() => {
      const appearance = document.querySelector(
        '[data-testid="bot-face-appearance-controls"]'
      )
      const state = document.querySelector(
        '[data-testid="bot-face-state-controls"]'
      )
      return {
        left:
          appearance.getBoundingClientRect().right <
          state.getBoundingClientRect().left,
        appearance: ["Face shape", "Face color", "Eye style"].every((name) =>
          appearance.querySelector(`[aria-label="${name}"]`)
        ),
        playback: [
          "Play session",
          "Pause motion",
          "Resume motion",
          "Slow playback",
        ].some((label) =>
          [...state.querySelectorAll("button")].some(
            (button) => button.textContent.trim() === label
          )
        ),
      }
    })
    assert.deepEqual(
      layout,
      { left: true, appearance: true, playback: false },
      `${base}: appearance left, states right, no playback controls`
    )
    const choose = async (label) => {
      const buttons = await page.$$('[aria-label="Assistant state"] button')
      for (const button of buttons) {
        if (
          (await button.evaluate((element) => element.textContent.trim())) !==
          label
        )
          continue
        await button.click()
        await page.waitForFunction(
          (selector, state) =>
            document.querySelector(selector).dataset.state === state,
          {},
          preview,
          label === "Permission" ? "awaiting-permission" : label.toLowerCase()
        )
        return
      }
      throw new Error(`Missing state ${label}`)
    }
    await page.click('[aria-label="Use heart shape"]')
    await page.click('[aria-label="Use green color"]')
    const eyeChoices = await page.$$('[aria-label="Eye style"] button')
    await eyeChoices[1].click()
    await choose("Working")
    assert.deepEqual(
      await page.$eval(preview, (root) => ({
        shape: root.dataset.shape,
        color: root.dataset.color,
        eyes: root.dataset.eyes,
        state: root.dataset.state,
      })),
      { shape: "heart", color: "green", eyes: "dots", state: "working" },
      `${base}: one preview composes appearance and state`
    )
    for (const label of ["Speaking", "Thinking", "Listening", "Working"]) {
      await choose(label)
      const frames = await page.$eval(preview, async (root) => {
        const samples = []
        for (let index = 0; index < 75; index++) {
          await new Promise(requestAnimationFrame)
          if (index < 15) continue
          const { width, height } = root.getBoundingClientRect()
          samples.push({
            width,
            height,
            body: root.querySelector('[data-slot="bot-face-body"]').style
              .transform,
            eye: root
              .querySelector('[data-slot="bot-face-eye"]')
              .getAttribute("d"),
          })
        }
        return samples
      })
      assert.ok(
        new Set(frames.map((frame) => frame.body)).size > 20,
        `${base}: ${label} moves the shape`
      )
      assert.ok(
        new Set(frames.map((frame) => frame.eye)).size > 20,
        `${base}: ${label} articulates the eyes`
      )
      assert.ok(
        frames.every(
          ({ width, height, eye }) =>
            width === 120 && height === 120 && !/NaN|Infinity/.test(eye)
        ),
        `${base}: ${label} preserves layout and finite geometry`
      )
    }
    for (const label of [
      "Working",
      "Happy",
      "Sad",
      "Questioning",
      "Permission",
      "Thinking",
      "Listening",
      "Speaking",
      "Error",
      "Idle",
    ]) {
      await choose(label)
      await page.evaluate(() => new Promise(requestAnimationFrame))
      assert.equal(
        await page.$eval(
          preview,
          (root) =>
            root === globalThis.botFaceIdentity &&
            root.querySelector('[data-slot="bot-face-eye"]') ===
              globalThis.botEyeIdentity
        ),
        true,
        `${base}: persistent face and eyes`
      )
    }
    const reset = await page.$eval(preview, async (root) => {
      const body = root.querySelector('[data-slot="bot-face-body"]')
      const changes = []
      const observer = new MutationObserver(() =>
        changes.push(body.style.transform)
      )
      observer.observe(body, { attributes: true, attributeFilter: ["style"] })
      root.classList.add("unrelated-audit-class")
      for (let index = 0; index < 8; index++)
        await new Promise(requestAnimationFrame)
      observer.disconnect()
      root.classList.remove("unrelated-audit-class")
      return changes.includes("")
    })
    assert.equal(reset, false, `${base}: unrelated class does not reset pose`)
    assert.deepEqual(
      await page.$eval(preview, (root) => [
        root.dataset.shape,
        root.dataset.color,
        root.dataset.eyes,
      ]),
      ["heart", "green", "dots"],
      `${base}: switching states retains appearance`
    )
    await page.click('[aria-label="Use squircle shape"]')
    await page.click('[aria-label="Use violet color"]')
    await eyeChoices[0].click()

    assert.equal(
      await page.$('[aria-label="Color source"]'),
      null,
      `${base}: no Theme options in the demo`
    )
    assert.ok(
      await page.$('[aria-label="Use gray color"]'),
      `${base}: gray is available`
    )
    await page.click('[aria-label="Use gray color"]')
    assert.equal(
      await page.$eval(preview, (root) => root.dataset.color),
      "gray"
    )
    await page.click('[data-slot="color-picker-trigger"]')
    await page.waitForSelector('[aria-label="Hex"]')
    const hex = await page.$('[aria-label="Hex"]')
    await hex.click({ clickCount: 3 })
    await hex.type("123456")
    await page.keyboard.press("Enter")
    await page.waitForFunction(
      (selector) =>
        document.querySelector(selector).dataset.color === "#123456",
      {},
      preview
    )
    await page.evaluate(axeSource)
    await page.evaluate(async () => {
      for (let frame = 0; frame < 25; frame++)
        await new Promise(requestAnimationFrame)
    })
    const pickerViolations = await page.evaluate(async () => {
      const result = await globalThis.axe.run(
        document.querySelector('[aria-label="Color picker"]'),
        { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }
      )
      return result.violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map(({ html, failureSummary }) => ({
          html,
          failureSummary,
        })),
      }))
    })
    assert.deepEqual(
      pickerViolations,
      [],
      `${base}: custom picker accessibility`
    )
    await page.keyboard.press("Escape")
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="Hex"]')
    )
    await choose("Questioning")
    const code = await page.$eval(
      '[data-testid="bot-face-configuration"]',
      (element) => element.textContent
    )
    assert.ok(
      code.includes('color="#123456"') &&
        code.includes('state="questioning"') &&
        code.includes('shape="squircle"') &&
        code.includes('eyes="slant"'),
      `${base}: code follows the selected options`
    )
    const copy = await page.$(
      '[data-testid="bot-face-playground"] button::-p-text(Copy code)'
    )
    await copy.click()
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll(
          '[data-testid="bot-face-playground"] button'
        ),
      ].some((element) => element.textContent.trim() === "Copied")
    )
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      code,
      `${base}: copied code matches the preview`
    )
    assert.equal(
      await page.$eval(preview, (root) => root.style.color),
      "rgb(18, 52, 86)",
      `${base}: hex paints the face`
    )
    await page.click('[aria-label="Use violet color"]')

    await page.evaluate(() => {
      const button = [
        ...document.querySelectorAll('[aria-label="Assistant state"] button'),
      ].find((element) => element.textContent.trim() === "Questioning")
      button.focus()
    })
    await page.keyboard.press("Space")
    await page.waitForFunction(
      (selector) =>
        document.querySelector(selector).dataset.state === "questioning",
      {},
      preview
    )
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent.trim()),
      "Questioning",
      `${base}: keyboard retains focus`
    )

    for (const width of [1280, 768, 640, 390]) {
      await page.setViewport({ width, height: 1000 })
      for (const dark of [false, true]) {
        await page.evaluate((isDark) => {
          document.documentElement.classList.toggle("dark", isDark)
          document.documentElement.style.colorScheme = isDark ? "dark" : "light"
        }, dark)
        await page.evaluate(async () => {
          await document.fonts.ready
          for (let index = 0; index < 65; index++)
            await new Promise(requestAnimationFrame)
        })
        await page.evaluate(axeSource)
        const violations = await page.evaluate(async () => {
          const result = await globalThis.axe.run(
            document.querySelector("main") ?? document.body,
            { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }
          )
          return result.violations.map(({ id, impact, nodes }) => ({
            id,
            impact,
            nodes: nodes.map(({ html, failureSummary }) => ({
              html,
              failureSummary,
            })),
          }))
        })
        await page.screenshot({
          path: new URL(
            `${base}-${width}-${dark ? "dark" : "light"}.png`,
            shots
          ).pathname,
          fullPage: true,
        })
        assert.deepEqual(
          violations,
          [],
          `${base}: axe ${width} ${dark ? "dark" : "light"}`
        )
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          ),
          true,
          `${base}: fits ${width}`
        )
        await page.screenshot({
          path: new URL(
            `${base}-${width}-${dark ? "dark" : "light"}.png`,
            shots
          ).pathname,
          fullPage: true,
        })
      }
    }

    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ])
    await choose("Happy")
    await page.waitForFunction(
      (selector) =>
        document.querySelector(`${selector} [data-slot="bot-face-body"]`).style
          .transform === "rotate(0deg) rotateX(0deg) rotateY(0deg)",
      {},
      preview
    )
    const still = await page.$eval(preview, async (root) => {
      const before = root.innerHTML
      for (let index = 0; index < 12; index++)
        await new Promise(requestAnimationFrame)
      return root.innerHTML === before
    })
    assert.equal(still, true, `${base}: reduced motion is static`)
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "no-preference" },
    ])
    await page.setViewport({ width: 1280, height: 1000 })
    await page.goto(`http://localhost:4000/docs/components/${base}/bot-face`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    })
    await page.waitForSelector(preview)
    await page.click('[aria-label="Use star shape"]')
    await page.click('[aria-label="Use gray color"]')
    await choose("Happy")
    assert.deepEqual(
      await page.$eval(preview, (root) => [
        root.dataset.shape,
        root.dataset.color,
        root.dataset.state,
      ]),
      ["star", "gray", "happy"],
      `${base}: docs expose combined controls`
    )
    await choose("Speaking")
    await page.waitForFunction(
      (selector) => {
        const root = document.querySelector(selector)
        const eye = root.querySelector('[data-slot="bot-face-eye"]')
        return (
          eye.getAttribute("d").match(/M/g).length === 3 &&
          eye.getAttribute("d").includes("Q") &&
          eye.getBBox().width > 13 &&
          root
            .querySelector('[data-slot="bot-face-body"]')
            .style.transform.includes("rotateX")
        )
      },
      {},
      preview
    )
    await choose("Questioning")
    await page.waitForFunction(
      (selector) => {
        const eye = document.querySelector(
          `${selector} [data-slot="bot-face-eye"]`
        )
        const parts = eye.getAttribute("d").match(/M[^M]+/g)
        return (
          parts.length === 3 &&
          eye.getBBox().height < 23 &&
          parts.slice(1).every((part) => {
            const coordinates = part.match(/-?\d+(?:\.\d+)?/g).map(Number)
            return [0, 1].every((axis) => {
              const values = coordinates.filter(
                (_, index) => index % 2 === axis
              )
              return Math.max(...values) - Math.min(...values) < 0.02
            })
          })
        )
      },
      {},
      preview
    )
    for (const width of [1280, 390]) {
      await page.setViewport({ width, height: 1000 })
      for (const dark of [false, true]) {
        await page.evaluate((isDark) => {
          document.documentElement.classList.toggle("dark", isDark)
          document.documentElement.style.colorScheme = isDark ? "dark" : "light"
        }, dark)
        await page.evaluate(async () => {
          for (let index = 0; index < 65; index++)
            await new Promise(requestAnimationFrame)
        })
        await page.evaluate(axeSource)
        const violations = await page.evaluate(async () => {
          const result = await globalThis.axe.run(
            document.querySelector('[data-slot="docs"]'),
            { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }
          )
          return result.violations.map(({ id, nodes }) => ({
            id,
            nodes: nodes.map(({ target }) => target),
          }))
        })
        assert.deepEqual(violations, [], `${base}: docs axe ${width} ${dark}`)
      }
    }
    process.stdout.write(
      `Passed ${base}: state transitions, continuity, keyboard, widths, themes and axe.\n`
    )
  }
  assert.deepEqual(errors, [], "no browser errors")
  await page.close()
  process.stdout.write("Passed all BotFace browser checks.\n")
} finally {
  await browser.close()
}
