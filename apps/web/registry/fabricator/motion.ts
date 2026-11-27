// Fabricator motion: what moves, how fast, and on which curve.
//
// Every animation belongs to a role (feedback, move, tooltip, popup, …) and
// reads that role's tokens, never milliseconds. Four speeds set the tokens,
// from smooth (marketing sites) to instant (dense dashboards). Default is the
// one in :root; `data-motion="<speed>"` on <html> or on any element switches
// everything inside it, and `data-motion="off"` stops it. `--motion-scale`
// still multiplies every duration on top.
//
// The default speed follows Emil Kowalski's guidance: strong ease-out for
// anything that enters or leaves, ease-in-out for things that move on screen,
// exits quicker than entrances, popups that grow from their trigger, a 0.97
// press, tooltips that skip their animation once one is open, and nothing
// under 0.9 scale.

import type { CssObject } from "@/registry/fabricator/css-object"
import {
  getCriticalSpring,
  retimeSpring,
  sampleSpring,
  type SpringConfig,
} from "@/registry/fabricator/shared/lib/spring-model"

export const MOTION_ROLES = [
  // Hover, colour, focus, icon stroke and weight changes.
  "feedback",
  // The Fluid Hover highlight chasing the pointer.
  "glide",
  // Something travelling or resizing on screen: tab indicators, switch
  // thumbs, selection backgrounds, checkmarks, progress, the sidebar.
  "move",
  // A full-viewport theme reveal, slower than a control moving.
  "theme",
  "tooltip",
  // Menus, selects, comboboxes, popovers, hover cards, navigation menus.
  "popup",
  // Dialogs, alert dialogs and their scrims.
  "dialog",
  // Sheets and drawers.
  "sheet",
  // Accordion and collapsible panels.
  "disclosure",
  // Layout that springs into place: accordion items opening and parting.
  "bounce",
  // Layout that follows the pointer and springs into place without a visible
  // overshoot: an avatar group parting around the avatar under it.
  "settle",
  "toast",
  // A chart drawing its marks the first time it shows: lines sweeping in,
  // bars growing from the baseline; Text Motion's pieces playing in. Slower
  // than anything else that moves, since the eye follows the data or the
  // words being laid out; none when instant.
  "reveal",
] as const

export type MotionRole = (typeof MOTION_ROLES)[number]

export const MOTION_SPEED_NAMES = [
  "smooth",
  "default",
  "snappy",
  "instant",
] as const

export type MotionSpeedName = (typeof MOTION_SPEED_NAMES)[number]

export const DEFAULT_MOTION_SPEED: MotionSpeedName = "default"

// Springs for what moves under the pointer or can be interrupted: they keep
// their velocity when the target changes, so motion bends instead of
// restarting. Named by job, as "stiffness damping" with mass 1. The default
// speed's values come from the Motion Studies at designbookmark.com/motion.
export const MOTION_SPRING_NAMES = [
  // Something held by the pointer: no overshoot, no lag.
  "follow",
  // Letting go, landing on a value: one small overshoot.
  "settle",
  // Large moves: panels, sheets, a whole component shifting.
  "soft",
  // A stretchy highlight's edge that faces the move.
  "lead",
  // The edge that lags behind it, which makes the stretch.
  "trail",
  // An icon, chip or number popping on select.
  "pop",
  // Opacity and small slides.
  "fade",
] as const

export type MotionSpringName = (typeof MOTION_SPRING_NAMES)[number]

const DEFAULT_SPRINGS: Record<MotionSpringName, SpringConfig> = {
  follow: { stiffness: 900, damping: 50 },
  settle: { stiffness: 280, damping: 22 },
  soft: { stiffness: 260, damping: 24 },
  lead: { stiffness: 620, damping: 36 },
  trail: { stiffness: 190, damping: 19 },
  pop: { stiffness: 520, damping: 16 },
  fade: { stiffness: 420, damping: 32 },
}

// A speed plays the default springs `timeScale` times as long, with the same
// overshoot; `isCritical` takes the overshoot out (instant).
function getSpeedSprings(timeScale: number, isCritical = false) {
  return Object.fromEntries(
    MOTION_SPRING_NAMES.map((name) => {
      const spring = retimeSpring(DEFAULT_SPRINGS[name], timeScale)
      const rounded = {
        stiffness: Math.round(spring.stiffness),
        damping: Math.round(spring.damping * 10) / 10,
      }
      if (!isCritical) return [name, rounded]
      const critical = getCriticalSpring(rounded)
      return [
        name,
        { ...rounded, damping: Math.round(critical.damping * 10) / 10 },
      ]
    })
  ) as Record<MotionSpringName, SpringConfig>
}

type Timing = { enter: number; exit: number }

export type MotionSpeed = {
  /** Milliseconds per role. */
  durations: Record<MotionRole, Timing>
  easings: {
    /** Entering, and the Fluid Hover glide. */
    enter: string
    /** Moving on screen. */
    move: string
    exit: string
    /** Hover and colour changes. */
    feedback: string
    /** Sheets and drawers. */
    drawer: string
    /** Full-page theme reveals. */
    theme: string
  }
  /** The scale a surface grows from and shrinks to; press is while held. */
  scales: { press: number; tooltip: number; popup: number; dialog: number }
  /** How far tooltips and popups slide from their trigger, in px. */
  travel: { tooltip: number; popup: number }
  /** Blur popups fade through, in px. */
  popupBlur: number
  /** How far the bounce role's spring overshoots: 0 settles without it. */
  bounce: number
  /** The settle role's spring: low enough that it never visibly overshoots. */
  settle: number
  /** Springs by job, for motion that follows the pointer or is interrupted. */
  springs: Record<MotionSpringName, SpringConfig>
  /** Milliseconds between items entering one after another. */
  stagger: number
}

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)"
const EASE_IN_OUT_SOFT = "cubic-bezier(0.65, 0, 0.35, 1)"
const EASE_THEME = "cubic-bezier(0.4, 0, 0.2, 1)"
const EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)"
// The iOS sheet curve, as in Vaul.
const EASE_DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)"

export const MOTION_SPEEDS: Record<MotionSpeedName, MotionSpeed> = {
  // Marketing sites and editorial pages: longer, softer, a little travel and
  // blur, so surfaces settle instead of snapping.
  smooth: {
    durations: {
      feedback: { enter: 220, exit: 160 },
      glide: { enter: 220, exit: 160 },
      theme: { enter: 900, exit: 900 },
      move: { enter: 360, exit: 260 },
      tooltip: { enter: 200, exit: 140 },
      popup: { enter: 280, exit: 180 },
      dialog: { enter: 380, exit: 240 },
      sheet: { enter: 500, exit: 320 },
      disclosure: { enter: 320, exit: 240 },
      bounce: { enter: 700, exit: 560 },
      settle: { enter: 460, exit: 460 },
      toast: { enter: 450, exit: 300 },
      reveal: { enter: 1000, exit: 600 },
    },
    easings: {
      enter: EASE_OUT_EXPO,
      move: EASE_IN_OUT_SOFT,
      exit: EASE_OUT,
      feedback: EASE,
      drawer: EASE_DRAWER,
      theme: EASE_THEME,
    },
    scales: { press: 0.97, tooltip: 0.96, popup: 0.94, dialog: 0.94 },
    travel: { tooltip: 4, popup: 6 },
    popupBlur: 2,
    bounce: 0.3,
    settle: 0.16,
    springs: getSpeedSprings(1.3),
    stagger: 55,
  },
  // Emil Kowalski's timings: tooltips 125ms, popups 180ms, dialogs 250ms.
  default: {
    durations: {
      feedback: { enter: 150, exit: 100 },
      glide: { enter: 150, exit: 100 },
      theme: { enter: 700, exit: 700 },
      move: { enter: 250, exit: 180 },
      tooltip: { enter: 125, exit: 90 },
      popup: { enter: 180, exit: 120 },
      dialog: { enter: 250, exit: 180 },
      sheet: { enter: 400, exit: 250 },
      disclosure: { enter: 200, exit: 150 },
      bounce: { enter: 600, exit: 480 },
      settle: { enter: 380, exit: 380 },
      toast: { enter: 350, exit: 220 },
      reveal: { enter: 700, exit: 450 },
    },
    easings: {
      enter: EASE_OUT,
      move: EASE_IN_OUT,
      exit: EASE_OUT,
      feedback: EASE,
      drawer: EASE_DRAWER,
      theme: EASE_THEME,
    },
    scales: { press: 0.97, tooltip: 0.97, popup: 0.95, dialog: 0.95 },
    travel: { tooltip: 0, popup: 0 },
    popupBlur: 0,
    bounce: 0.35,
    // A damping ratio of 0.84, as in beUI's avatar group.
    settle: 0.16,
    springs: getSpeedSprings(1),
    stagger: 45,
  },
  // Apps people use all day: the same shapes, about a quarter quicker and
  // smaller.
  snappy: {
    durations: {
      feedback: { enter: 100, exit: 70 },
      glide: { enter: 110, exit: 80 },
      theme: { enter: 500, exit: 500 },
      move: { enter: 180, exit: 130 },
      tooltip: { enter: 100, exit: 70 },
      popup: { enter: 140, exit: 90 },
      dialog: { enter: 180, exit: 120 },
      sheet: { enter: 300, exit: 200 },
      disclosure: { enter: 160, exit: 120 },
      bounce: { enter: 450, exit: 360 },
      settle: { enter: 300, exit: 300 },
      toast: { enter: 260, exit: 180 },
      reveal: { enter: 480, exit: 320 },
    },
    easings: {
      enter: EASE_OUT,
      move: EASE_IN_OUT,
      exit: EASE_OUT,
      feedback: EASE,
      drawer: EASE_DRAWER,
      theme: EASE_THEME,
    },
    scales: { press: 0.98, tooltip: 0.98, popup: 0.97, dialog: 0.97 },
    travel: { tooltip: 0, popup: 0 },
    popupBlur: 0,
    bounce: 0.25,
    settle: 0.12,
    springs: getSpeedSprings(0.75),
    stagger: 35,
  },
  // Dense dashboards and power tools: fades only, no scale or press, tooltips
  // appear at once, and moves end on ease-out so nothing waits to start.
  instant: {
    durations: {
      feedback: { enter: 50, exit: 40 },
      glide: { enter: 70, exit: 50 },
      theme: { enter: 200, exit: 200 },
      move: { enter: 120, exit: 90 },
      tooltip: { enter: 0, exit: 0 },
      popup: { enter: 80, exit: 60 },
      dialog: { enter: 100, exit: 80 },
      sheet: { enter: 200, exit: 150 },
      disclosure: { enter: 100, exit: 80 },
      bounce: { enter: 120, exit: 90 },
      settle: { enter: 120, exit: 90 },
      toast: { enter: 180, exit: 120 },
      reveal: { enter: 0, exit: 0 },
    },
    easings: {
      enter: EASE_OUT,
      move: EASE_OUT,
      exit: EASE_OUT,
      feedback: EASE,
      drawer: EASE_DRAWER,
      theme: EASE_THEME,
    },
    scales: { press: 1, tooltip: 1, popup: 1, dialog: 1 },
    travel: { tooltip: 0, popup: 0 },
    popupBlur: 0,
    bounce: 0,
    settle: 0,
    springs: getSpeedSprings(0.6, true),
    stagger: 0,
  },
}

// The spring's envelope falls to e^-SETTLE by the end of the curve.
const SPRING_SETTLE = 6
const SPRING_SAMPLES = 60

/**
 * A spring released from 0 towards 1, sampled evenly over its duration: an
 * underdamped oscillator whose damping ratio is `1 - bounce`, stiff enough to
 * settle by the end. The website draws it with CSS `linear()`, native
 * interpolates the same samples, so both bounce alike.
 */
export function getSpringSamples(bounce: number, count = SPRING_SAMPLES) {
  const damping = 1 - bounce
  const frequency = SPRING_SETTLE / damping
  const decay = damping * frequency
  const damped = frequency * Math.sqrt(1 - damping ** 2)
  const at = (time: number) => {
    const envelope = Math.exp(-decay * time)
    if (damped === 0) return 1 - envelope * (1 + frequency * time)
    return (
      1 -
      envelope *
        (Math.cos(damped * time) + (decay / damped) * Math.sin(damped * time))
    )
  }
  return Array.from({ length: count + 1 }, (_, index) => {
    if (index === count) return 1
    return Math.round(at(index / count) * 1000) / 1000
  })
}

/** The spring as a CSS easing. */
export function toSpringEasing(bounce: number) {
  return `linear(${getSpringSamples(bounce).join(", ")})`
}

const toMs = (value: number) => `${value}ms`
const toPx = (value: number) => `${value}px`

/** A speed's tokens, keyed by name without the `--`. */
export function toMotionVars(speed: MotionSpeed): Record<string, string> {
  return {
    ...Object.fromEntries(
      MOTION_ROLES.flatMap((role) => [
        [`motion-${role}`, toMs(speed.durations[role].enter)],
        [`motion-${role}-exit`, toMs(speed.durations[role].exit)],
      ])
    ),
    "motion-ease-enter": speed.easings.enter,
    "motion-ease-move": speed.easings.move,
    "motion-ease-exit": speed.easings.exit,
    "motion-ease-feedback": speed.easings.feedback,
    "motion-ease-drawer": speed.easings.drawer,
    "motion-ease-theme": speed.easings.theme,
    "motion-ease-bounce": toSpringEasing(speed.bounce),
    "motion-ease-settle": toSpringEasing(speed.settle),
    "motion-press-scale": String(speed.scales.press),
    "motion-tooltip-scale": String(speed.scales.tooltip),
    "motion-popup-scale": String(speed.scales.popup),
    "motion-dialog-scale": String(speed.scales.dialog),
    "motion-tooltip-travel": toPx(speed.travel.tooltip),
    "motion-popup-travel": toPx(speed.travel.popup),
    "motion-popup-blur": toPx(speed.popupBlur),
    ...Object.fromEntries(
      MOTION_SPRING_NAMES.flatMap((name) => {
        const spring = speed.springs[name]
        const { duration, samples } = sampleSpring(spring)
        return [
          [`motion-spring-${name}`, `${spring.stiffness} ${spring.damping}`],
          // The same spring for CSS: the time it takes to settle and its
          // curve, for transitions that only start and land.
          [`motion-spring-${name}-duration`, toMs(duration)],
          [`motion-ease-${name}-spring`, `linear(${samples.join(", ")})`],
        ]
      })
    ),
    "motion-stagger": toMs(speed.stagger),
  }
}

/** A role's duration, multiplied by --motion-scale where it is used. */
const scaled = (token: string) =>
  `calc(var(--motion-${token}) * var(--motion-scale, 1))`

// The old three tiers, kept so code written against them still works.
const TIER_ALIASES: Record<string, MotionRole> = {
  fast: "feedback",
  moderate: "move",
  slow: "dialog",
}

const durationKeys = (name: string, role: MotionRole) => [
  [`transition-duration-${name}`, scaled(role)],
  [`transition-duration-${name}-exit`, scaled(`${role}-exit`)],
  [`transition-delay-${name}`, scaled(role)],
]

/**
 * Theme keys: `duration-<role>`, `duration-<role>-exit`, `delay-<role>` and
 * the `ease-enter|move|exit|feedback|drawer|theme` curves. They resolve where they
 * are used, so a speed set on a subtree applies inside it.
 */
export const MOTION_THEME: Record<string, string> = {
  ...Object.fromEntries(
    MOTION_ROLES.flatMap((role) => durationKeys(role, role))
  ),
  ...Object.fromEntries(
    Object.entries(TIER_ALIASES).flatMap(([tier, role]) =>
      durationKeys(tier, role)
    )
  ),
  "ease-enter": "var(--motion-ease-enter)",
  "ease-move": "var(--motion-ease-move)",
  "ease-exit": "var(--motion-ease-exit)",
  "ease-feedback": "var(--motion-ease-feedback)",
  "ease-drawer": "var(--motion-ease-drawer)",
  "ease-theme": "var(--motion-ease-theme)",
  "ease-bounce": "var(--motion-ease-bounce)",
  // Springs as CSS transitions: `duration-pop-spring ease-pop-spring`.
  ...Object.fromEntries(
    MOTION_SPRING_NAMES.flatMap((name) => [
      [`transition-duration-${name}-spring`, scaled(`spring-${name}-duration`)],
      [`ease-${name}-spring`, `var(--motion-ease-${name}-spring)`],
    ])
  ),
  "ease-settle": "var(--motion-ease-settle)",
  // The old spring curves, now the entrance curve.
  "ease-spring": "var(--motion-ease-enter)",
  "ease-spring-bounce": "var(--motion-ease-enter)",
}

// A surface is leaving while it has data-closed (Base UI), data-state=closed
// (Radix), data-exiting (React Aria) or data-ending-style (Base UI
// transitions).
const LEAVING =
  '&:where([data-closed], [data-state="closed"], [data-exiting], [data-ending-style])'

const KEEPS_EASE_ON_EXIT = new Set([
  "var(--motion-ease-drawer)",
  "var(--motion-ease-bounce)",
])

// Tailwind's `transition*` utilities and tw-animate's `animate-in`/`-out`
// both read --tw-duration and --tw-ease, so one utility times either.
function timing(role: MotionRole, ease = "var(--motion-ease-enter)") {
  return {
    "--tw-duration": scaled(role),
    "--tw-ease": ease,
    [LEAVING]: {
      "--tw-duration": scaled(`${role}-exit`),
      // Sheets keep their drawer curve and springs their bounce.
      "--tw-ease": KEEPS_EASE_ON_EXIT.has(ease)
        ? ease
        : "var(--motion-ease-exit)",
    },
  }
}

function scale(token: string) {
  return {
    "--tw-enter-scale": `var(--motion-${token}-scale)`,
    "--tw-exit-scale": `var(--motion-${token}-scale)`,
  }
}

// A slide from the trigger's side: data-side on Base UI and Radix, and
// data-placement on React Aria.
function travel(token: string) {
  const distance = `var(--motion-${token}-travel)`
  return {
    '&:where([data-side="bottom"], [data-placement="bottom"])': {
      "--tw-enter-translate-y": `calc(${distance} * -1)`,
    },
    '&:where([data-side="top"], [data-placement="top"])': {
      "--tw-enter-translate-y": distance,
    },
    '&:where([data-side="right"], [data-side="inline-end"], [data-placement="right"])':
      { "--tw-enter-translate-x": `calc(${distance} * -1)` },
    '&:where([data-side="left"], [data-side="inline-start"], [data-placement="left"])':
      { "--tw-enter-translate-x": distance },
  }
}

const STILL = {
  "--motion-scale": "0",
  "--motion-press-scale": "1",
  "--motion-tooltip-scale": "1",
  "--motion-popup-scale": "1",
  "--motion-dialog-scale": "1",
  "--motion-tooltip-travel": "0px",
  "--motion-popup-travel": "0px",
  "--motion-popup-blur": "0px",
}

const vars = (entries: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(entries).map(([name, value]) => [`--${name}`, value])
  )

/**
 * Speed switches and the motion utilities, in the shape of a registry item's
 * `css` field. The speed selectors are one notch more specific than :root, so
 * they win on <html>, and plain attribute selectors anywhere else.
 */
export const MOTION_CSS: CssObject = {
  ...Object.fromEntries(
    MOTION_SPEED_NAMES.map((name) => [
      `:root[data-motion="${name}"], [data-motion="${name}"]`,
      vars(toMotionVars(MOTION_SPEEDS[name])),
    ])
  ),
  ':root[data-motion="off"], [data-motion="off"]': STILL,
  // Tooltips skip their animation once one is open, or when they open on
  // focus: Base UI marks those with data-instant, Radix with instant-open.
  "@utility motion-tooltip": {
    ...scale("tooltip"),
    ...timing("tooltip"),
    ...travel("tooltip"),
    '&:where([data-instant], [data-state="instant-open"])': {
      "--tw-duration": "0s",
    },
  },
  "@utility motion-popup": {
    ...scale("popup"),
    "--tw-enter-blur": "var(--motion-popup-blur)",
    "--tw-exit-blur": "var(--motion-popup-blur)",
    ...timing("popup"),
    ...travel("popup"),
  },
  // Dialogs grow from the centre; their scrims only fade, on the same time.
  "@utility motion-dialog": { ...scale("dialog"), ...timing("dialog") },
  "@utility motion-scrim": timing("dialog"),
  "@utility motion-sheet": timing("sheet", "var(--motion-ease-drawer)"),
  "@utility motion-disclosure": timing("disclosure"),
  "@utility motion-toast": timing("toast"),
  // Accordion items: heights, gaps and corners spring both ways.
  "@utility motion-bounce": timing("bounce", "var(--motion-ease-bounce)"),
  // A menu's rows entering one after another as it opens: each fades and
  // drops in on the fade spring, --motion-stagger after the row before it, up
  // to the tenth. sibling-index() is the row's place; a browser without it
  // drops the delay and the rows come in together. Reduce Motion skips it.
  "@utility motion-stagger": {
    "@media (prefers-reduced-motion: no-preference)": {
      animation:
        "enter calc(var(--motion-spring-fade-duration) * var(--motion-scale, 1)) var(--motion-ease-fade-spring) both",
      "animation-delay":
        "calc(min(sibling-index() - 1, 10) * var(--motion-stagger) * var(--motion-scale, 1))",
      "--tw-enter-opacity": "0",
      "--tw-enter-translate-y": "calc(var(--spacing) * -1)",
    },
  },
  // Buttons and toggles give a little while held. They already transition
  // every property, `scale` included. Joined groups stay flat.
  "@utility motion-press": {
    '&:active:not(:disabled, [aria-disabled="true"], [data-disabled], :where([data-slot="button-group"], [data-slot="input-group"]) *), &[data-pressed]:not(:where([data-slot="button-group"], [data-slot="input-group"]) *)':
      { scale: "var(--motion-press-scale)" },
  },
}

/** The default speed's tokens, for :root. */
export const MOTION_ROOT_VARS: Record<string, string> = {
  "motion-scale": "1",
  ...toMotionVars(MOTION_SPEEDS[DEFAULT_MOTION_SPEED]),
}
