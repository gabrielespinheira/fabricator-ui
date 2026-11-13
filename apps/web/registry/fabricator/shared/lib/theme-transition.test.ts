import { afterEach, expect, it, vi } from "vitest"

import { runThemeTransition } from "./theme-transition"

const finishTransitions: (() => void)[] = []

function createBrowser({
  reduced = false,
  scale = "1",
  supported = true,
  masks = true,
} = {}) {
  const cancel = vi.fn()
  const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel }))
  const callbacks: (() => void)[] = []
  const styles: { textContent: string; remove: ReturnType<typeof vi.fn> }[] = []
  const transitions: {
    skipTransition: ReturnType<typeof vi.fn>
    ready: Promise<void>
    finished: Promise<void>
  }[] = []
  const icon = { style: { viewTransitionName: "existing-icon-name" } }
  const rectangle = {
    left: 252,
    top: 52,
    width: 36,
    height: 36,
    right: 288,
    bottom: 88,
    x: 252,
    y: 52,
    toJSON: () => ({}),
  }
  const createElement = () => {
    const element = {
      textContent: "",
      remove: vi.fn(),
      style: { viewTransitionName: "" },
      getBoundingClientRect: () => rectangle,
      querySelector: () => icon,
    }
    styles.push(element)
    return element
  }
  const startViewTransition = vi.fn((callback: () => void) => {
    callbacks.push(callback)
    const ready = Promise.withResolvers<void>()
    const finished = Promise.withResolvers<void>()
    const transition = {
      skipTransition: vi.fn(() => {
        ready.reject(new DOMException("Skipped", "AbortError"))
        finished.resolve()
      }),
      ready: ready.promise,
      finished: finished.promise,
    }
    transitions.push(transition)
    finishTransitions.push(() => {
      ready.resolve()
      finished.resolve()
    })
    return transition
  })
  const root = { animate }
  vi.stubGlobal("document", {
    documentElement: root,
    head: { appendChild: vi.fn() },
    createElement,
    startViewTransition: supported ? startViewTransition : undefined,
  })
  vi.stubGlobal("CSS", { registerProperty: () => {}, supports: () => masks })
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: reduced }),
    innerWidth: 400,
    innerHeight: 800,
  })
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) =>
      ({
        "--motion-scale": scale,
        "--motion-theme": "0.7s",
        "--motion-move": "0.25s",
        "--motion-ease-drawer": "ease-out",
        "--motion-ease-theme": "cubic-bezier(0.4, 0, 0.2, 1)",
      })[name] ?? "",
  }))
  return {
    animate,
    cancel,
    callbacks,
    startViewTransition,
    transitions,
    styles,
    icon,
    rectangle,
  }
}

afterEach(async () => {
  finishTransitions.splice(0).forEach((finish) => finish())
  await Promise.resolve()
  vi.unstubAllGlobals()
})

it.each([{ reduced: true }, { scale: "0" }, { supported: false }])(
  "changes theme immediately when motion cannot run: %j",
  (options) => {
    const browser = createBrowser(options)
    const update = vi.fn()
    runThemeTransition({ update })
    expect(update).toHaveBeenCalledOnce()
    expect(browser.startViewTransition).not.toHaveBeenCalled()
  }
)

it("measures the clicked button and uses page-reveal timing", async () => {
  const browser = createBrowser()
  const update = vi.fn()
  const element = document.createElement("button")
  runThemeTransition({ update, variant: "circle-blur", element })
  browser.callbacks[0]?.()
  finishTransitions[0]?.()
  await Promise.resolve()
  expect(update).toHaveBeenCalledOnce()
  expect(browser.animate).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({
        clipPath: "circle(0% at 67.5% 8.75%)",
        filter: "blur(8px)",
      }),
    ]),
    expect.objectContaining({
      duration: 700,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      pseudoElement: "::view-transition-new(root)",
    })
  )
  expect(browser.styles.at(-1)?.textContent).toContain("at 67.5% 8.75%")
  expect(browser.styles.at(-1)?.textContent).not.toContain("mask-image:")
  expect(browser.styles.at(-1)?.textContent).not.toContain("filter:")
})

it("keeps a sharp polygon reveal when alpha masks cannot animate", async () => {
  const browser = createBrowser({ masks: false })
  runThemeTransition({
    variant: "rectangle",
    update: vi.fn(),
    element: document.createElement("button"),
  })
  finishTransitions[0]?.()
  await Promise.resolve()
  expect(browser.animate).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({
        clipPath: "inset(70px 130px 730px 270px)",
        opacity: 0,
      }),
    ]),
    expect.objectContaining({ pseudoElement: "::view-transition-new(root)" })
  )
  expect(browser.styles.at(-1)?.textContent).toContain(
    "clip-path: inset(70px 130px 730px 270px)"
  )
})

it("morphs the icon on a separate snapshot layer and restores its name", async () => {
  const browser = createBrowser()
  runThemeTransition({
    update: vi.fn(),
    element: document.createElement("button"),
  })
  expect(browser.icon.style.viewTransitionName).toBe(
    "fabricator-theme-toggle-icon"
  )
  finishTransitions[0]?.()
  await Promise.resolve()
  expect(browser.animate).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      duration: 250,
      pseudoElement: "::view-transition-new(fabricator-theme-toggle-icon)",
    })
  )
  expect(browser.icon.style.viewTransitionName).toBe("existing-icon-name")
  expect(browser.styles.at(-1)?.remove).toHaveBeenCalledOnce()
  expect(browser.cancel).toHaveBeenCalledTimes(3)
})

it("a rapid second press supersedes a pending update and releases the old icon name", () => {
  const browser = createBrowser()
  const first = vi.fn()
  const latest = vi.fn()
  runThemeTransition({
    update: first,
    element: document.createElement("button"),
  })
  runThemeTransition({ update: latest })
  browser.callbacks.forEach((callback) => callback())
  expect(browser.transitions[0]?.skipTransition).toHaveBeenCalledOnce()
  expect(browser.icon.style.viewTransitionName).toBe("existing-icon-name")
  expect(first).not.toHaveBeenCalled()
  expect(latest).toHaveBeenCalledOnce()
})

it("keeps polygon edge masks independent of circle-blur", async () => {
  const browser = createBrowser()
  runThemeTransition({ update: vi.fn(), variant: "diamond" })
  finishTransitions[0]?.()
  await Promise.resolve()
  expect(browser.animate).toHaveBeenCalledWith(
    [
      { "--fabricator-theme-progress": "0" },
      { "--fabricator-theme-progress": "1" },
    ],
    expect.objectContaining({ pseudoElement: "::view-transition-new(root)" })
  )
  expect(browser.styles.at(-1)?.textContent).toContain(
    "mask-image: linear-gradient"
  )
})
