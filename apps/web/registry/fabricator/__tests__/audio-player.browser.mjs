// Audio Player in a real browser, on every base: play and pause, the
// keyboard, the speed button, seeking on the waveform, the error state, and
// reduced motion stopping the waveform's rise and the equalizer.
//
// Run with the dev server up: node registry/fabricator/__tests__/audio-player.browser.mjs
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
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
})

const PLAYER = '[data-slot="audio-player"]'
const SEEK = '[data-slot="audio-player-seek"]'

const status = (page) => page.$eval(PLAYER, (player) => player.dataset.status)
const audioTime = (page) =>
  page.$eval(`${PLAYER} audio`, (audio) => audio.currentTime)
const waitForStatus = (page, value) =>
  page.waitForFunction(
    (selector, expected) =>
      document.querySelector(selector)?.getAttribute("data-status") ===
      expected,
    {},
    PLAYER,
    value
  )

try {
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewport({ width: 900, height: 700 })

  for (const base of ["base", "radix", "aria"]) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "no-preference" },
    ])
    await page.goto(
      `${baseUrl}/examples/${base}-fabricator/audio-player-demo`,
      {
        waitUntil: "networkidle2",
      }
    )
    await page.waitForFunction(
      (selector) =>
        Number.isFinite(document.querySelector(`${selector} audio`)?.duration),
      {},
      PLAYER
    )
    assert.equal(await status(page), "idle", `${base}: starts idle`)

    // The waveform fills the track and its bars rise in.
    const waveform = await page.$$eval(
      '[data-layer="track"] [data-slot="audio-player-waveform-bar"]',
      (bars) => ({
        count: bars.length,
        animation: getComputedStyle(bars[0]).animationName,
      })
    )
    assert.ok(waveform.count > 40, `${base}: ${waveform.count} bars`)
    assert.equal(waveform.animation, "fabricator-audio-player-rise", base)

    // Play swaps the icon and starts the equalizer.
    await page.click('[data-slot="audio-player-play"]')
    await waitForStatus(page, "playing")
    assert.equal(
      await page
        .$eval('[data-slot="audio-player-play"]', (button) => [
          button.dataset.icon,
          button.getAttribute("aria-label"),
        ])
        .then((value) => value.join(" ")),
      "pause Pause",
      base
    )
    assert.equal(
      await page.$eval(
        '[data-slot="audio-player-equalizer-bar"]',
        (bar) => getComputedStyle(bar).animationPlayState
      ),
      "running",
      `${base}: equalizer bounces while playing`
    )
    assert.equal(
      await page.$eval('[data-slot="audio-player-artwork"]', (artwork) =>
        artwork.hasAttribute("data-playing")
      ),
      true,
      `${base}: artwork grows while playing`
    )

    // K pauses, from anywhere in the player.
    await page.focus(SEEK)
    await page.keyboard.press("k")
    await waitForStatus(page, "paused")

    // L skips forward 10 seconds; the seek slider's ArrowLeft goes back 5.
    const before = await audioTime(page)
    await page.keyboard.press("l")
    assert.ok(
      Math.abs((await audioTime(page)) - before - 10) < 0.5,
      `${base}: L skips 10 seconds`
    )
    await page.keyboard.press("ArrowLeft")
    assert.ok(
      Math.abs((await audioTime(page)) - before - 5) < 0.5,
      `${base}: ← goes back 5 seconds`
    )

    // F and C are left to the page.
    const fullscreenKey = await page.$eval(SEEK, (seek) => {
      const event = new KeyboardEvent("keydown", {
        key: "f",
        bubbles: true,
        cancelable: true,
      })
      seek.dispatchEvent(event)
      return event.defaultPrevented
    })
    assert.equal(fullscreenKey, false, `${base}: F isn't taken`)

    // The speed button steps through the speeds and wraps.
    const speed = '[data-slot="audio-player-control"][data-control="speed"]'
    const rates = []
    for (let step = 0; step < 5; step++) {
      await page.click(speed)
      rates.push(
        await page.$eval(`${PLAYER} audio`, (audio) => audio.playbackRate)
      )
    }
    assert.deepEqual(rates, [1.25, 1.5, 2, 0.75, 1], base)

    // A press on the waveform seeks there.
    const box = await (await page.$(SEEK)).boundingBox()
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2)
    const duration = await page.$eval(
      `${PLAYER} audio`,
      (audio) => audio.duration
    )
    assert.ok(
      Math.abs((await audioTime(page)) - duration / 2) < 1,
      `${base}: a press seeks to the middle`
    )
    assert.equal(
      await page.$eval(SEEK, (seek) => seek.getAttribute("aria-valuenow")),
      String(Math.round(duration / 2)),
      base
    )

    // A source that fails shows its message and turns the controls off.
    await page.goto(
      `${baseUrl}/examples/${base}-fabricator/audio-player-error`,
      { waitUntil: "networkidle2" }
    )
    await waitForStatus(page, "error")
    assert.equal(
      await page.$eval(
        '[role="alert"][data-slot="audio-player-error"]',
        (alert) => alert.textContent
      ),
      "This audio can't be played.",
      base
    )
    assert.equal(
      await page.$eval('[data-slot="audio-player-play"]', (b) => b.disabled),
      true,
      `${base}: play is off`
    )

    // Reduced motion: no rise, no bounce.
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ])
    await page.goto(
      `${baseUrl}/examples/${base}-fabricator/audio-player-cover`,
      {
        waitUntil: "networkidle2",
      }
    )
    await page.waitForSelector('[data-slot="audio-player-waveform-bar"]')
    assert.deepEqual(
      await page.evaluate(() =>
        [
          '[data-slot="audio-player-waveform-bar"]',
          '[data-slot="audio-player-equalizer-bar"]',
        ].map(
          (selector) =>
            getComputedStyle(document.querySelector(selector)).animationName
        )
      ),
      ["none", "none"],
      `${base}: reduced motion`
    )
  }

  assert.deepEqual(errors, [])
  console.log("Audio Player: every check passed on base, radix and aria.")
} finally {
  await browser.close()
}
