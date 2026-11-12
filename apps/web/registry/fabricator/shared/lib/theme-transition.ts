import {
  getThemeToggleDuration,
  getThemeToggleFrames,
  getThemeToggleMask,
  THEME_TOGGLE_PROGRESS,
  type ThemeToggleStart,
  type ThemeToggleVariant,
} from "@/registry/bases/__base__/lib/theme-toggle-model"

const ICON_NAME = "fabricator-theme-toggle-icon"
let active:
  | { transition: ViewTransition; id: symbol; cleanup: () => void }
  | undefined

/** Browser adapter. A newer request owns both the update and its snapshots. */
export function runThemeTransition({
  update,
  variant = "circle-blur",
  start = "trigger",
  element = document.documentElement,
}: {
  update: () => void
  variant?: ThemeToggleVariant
  start?: ThemeToggleStart
  element?: Element
}) {
  active?.transition.skipTransition()
  active?.cleanup()
  const id = Symbol()
  const root = document.documentElement
  const style = getComputedStyle(element)
  const scale = Number.parseFloat(style.getPropertyValue("--motion-scale"))
  const multiplier = Number.isFinite(scale) ? scale : 1
  const duration = getThemeToggleDuration(
    style.getPropertyValue("--motion-theme"),
    multiplier
  )
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
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
    if (icon) icon.style.viewTransitionName = previousName
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
