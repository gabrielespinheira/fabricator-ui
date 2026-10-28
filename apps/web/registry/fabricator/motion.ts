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

import type { CssObject } from "@/registry/fabricator/foundations"

export const MOTION_ROLES = [
  // Hover, colour, focus, icon stroke and weight changes.
  "feedback",
  // The Fluid Hover highlight chasing the pointer.
  "glide",
  // Something travelling or resizing on screen: tab indicators, switch
  // thumbs, selection backgrounds, checkmarks, progress, the sidebar.
  "move",
  "tooltip",
  // Menus, selects, comboboxes, popovers, hover cards, navigation menus.
  "popup",
  // Dialogs, alert dialogs and their scrims.
  "dialog",
  // Sheets and drawers.
  "sheet",
  // Accordion and collapsible panels.
  "disclosure",
  "toast",
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
  }
  /** The scale a surface grows from and shrinks to; press is while held. */
  scales: { press: number; tooltip: number; popup: number; dialog: number }
  /** How far tooltips and popups slide from their trigger, in px. */
  travel: { tooltip: number; popup: number }
  /** Blur popups fade through, in px. */
  popupBlur: number
}

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)"
const EASE_IN_OUT_SOFT = "cubic-bezier(0.65, 0, 0.35, 1)"
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
      move: { enter: 360, exit: 260 },
      tooltip: { enter: 200, exit: 140 },
      popup: { enter: 280, exit: 180 },
      dialog: { enter: 380, exit: 240 },
      sheet: { enter: 500, exit: 320 },
      disclosure: { enter: 320, exit: 240 },
      toast: { enter: 450, exit: 300 },
    },
    easings: {
      enter: EASE_OUT_EXPO,
      move: EASE_IN_OUT_SOFT,
      exit: EASE_OUT,
      feedback: EASE,
      drawer: EASE_DRAWER,
    },
    scales: { press: 0.97, tooltip: 0.96, popup: 0.94, dialog: 0.94 },
    travel: { tooltip: 4, popup: 6 },
    popupBlur: 2,
  },
  // Emil Kowalski's timings: tooltips 125ms, popups 180ms, dialogs 250ms.
  default: {
    durations: {
      feedback: { enter: 150, exit: 100 },
      glide: { enter: 150, exit: 100 },
      move: { enter: 250, exit: 180 },
      tooltip: { enter: 125, exit: 90 },
      popup: { enter: 180, exit: 120 },
      dialog: { enter: 250, exit: 180 },
      sheet: { enter: 400, exit: 250 },
      disclosure: { enter: 200, exit: 150 },
      toast: { enter: 350, exit: 220 },
    },
    easings: {
      enter: EASE_OUT,
      move: EASE_IN_OUT,
      exit: EASE_OUT,
      feedback: EASE,
      drawer: EASE_DRAWER,
    },
    scales: { press: 0.97, tooltip: 0.97, popup: 0.95, dialog: 0.95 },
    travel: { tooltip: 0, popup: 0 },
    popupBlur: 0,
  },
  // Apps people use all day: the same shapes, about a quarter quicker and
  // smaller.
  snappy: {
    durations: {
      feedback: { enter: 100, exit: 70 },
      glide: { enter: 110, exit: 80 },
      move: { enter: 180, exit: 130 },
      tooltip: { enter: 100, exit: 70 },
      popup: { enter: 140, exit: 90 },
      dialog: { enter: 180, exit: 120 },
      sheet: { enter: 300, exit: 200 },
      disclosure: { enter: 160, exit: 120 },
      toast: { enter: 260, exit: 180 },
    },
    easings: {
      enter: EASE_OUT,
      move: EASE_IN_OUT,
      exit: EASE_OUT,
      feedback: EASE,
      drawer: EASE_DRAWER,
    },
    scales: { press: 0.98, tooltip: 0.98, popup: 0.97, dialog: 0.97 },
    travel: { tooltip: 0, popup: 0 },
    popupBlur: 0,
  },
  // Dense dashboards and power tools: fades only, no scale or press, tooltips
  // appear at once, and moves end on ease-out so nothing waits to start.
  instant: {
    durations: {
      feedback: { enter: 50, exit: 40 },
      glide: { enter: 70, exit: 50 },
      move: { enter: 120, exit: 90 },
      tooltip: { enter: 0, exit: 0 },
      popup: { enter: 80, exit: 60 },
      dialog: { enter: 100, exit: 80 },
      sheet: { enter: 200, exit: 150 },
      disclosure: { enter: 100, exit: 80 },
      toast: { enter: 180, exit: 120 },
    },
    easings: {
      enter: EASE_OUT,
      move: EASE_OUT,
      exit: EASE_OUT,
      feedback: EASE,
      drawer: EASE_DRAWER,
    },
    scales: { press: 1, tooltip: 1, popup: 1, dialog: 1 },
    travel: { tooltip: 0, popup: 0 },
    popupBlur: 0,
  },
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
    "motion-press-scale": String(speed.scales.press),
    "motion-tooltip-scale": String(speed.scales.tooltip),
    "motion-popup-scale": String(speed.scales.popup),
    "motion-dialog-scale": String(speed.scales.dialog),
    "motion-tooltip-travel": toPx(speed.travel.tooltip),
    "motion-popup-travel": toPx(speed.travel.popup),
    "motion-popup-blur": toPx(speed.popupBlur),
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
 * the `ease-enter|move|exit|feedback|drawer` curves. They resolve where they
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
  // The old spring curves, now the entrance curve.
  "ease-spring": "var(--motion-ease-enter)",
  "ease-spring-bounce": "var(--motion-ease-enter)",
}

// A surface is leaving while it has data-closed (Base UI), data-state=closed
// (Radix), data-exiting (React Aria) or data-ending-style (Base UI
// transitions).
const LEAVING =
  '&:where([data-closed], [data-state="closed"], [data-exiting], [data-ending-style])'

// Tailwind's `transition*` utilities and tw-animate's `animate-in`/`-out`
// both read --tw-duration and --tw-ease, so one utility times either.
function timing(role: MotionRole, ease = "var(--motion-ease-enter)") {
  return {
    "--tw-duration": scaled(role),
    "--tw-ease": ease,
    [LEAVING]: {
      "--tw-duration": scaled(`${role}-exit`),
      "--tw-ease":
        ease === "var(--motion-ease-drawer)" ? ease : "var(--motion-ease-exit)",
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
