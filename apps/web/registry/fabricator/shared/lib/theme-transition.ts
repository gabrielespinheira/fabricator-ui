import {
  getThemeToggleDuration,
  getThemeToggleFrames,
  getThemeToggleMask,
  THEME_TOGGLE_PROGRESS,
  type ThemeToggleStart,
  type ThemeToggleVariant,
} from "@/registry/bases/__base__/lib/theme-toggle-model"

const ICON_NAME = "fabricator-theme-toggle-icon"
const LAYER_NAME = "fabricator-theme-layer"
let active:
  | { transition: ViewTransition; id: symbol; cleanup: () => void }
  | undefined

function getMotionScale(style: CSSStyleDeclaration) {
  const scale = Number.parseFloat(style.getPropertyValue("--motion-scale"))
  return Number.isFinite(scale) ? scale : 1
}

function hasReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isClickable(element: Element): element is HTMLElement {
  return "click" in element
}

function isInside(element: Element, { clientX: x, clientY: y }: MouseEvent) {
  const { left, top, width, height } = element.getBoundingClientRect()
  return x >= left && x <= left + width && y >= top && y <= top + height
}

// Browsers send every press on a captured page to <html>: the control would miss
// the next pick, and a popup around it would close as if pressed outside. Takes
// the presses over the control and clicks what they are on.
function forwardPresses(control: HTMLElement) {
  const controller = new AbortController()
  const options = { capture: true, signal: controller.signal }
  let isPressed = false
  let isDone = false
  const onPointerDown = (event: PointerEvent) => {
    if (!event.isTrusted) return
    isPressed = isInside(control, event)
    if (!isPressed) return
    event.stopImmediatePropagation()
    event.preventDefault()
  }
  const onClick = (event: MouseEvent) => {
    if (!isPressed || !event.isTrusted) return
    isPressed = false
    if (isDone) controller.abort()
    event.stopImmediatePropagation()
    const parts = control.matches("button, [role=button]")
      ? [control]
      : Array.from(
          control.querySelectorAll<HTMLElement>("button, [role^=menuitem]")
        )
    parts.find((part) => isInside(part, event))?.click()
  }
  const swallow = (event: Event) => {
    if (isPressed && event.isTrusted) event.stopImmediatePropagation()
  }
  window.addEventListener("pointerdown", onPointerDown, options)
  window.addEventListener("click", onClick, options)
  for (const type of [
    "mousedown",
    "touchstart",
    "pointerup",
    "mouseup",
    "touchend",
  ])
    window.addEventListener(type, swallow, options)
  return () => {
    isDone = true
    if (!isPressed) controller.abort()
  }
}

/** Browser adapter. A newer request owns both the update and its snapshots. */
export function runThemeTransition({
  update,
  variant = "circle-blur",
  start = "trigger",
  element = document.documentElement,
  layer,
}: {
  update: () => void
  variant?: ThemeToggleVariant
  start?: ThemeToggleStart
  element?: Element
  /** Keeps its own snapshot above the reveal, so its content stays sharp. */
  layer?: HTMLElement
}) {
  active?.transition.skipTransition()
  active?.cleanup()
  const id = Symbol()
  const root = document.documentElement
  const style = getComputedStyle(element)
  const multiplier = getMotionScale(style)
  const duration = getThemeToggleDuration(
    style.getPropertyValue("--motion-theme"),
    multiplier
  )
  if (
    hasReducedMotion() ||
    duration === 0 ||
    typeof document.startViewTransition !== "function"
  ) {
    update()
    return
  }
  // Measure at activation, in viewport coordinates: scrolling and moving the
  // trigger must never leave a cached origin behind.
  const rectangle =
    element === root ? undefined : element.getBoundingClientRect()
  const frames = getThemeToggleFrames(
    variant,
    start,
    window.innerWidth,
    window.innerHeight,
    rectangle
  )
  const mask =
    typeof CSS !== "undefined" &&
    typeof CSS.registerProperty === "function" &&
    CSS.supports("mask-composite", "intersect")
      ? getThemeToggleMask(
          variant,
          start,
          window.innerWidth,
          window.innerHeight,
          rectangle
        )
      : null
  const pageFrames = mask
    ? [{ [THEME_TOGGLE_PROGRESS]: "0" }, { [THEME_TOGGLE_PROGRESS]: "1" }]
    : frames
  const pageStyle = mask
    ? `mask-image: ${mask.image}; mask-composite: ${mask.composite}; mask-mode: alpha; mask-repeat: no-repeat; mask-size: 100% 100%;`
    : `clip-path: ${frames[0]?.clipPath};`
  const icon =
    element === root
      ? null
      : element.querySelector<HTMLElement>('[data-slot="theme-toggle-icon"]')
  const previousName = icon?.style.viewTransitionName ?? ""
  if (icon) icon.style.viewTransitionName = ICON_NAME
  const previousLayerName = layer?.style.viewTransitionName ?? ""
  if (layer) layer.style.viewTransitionName = LAYER_NAME
  const layerDuration = getThemeToggleDuration(
    style.getPropertyValue("--motion-feedback"),
    multiplier
  )
  const control = layer ?? element
  const stopForwarding =
    control !== root && isClickable(control)
      ? forwardPresses(control)
      : undefined
  const stylesheet = document.createElement("style")
  stylesheet.textContent = `
    @property ${THEME_TOGGLE_PROGRESS} { syntax: "<number>"; inherits: false; initial-value: 0; }
    ::view-transition { pointer-events: none; }
    ::view-transition-group(root) { animation: none; z-index: 0; }
    ::view-transition-old(root), ::view-transition-new(root),
    ::view-transition-old(${ICON_NAME}), ::view-transition-new(${ICON_NAME}) { animation: none; mix-blend-mode: normal; }
    ::view-transition-old(root) { z-index: 1; }
    ::view-transition-new(root) { z-index: 2; ${pageStyle} }
    ::view-transition-group(${ICON_NAME}) { animation: none; z-index: 1; }
    ::view-transition-group(${LAYER_NAME}) { animation: none; z-index: 1; }
    ::view-transition-old(${LAYER_NAME}), ::view-transition-new(${LAYER_NAME}) { animation-duration: ${layerDuration}ms; animation-fill-mode: both; }
    [data-slot="theme-toggle-icon"] * { transition: none !important; }
  `
  document.head.appendChild(stylesheet)
  const animations: Animation[] = []
  const animate = (frames: Keyframe[], options: KeyframeAnimationOptions) => {
    animations.push(root.animate(frames, options))
  }
  let isCleaned = false
  const cleanup = () => {
    if (isCleaned) return
    isCleaned = true
    animations.forEach((animation) => animation.cancel())
    stylesheet.remove()
    stopForwarding?.()
    if (icon) icon.style.viewTransitionName = previousName
    if (layer) layer.style.viewTransitionName = previousLayerName
    if (active?.id === id) active = undefined
  }
  const transition = document.startViewTransition(() => {
    if (active?.id === id) update()
  })
  active = { transition, id, cleanup }
  void transition.ready.then(
    () => {
      if (active?.id !== id) return
      animate(pageFrames, {
        duration,
        easing: style.getPropertyValue("--motion-ease-theme").trim(),
        pseudoElement: "::view-transition-new(root)",
        fill: "both",
      })
      if (!icon) return
      const iconTiming = {
        duration: getThemeToggleDuration(
          style.getPropertyValue("--motion-move"),
          multiplier
        ),
        easing:
          style.getPropertyValue("--motion-ease-enter").trim() ||
          style.getPropertyValue("--motion-ease-drawer").trim(),
        fill: "both",
      } satisfies KeyframeAnimationOptions
      animate(
        [
          {
            opacity: 1,
            transform: "scale(1) rotate(0deg)",
            filter: "blur(0px)",
          },
          {
            opacity: 0,
            transform: "scale(0.25) rotate(-45deg)",
            filter: "blur(2px)",
          },
        ],
        { ...iconTiming, pseudoElement: `::view-transition-old(${ICON_NAME})` }
      )
      animate(
        [
          {
            opacity: 0,
            transform: "scale(0.25) rotate(45deg)",
            filter: "blur(2px)",
          },
          {
            opacity: 1,
            transform: "scale(1) rotate(0deg)",
            filter: "blur(0px)",
          },
        ],
        { ...iconTiming, pseudoElement: `::view-transition-new(${ICON_NAME})` }
      )
    },
    () => {
      // Skips and failed snapshot captures reject ready; the update still runs.
    }
  )
  void transition.finished.then(cleanup, cleanup)
}

/**
 * Slides the tabs' pill (their `::after`) in from where it was. An animation, as
 * theme providers switch transitions off while they change the theme; added to
 * one still running, so quick presses don't jump.
 */
export function slideThemeTabs(tabs: Element, from: number) {
  const style = getComputedStyle(tabs)
  const duration = getThemeToggleDuration(
    style.getPropertyValue("--motion-move"),
    getMotionScale(style)
  )
  if (hasReducedMotion() || !(duration > 0)) return
  tabs.animate(
    [{ transform: `translateX(${from}px)` }, { transform: "translateX(0px)" }],
    {
      duration,
      easing: style.getPropertyValue("--motion-ease-move").trim() || "ease",
      pseudoElement: "::after",
      composite: "add",
    }
  )
}
