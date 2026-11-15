// Chart series colours: the categorical palette charts give their series, in
// a fixed order, as tokens in the foundations.
//
// - --chart-series-1 … --chart-series-8: blue, orange, aqua, amber, magenta,
//   green, violet, red. Series take them in config order, so hiding one never
//   repaints the others.
//
// Each mode is chosen for its own surface, not flipped: light sits in OKLCH L
// 0.52 to 0.67, dark in 0.62 to 0.67, every slot at 3:1 or more on the page
// and the card. The order is what keeps neighbours apart for colour-blind
// readers: __tests__/chart-colors.test.ts measures each adjacent pair under
// simulated protanopia and deuteranopia (ΔE ≥ 8) and normal vision (≥ 15),
// and the first three slots against each other, for charts where any two
// series can touch (pie, treemap, sankey).
//
// They are literals, not built on the colour roles: a series means its
// series, so retinting a role never moves one. The upstream --chart-1 …
// --chart-5 keep their name and meaning (contract 4) and stay usable as a
// series colour.

type Mode = "light" | "dark"

export const CHART_SERIES = {
  light: [
    "oklch(0.575 0.163 255.5)",
    "oklch(0.644 0.172 41.3)",
    "oklch(0.622 0.124 167.8)",
    "oklch(0.655 0.139 74.1)",
    "oklch(0.635 0.166 358.1)",
    "oklch(0.529 0.18 142.5)",
    "oklch(0.527 0.197 283.4)",
    "oklch(0.594 0.191 25.5)",
  ],
  dark: [
    "oklch(0.622 0.161 255.1)",
    "oklch(0.622 0.173 40.1)",
    "oklch(0.621 0.128 163.1)",
    "oklch(0.67 0.143 73.2)",
    "oklch(0.622 0.171 0.8)",
    "oklch(0.621 0.207 142.6)",
    "oklch(0.67 0.145 286.8)",
    "oklch(0.669 0.159 22.3)",
  ],
} as const satisfies Record<Mode, readonly string[]>

export const CHART_SERIES_COUNT = CHART_SERIES.light.length

const SLOTS = Array.from(
  { length: CHART_SERIES_COUNT },
  (_, index) => index + 1
)

function seriesVars(mode: Mode) {
  return Object.fromEntries(
    SLOTS.map((slot) => [`chart-series-${slot}`, CHART_SERIES[mode][slot - 1]])
  )
}

export const CHART_CSS_VARS = {
  theme: Object.fromEntries(
    SLOTS.map((slot) => [
      `color-chart-series-${slot}`,
      `var(--chart-series-${slot})`,
    ])
  ),
  light: seriesVars("light"),
  dark: seriesVars("dark"),
}
