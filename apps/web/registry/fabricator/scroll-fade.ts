// Fabricator scroll fades: content dissolves at a scroller's edge, or past a
// sticky or fixed element, instead of being cut at a line.
//
// `scroll-fade` and its edge utilities come from shadcn/tailwind.css as a
// two-stop linear mask that grows in as you scroll. A linear ramp shows a
// line where it meets the solid content, and a growing one starts as a hard
// edge. These redefine the same utilities with an eased ramp at full depth
// that strengthens as you scroll, so the fade never shows where it starts or
// ends. Every upstream name and variable keeps its meaning (`--scroll-fade-
// size`, `--scroll-fade-{t,b,s,e}-size`, `--scroll-fade-reveal`,
// `--scroll-fade-mask`, `scroll-fade-none`); Tailwind emits a redefined
// utility after the upstream one, so these win.
//
// Two additions:
// - `scroll-fade-inset-{t,b,s,e}-<n>` starts an edge's fade past a sticky
//   header, footer or column inside the scroller, so the sticky part stays
//   solid and content fades as it reaches it.
// - `sticky-fade-{t,b,s,e}` is for a sticky or fixed element over a scroller
//   that can't be masked (the page itself): past its edge it paints its own
//   background colour (`background-color: inherit`), eased the same way,
//   while content is scrolled under it. A fade in any other colour reads as
//   a dark or light band, so it takes whatever surface the element is.
// - `surface-fade-{t,b,s,e}` paints the same fade as an element's own
//   background: `--surface-fade-color`, solid at that edge, eased to clear
//   over its last `--surface-fade-size`, with `--surface-fade-wash` (a row's
//   hover or selection) on top. A pinned cell uses it so rows scrolling under
//   it show through its far padding and a lit row stays lit. It is painted,
//   not masked: a mask on every pinned cell of every row recomposites each
//   frame and made a fast scroll outrun the rows.

import type { CssObject } from "@/registry/fabricator/css-object"

/** One stop of the fade: where along it (0 edge, 1 content), how visible. */
export type FadeStop = { position: number; alpha: number }

// Enough samples that the ramp shows no steps.
const FADE_SAMPLES = 8

/**
 * The fade's curve, smoothstep: flat at both ends, so the edge melts away and
 * the content starts without a line. The native fades sample the same curve.
 */
export function getFadeRamp(samples = FADE_SAMPLES): FadeStop[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const position = index / samples
    const alpha = position * position * (3 - 2 * position)
    return { position, alpha: Number(alpha.toFixed(3)) }
  })
}

type Edge = "t" | "b" | "s" | "e"

// 16% of the scroller, at most 56px: an eased ramp needs more room than a
// linear one to read as soft, and tall scrollers stay calm.
const DEFAULT_SIZE = "min(16%, calc(var(--spacing) * 14))"
// Full strength once a fade's worth of content has scrolled past the edge.
const REVEAL = "var(--scroll-fade-reveal, calc(var(--spacing) * 16))"

const size = (edge: Edge) =>
  `var(--scroll-fade-${edge}-size, var(--scroll-fade-size, ${DEFAULT_SIZE}))`
const inset = (edge: Edge) => `var(--scroll-fade-${edge}-inset, 0px)`
const strength = (edge: Edge) => `--scroll-fade-${edge}-strength`
const isStart = (edge: Edge) => edge === "t" || edge === "s"

/**
 * One edge's mask layer, drawn from that edge inward: solid over the inset,
 * then the eased ramp, scaled by the edge's strength (0 none, 1 full).
 */
function toMaskLayer(edge: Edge, direction: string) {
  const ramp = getFadeRamp().map(({ position, alpha }) => {
    const at = `calc(${inset(edge)} + var(--_scroll-fade-size-${edge}) * ${position})`
    if (alpha === 1) return `#000 ${at}`
    const hidden = Number((1 - alpha).toFixed(3))
    return `rgb(0 0 0 / calc(1 - var(${strength(edge)}) * ${hidden})) ${at}`
  })
  return `linear-gradient(${direction}, #000 0 ${inset(edge)}, ${ramp.join(", ")})`
}

// Start edges strengthen as you leave the start; end edges weaken as you
// reach the end. The curves mirror each other, so both edges track how much
// content is past them.
function toAnimation(edge: Edge) {
  return `fabricator-scroll-fade-${edge} 1ms ${isStart(edge) ? "ease-out" : "ease-in"}`
}

function toRange(edge: Edge) {
  return isStart(edge) ? `0 ${REVEAL}` : `calc(100% - ${REVEAL}) 100%`
}

type Layer = { edge: Edge; direction: string; rtlDirection?: string }

const LAYERS = {
  t: { edge: "t", direction: "to bottom" },
  b: { edge: "b", direction: "to top" },
  l: { edge: "s", direction: "to right" },
  r: { edge: "e", direction: "to left" },
  s: { edge: "s", direction: "to right", rtlDirection: "to left" },
  e: { edge: "e", direction: "to left", rtlDirection: "to right" },
} satisfies Record<string, Layer>

/**
 * A fade utility: its layers go into `variable`, which the mask reads
 * (behind `--scroll-fade-mask` for the two-edge ones, so `scroll-fade-none`
 * still turns them off), and each layer's edge animates on `timeline`.
 */
function toFadeUtility(
  layers: Layer[],
  variable: string,
  timeline: string
): CssObject {
  const image =
    variable === "--scroll-fade-mask"
      ? "var(--scroll-fade-mask)"
      : `var(--scroll-fade-mask, var(${variable}))`
  const isMirrored = layers.some((layer) => layer.rtlDirection)
  return {
    ...Object.fromEntries(
      layers.map(({ edge }) => [`--_scroll-fade-size-${edge}`, size(edge)])
    ),
    [variable]: layers
      .map(({ edge, direction }) => toMaskLayer(edge, direction))
      .join(", "),
    ...(isMirrored && {
      '&:where([dir="rtl"], [dir="rtl"] *)': {
        [variable]: layers
          .map(({ edge, direction, rtlDirection }) =>
            toMaskLayer(edge, rtlDirection ?? direction)
          )
          .join(", "),
      },
    }),
    "-webkit-mask-image": image,
    "mask-image": image,
    "-webkit-mask-composite": "source-in",
    "mask-composite": "intersect",
    "-webkit-mask-repeat": "no-repeat",
    "mask-repeat": "no-repeat",
    "@supports (animation-timeline: scroll())": {
      animation: layers.map(({ edge }) => toAnimation(edge)).join(", "),
      "animation-timeline": layers.map(() => timeline).join(", "),
      "animation-range": layers.map(({ edge }) => toRange(edge)).join(", "),
      "animation-fill-mode": "both",
    },
    // Without scroll-driven animations, a static fade on every edge.
    "@supports not (animation-timeline: scroll())": Object.fromEntries(
      layers.map(({ edge }) => [strength(edge), "1"])
    ),
  }
}

const EDGES: Edge[] = ["t", "b", "s", "e"]

// A mask, solid at the start of `direction` and eased to clear.
function toEdgeMask(direction: string) {
  const stops = getFadeRamp().map(({ position, alpha }) => {
    const shown = Number((1 - alpha).toFixed(3))
    return `rgb(0 0 0 / ${shown}) ${position * 100}%`
  })
  return `linear-gradient(${direction}, ${stops.join(", ")})`
}

const STICKY_SIZE = "var(--sticky-fade-size, calc(var(--spacing) * 10))"

type StickyEdge = {
  /** Where the fade sits, against the element's edge. */
  place: Record<string, string>
  direction: string
  rtlDirection?: string
  axis: "block" | "inline"
  /** The fade shows once you leave the scroller's start (or until its end). */
  showsFrom: "start" | "end"
}

const STICKY_EDGES: Record<Edge, StickyEdge> = {
  // A header: content scrolls up into it once you leave the top.
  b: {
    place: { top: "100%", "inset-inline": "0", height: STICKY_SIZE },
    direction: "to bottom",
    axis: "block",
    showsFrom: "start",
  },
  // A footer or composer: content scrolls down into it until the end.
  t: {
    place: { bottom: "100%", "inset-inline": "0", height: STICKY_SIZE },
    direction: "to top",
    axis: "block",
    showsFrom: "end",
  },
  // A column pinned to the start: content scrolls into its end side.
  e: {
    place: {
      "inset-inline-start": "100%",
      "inset-block": "0",
      width: STICKY_SIZE,
    },
    direction: "to right",
    rtlDirection: "to left",
    axis: "inline",
    showsFrom: "start",
  },
  // A column pinned to the end.
  s: {
    place: {
      "inset-inline-end": "100%",
      "inset-block": "0",
      width: STICKY_SIZE,
    },
    direction: "to left",
    rtlDirection: "to right",
    axis: "inline",
    showsFrom: "end",
  },
}

function toStickyUtility({
  place,
  direction,
  rtlDirection,
  axis,
  showsFrom,
}: StickyEdge): CssObject {
  return {
    "&::after": {
      content: '""',
      position: "absolute",
      ...place,
      "pointer-events": "none",
      // The element's own surface, whatever it is: a header on a card fades
      // to the card, a table's head to the table.
      "background-color": "inherit",
      "-webkit-mask-image": toEdgeMask(direction),
      "mask-image": toEdgeMask(direction),
      // Hidden until the scroller has content under the element; a scroller
      // that doesn't overflow has an inactive timeline and stays hidden.
      "@supports (animation-timeline: scroll())": {
        opacity: "0",
        animation: "fabricator-sticky-fade 1ms linear both",
        "animation-direction": showsFrom === "start" ? "normal" : "reverse",
        "animation-timeline": `scroll(nearest ${axis})`,
        "animation-range":
          showsFrom === "start" ? `0 ${REVEAL}` : `calc(100% - ${REVEAL}) 100%`,
      },
    },
    ...(rtlDirection && {
      '&:where([dir="rtl"], [dir="rtl"] *)::after': {
        "-webkit-mask-image": toEdgeMask(rtlDirection),
        "mask-image": toEdgeMask(rtlDirection),
      },
    }),
  }
}

// A painted fade: `color`, solid at the start of `direction`, eased to clear
// over the last `size`.
function toPaintedFade(direction: string, color: string, size: string) {
  const stops = getFadeRamp().map(({ position, alpha }) => {
    const cover = Math.round((1 - alpha) * 1000) / 10
    const at = `calc(100% - ${size} + ${size} * ${position})`
    return `color-mix(in oklab, ${color} ${cover}%, transparent) ${at}`
  })
  return `linear-gradient(${direction}, ${stops.join(", ")})`
}

const SURFACE_FADE_DIRECTIONS: Record<
  Edge,
  { direction: string; rtlDirection?: string }
> = {
  t: { direction: "to bottom" },
  b: { direction: "to top" },
  s: { direction: "to right", rtlDirection: "to left" },
  e: { direction: "to left", rtlDirection: "to right" },
}

// The wash over the surface, on the same ramp.
const toSurfaceFadeImage = (direction: string) =>
  [
    "var(--surface-fade-wash, transparent)",
    "var(--surface-fade-color, var(--background))",
  ]
    .map((color) =>
      toPaintedFade(direction, color, "var(--surface-fade-size, 100%)")
    )
    .join(", ")

function toSurfaceFadeUtility(edge: Edge): CssObject {
  const { direction, rtlDirection } = SURFACE_FADE_DIRECTIONS[edge]
  return {
    "background-image": toSurfaceFadeImage(direction),
    ...(rtlDirection && {
      '&:where([dir="rtl"], [dir="rtl"] *)': {
        "background-image": toSurfaceFadeImage(rtlDirection),
      },
    }),
  }
}

// A length on the spacing scale, or any arbitrary value. The nested rule
// keeps both declarations in one object; Tailwind drops the one that doesn't
// resolve.
function toSpacingUtility(property: string): CssObject {
  return {
    [property]: "calc(var(--spacing) * --value(integer))",
    "&": { [property]: "--value([*])" },
  }
}

/** The scroll fades, in the shape of a registry item's `css` field. */
export const SCROLL_FADE_CSS: CssObject = {
  // Each edge's strength animates, so it is registered as a number. At rest
  // (and when nothing overflows) it is 0: no fade.
  ...Object.fromEntries(
    EDGES.map((edge) => [
      `@property ${strength(edge)}`,
      { syntax: '"<number>"', inherits: "false", "initial-value": "0" },
    ])
  ),
  ...Object.fromEntries(
    EDGES.map((edge) => [
      `@keyframes fabricator-scroll-fade-${edge}`,
      isStart(edge)
        ? { from: { [strength(edge)]: "0" }, to: { [strength(edge)]: "1" } }
        : { from: { [strength(edge)]: "1" }, to: { [strength(edge)]: "0" } },
    ])
  ),
  "@keyframes fabricator-sticky-fade": {
    from: { opacity: "0" },
    to: { opacity: "1" },
  },
  "@utility scroll-fade": toFadeUtility(
    [LAYERS.t, LAYERS.b],
    "--scroll-fade-block",
    "scroll(self y)"
  ),
  "@utility scroll-fade-y": toFadeUtility(
    [LAYERS.t, LAYERS.b],
    "--scroll-fade-block",
    "scroll(self y)"
  ),
  "@utility scroll-fade-x": toFadeUtility(
    [LAYERS.s, LAYERS.e],
    "--scroll-fade-inline",
    "scroll(self inline)"
  ),
  "@utility scroll-fade-t": toFadeUtility(
    [LAYERS.t],
    "--scroll-fade-mask",
    "scroll(self y)"
  ),
  "@utility scroll-fade-b": toFadeUtility(
    [LAYERS.b],
    "--scroll-fade-mask",
    "scroll(self y)"
  ),
  "@utility scroll-fade-l": toFadeUtility(
    [LAYERS.l],
    "--scroll-fade-mask",
    "scroll(self x)"
  ),
  "@utility scroll-fade-r": toFadeUtility(
    [LAYERS.r],
    "--scroll-fade-mask",
    "scroll(self x)"
  ),
  "@utility scroll-fade-s": toFadeUtility(
    [LAYERS.s],
    "--scroll-fade-mask",
    "scroll(self inline)"
  ),
  "@utility scroll-fade-e": toFadeUtility(
    [LAYERS.e],
    "--scroll-fade-mask",
    "scroll(self inline)"
  ),
  ...Object.fromEntries(
    EDGES.map((edge) => [
      `@utility scroll-fade-inset-${edge}-*`,
      toSpacingUtility(`--scroll-fade-${edge}-inset`),
    ])
  ),
  ...Object.fromEntries(
    EDGES.map((edge) => [
      `@utility surface-fade-${edge}`,
      toSurfaceFadeUtility(edge),
    ])
  ),
  ...Object.fromEntries(
    EDGES.map((edge) => [
      `@utility sticky-fade-${edge}`,
      toStickyUtility(STICKY_EDGES[edge]),
    ])
  ),
}
