import assert from "node:assert/strict"
import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"

const root = fileURLToPath(new URL("../../../../../", import.meta.url))
const output = path.join(root, "tmp/theme-toggle-motion")
const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate))
if (!executablePath)
  throw new Error("Set CHROME_PATH to an installed Chromium browser.")
mkdirSync(output, { recursive: true })
const browser = await puppeteer.launch({ executablePath, headless: true })
const baseUrl = process.env.CAPTURE_URL ?? "http://localhost:4000"

try {
  const page = await browser.newPage()
  page.setDefaultTimeout(60000)
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const base of ["base", "radix", "aria"]) {
    await page.setViewport({ width: 1280, height: 900 })
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "no-preference" },
    ])
    await page.goto(`${baseUrl}/docs/components/${base}/theme-toggle`, {
      waitUntil: "networkidle2",
    })
    await page.waitForSelector('[data-slot="theme-toggle"][data-ready="true"]')
    await page.evaluate(() => {
      document.documentElement.dataset.motion = "default"
      const original = document.startViewTransition.bind(document)
      window.themeTransitionCount = 0
      document.startViewTransition = (update) => {
        window.themeTransitionCount++
        const transition = original(update)
        window.latestThemeTransition = transition
        return transition
      }
    })

    const reveal = async (label, expectedDuration, screenshot) => {
      const data = await page.evaluate(
        async ({ label }) => {
          const button = document.querySelector(`button[aria-label="${label}"]`)
          button.scrollIntoView({ block: "center" })
          const rectangle = button.getBoundingClientRect()
          const before = button.dataset.theme
          button.click()
          await window.latestThemeTransition.ready
          const animations = document
            .getAnimations()
            .filter((animation) => animation.effect?.pseudoElement)
          const pageReveal = animations.find(
            (animation) =>
              animation.effect.pseudoElement === "::view-transition-new(root)"
          )
          const elapsed = pageReveal.effect.getTiming().duration * 0.35
          for (const animation of animations) {
            animation.pause()
            animation.currentTime = Math.min(
              elapsed,
              animation.effect.getTiming().duration
            )
          }
          return {
            before,
            after: button.dataset.theme,
            x: rectangle.x + rectangle.width / 2,
            y: rectangle.y + rectangle.height / 2,
            duration: pageReveal.effect.getTiming().duration,
            frames: pageReveal.effect.getKeyframes(),
            clip: getComputedStyle(
              document.documentElement,
              "::view-transition-new(root)"
            ).clipPath,
            mask: getComputedStyle(
              document.documentElement,
              "::view-transition-new(root)"
            ).maskImage,
            progress: getComputedStyle(
              document.documentElement,
              "::view-transition-new(root)"
            ).getPropertyValue("--fabricator-theme-progress"),
            easing: pageReveal.effect.getTiming().easing,
            opacity: getComputedStyle(
              document.documentElement,
              "::view-transition-new(root)"
            ).opacity,
            filter: getComputedStyle(
              document.documentElement,
              "::view-transition-new(root)"
            ).filter,
            width: window.innerWidth,
            height: window.innerHeight,
            iconLayers: animations.filter((animation) =>
              animation.effect.pseudoElement.includes(
                "fabricator-theme-toggle-icon"
              )
            ).length,
          }
        },
        { label }
      )
      assert.notEqual(data.before, data.after)
      assert.equal(data.duration, expectedDuration)
      assert.equal(data.iconLayers, 2)
      assert.equal(data.easing, "cubic-bezier(0.4, 0, 0.2, 1)")
      if (data.frames[0].filter === "blur(8px)") {
        assert.equal(
          data.mask,
          "none",
          "circle-blur uses a clipped page snapshot"
        )
        assert.equal(
          data.opacity,
          "1",
          "circle-blur does not crossfade the snapshot"
        )
        assert.equal(
          data.filter,
          "blur(4px)",
          "beUI has 4px blur at 35% elapsed time"
        )
        assert.equal(data.frames.at(-1).filter, "blur(0px)")
      } else assert.equal(data.filter, "none", "Other reveals keep text sharp")
      if (data.mask !== "none") {
        assert.ok(Number(data.progress) > 0 && Number(data.progress) < 1)
        assert.ok(!data.mask.includes("NaN"))
        const origin = data.mask.match(/at ([\d.-]+)% ([\d.-]+)%/)
        if (origin) {
          assert.ok(
            Math.abs((Number(origin[1]) / 100) * data.width - data.x) < 0.01
          )
          assert.ok(
            Math.abs((Number(origin[2]) / 100) * data.height - data.y) < 0.01
          )
        }
      } else assert.notEqual(data.clip, "none")
      assert.ok(!data.clip.includes("NaN"))
      const circle = data.frames[0].clipPath?.match(
        /at ([\d.-]+)(px|%) ([\d.-]+)(px|%)/
      )
      if (circle) {
        assert.ok(
          Math.abs(
            Number(circle[1]) * (circle[2] === "%" ? data.width / 100 : 1) -
              data.x
          ) < 0.01
        )
        assert.ok(
          Math.abs(
            Number(circle[3]) * (circle[4] === "%" ? data.height / 100 : 1) -
              data.y
          ) < 0.01
        )
      }
      if (screenshot)
        await page.screenshot({
          path: path.join(output, `${base}-${screenshot}.png`),
        })
      await page.evaluate(async () => {
        document
          .getAnimations()
          .filter((animation) => animation.effect?.pseudoElement)
          .forEach((animation) => animation.finish())
        await window.latestThemeTransition.finished
      })
      assert.equal(
        await page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => animation.effect?.pseudoElement).length
        ),
        0
      )
      assert.equal(
        await page.$eval(
          `button[aria-label="${label}"] [data-slot="theme-toggle-icon"]`,
          (icon) => icon.style.viewTransitionName
        ),
        ""
      )
    }

    for (const variant of [
      "rectangle",
      "circle",
      "circle blur",
      "blinds",
      "square",
      "diamond",
      "hexagon",
      "triangle",
    ]) {
      await reveal(
        `Try ${variant} reveal`,
        700,
        `${variant.replaceAll(" ", "-")}-during`
      )
      await reveal(`Try ${variant} reveal`, 700)
    }
    // Sample the actual composited pixels through a flat theme surface.
    // A moving boundary must contain several intermediate alpha levels.
    for (const variant of ["square"]) {
      const fade = await page.evaluate(async (variant) => {
        const button = document.querySelector(
          `button[aria-label="Try ${variant} reveal"]`
        )
        button.scrollIntoView({ block: "center" })
        const rectangle = button.getBoundingClientRect()
        const x = rectangle.x + rectangle.width / 2
        const y = rectangle.y + rectangle.height / 2
        const probe = document.createElement("div")
        probe.id = "theme-fade-probe"
        probe.style.cssText =
          "position:fixed;inset:0;z-index:2147483647;background:var(--background);pointer-events:none"
        document.body.appendChild(probe)
        const before = getComputedStyle(probe).backgroundColor
        button.click()
        await window.latestThemeTransition.ready
        for (const animation of document
          .getAnimations()
          .filter((animation) => animation.effect?.pseudoElement)) {
          animation.pause()
          animation.currentTime = Math.min(
            245,
            animation.effect.getTiming().duration
          )
        }
        const feather = Math.max(
          16,
          Math.min(32, Math.min(innerWidth, innerHeight) * 0.035)
        )
        const extent =
          Math.max(x, innerWidth - x, y, innerHeight - y) + feather + 1
        return {
          before,
          after: getComputedStyle(probe).backgroundColor,
          x,
          y,
          feather,
          edge: x - extent * 0.5,
          scale: devicePixelRatio,
        }
      }, variant)
      const png = await page.screenshot()
      const alphas = await page.evaluate(
        async ({ fade, png }) => {
          const picture = new Image()
          picture.src = `data:image/png;base64,${png}`
          await picture.decode()
          const canvas = document.createElement("canvas")
          canvas.width = picture.width
          canvas.height = picture.height
          const context = canvas.getContext("2d")
          context.drawImage(picture, 0, 0)
          const pixels = Array.from(
            { length: 9 },
            (_, index) =>
              context.getImageData(
                Math.round(
                  (fade.edge + (fade.feather * index) / 8) * fade.scale
                ),
                Math.round(fade.y * fade.scale),
                1,
                1
              ).data[0]
          )
          context.fillStyle = fade.before
          context.fillRect(0, 0, 1, 1)
          const before = context.getImageData(0, 0, 1, 1).data[0]
          context.fillStyle = fade.after
          context.fillRect(0, 0, 1, 1)
          const after = context.getImageData(0, 0, 1, 1).data[0]
          return pixels.map((pixel) => (pixel - before) / (after - before))
        },
        { fade, png: Buffer.from(png).toString("base64") }
      )
      assert.ok(
        alphas.filter((alpha) => alpha > 0.05 && alpha < 0.95).length >= 3,
        `${variant}: feather pixels ${alphas}`
      )
      assert.ok(
        alphas[0] < 0.05 && alphas.at(-1) > 0.95,
        `${variant}: edge spans both themes ${alphas}`
      )
      await page.evaluate(async () => {
        document
          .getAnimations()
          .filter((animation) => animation.effect?.pseudoElement)
          .forEach((animation) => animation.finish())
        await window.latestThemeTransition.finished
        document.querySelector("#theme-fade-probe").remove()
      })
    }
    for (const position of [
      "top left",
      "top right",
      "bottom left",
      "bottom right",
      "center",
    ]) {
      await reveal(`Reveal from the ${position} button`, 700)
    }
    for (const [speed, duration] of [
      ["smooth", 900],
      ["snappy", 500],
      ["instant", 200],
    ]) {
      await page.evaluate((speed) => {
        document.documentElement.dataset.motion = speed
      }, speed)
      await reveal("Try circle blur reveal", duration)
    }
    await page.evaluate(() => {
      document.documentElement.dataset.motion = "default"
    })
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 })
    await reveal("Try diamond reveal", 700, "fractional-scale-during")
    await page.setViewport({ width: 390, height: 844 })
    await reveal("Reveal from the bottom right button", 700, "phone-during")

    // Repeated presses may skip snapshots, but the final theme must win and
    // every owned animation/name must be released before the next press.
    const rapid = await page.evaluate(async () => {
      const button = document.querySelector(
        'button[aria-label="Try circle blur reveal"]'
      )
      const before = button.dataset.theme
      for (let index = 0; index < 5; index++) button.click()
      await window.latestThemeTransition.finished
      return { before, after: button.dataset.theme }
    })
    assert.notEqual(rapid.before, rapid.after)
    const keyboardTheme = await page.$eval(
      'button[aria-label="Try circle blur reveal"]',
      (button) => {
        button.focus()
        return button.dataset.theme
      }
    )
    await page.keyboard.press("Space")
    await page.evaluate(async () => {
      await window.latestThemeTransition.finished
    })
    assert.notEqual(
      await page.$eval(
        'button[aria-label="Try circle blur reveal"]',
        (button) => button.dataset.theme
      ),
      keyboardTheme
    )
    assert.equal(
      await page.$eval(
        'button[aria-label="Try circle blur reveal"]',
        (button) => button === document.activeElement
      ),
      true
    )

    await page.evaluate(() => {
      window.originalCSSSupports = CSS.supports
      CSS.supports = (...arguments_) =>
        arguments_[0] === "mask-composite"
          ? false
          : window.originalCSSSupports(...arguments_)
    })
    await reveal("Try triangle reveal", 700)
    await page.evaluate(() => {
      CSS.supports = window.originalCSSSupports
    })

    for (const mode of ["reduced", "off", "unsupported"]) {
      await page.emulateMediaFeatures([
        {
          name: "prefers-reduced-motion",
          value: mode === "reduced" ? "reduce" : "no-preference",
        },
      ])
      const fallback = await page.evaluate((mode) => {
        document.documentElement.dataset.motion =
          mode === "off" ? "off" : "default"
        if (mode === "unsupported") document.startViewTransition = undefined
        const button = document.querySelector(
          'button[aria-label="Try circle blur reveal"]'
        )
        const before = button.dataset.theme
        const count = window.themeTransitionCount
        button.click()
        return {
          before,
          after: button.dataset.theme,
          count,
          nextCount: window.themeTransitionCount,
        }
      }, mode)
      assert.notEqual(fallback.before, fallback.after)
      assert.equal(fallback.count, fallback.nextCount)
    }
    console.log(
      `${base}: both directions, all reveals, five positions, motion speeds, phone, keyboard focus, rapid clicks and fallbacks passed`
    )
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
