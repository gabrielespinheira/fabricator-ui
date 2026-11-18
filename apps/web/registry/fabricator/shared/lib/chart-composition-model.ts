// Composition charts: how the mix of a whole changes over time, drawn by the
// bar model as 100% columns. What this adds is the legend's readout: each
// part's share of one column, the inspected one or else the latest, so the
// legend follows a scrub.

import {
  getChartSeries,
  MISSING_VALUE,
  readChartNumber,
  type ChartConfig,
  type ChartDatum,
  type ChartPaint,
} from "./chart-model"

/** Columns read as one figure: wider than bars, with less air between. */
export const COMPOSITION_MAX_THICKNESS = 40
export const COMPOSITION_BAND_PADDING = 0.15

export type CompositionShare = {
  key: string
  label: string
  paint: ChartPaint
  isHidden: boolean
  /** The part's share of the visible column (0 to 1), null when missing. */
  share: number | null
  text: string
}

/**
 * A share with one decimal always, so a legend's figures keep their width
 * while they change under a scrub.
 */
export function formatCompositionShare(share: number) {
  return `${(share * 100).toFixed(1)}%`
}

/**
 * Every part in config order with its share of one column: `position`, or
 * the latest column when it is null. Hidden parts keep their row and colour
 * and share nothing; the visible ones share the whole, as the columns do.
 */
export function getCompositionShares<TDatum extends ChartDatum>({
  data,
  config,
  hidden = new Set(),
  position,
}: {
  data: readonly TDatum[]
  config: ChartConfig
  hidden?: ReadonlySet<string>
  position: number | null
}): CompositionShare[] {
  const at = position ?? data.length - 1
  const datum = at >= 0 ? data[at] : undefined
  const series = getChartSeries(config)
  const values = series.map((item) =>
    datum && !hidden.has(item.key) ? readChartNumber(datum, item.key) : null
  )
  const total = values.reduce<number>(
    (sum, value) => sum + Math.max(0, value ?? 0),
    0
  )

  return series.map((item, index) => {
    const value = values[index]
    const share =
      value === null || total === 0 ? null : Math.max(0, value) / total
    return {
      key: item.key,
      label: item.label,
      paint: item.paint,
      isHidden: hidden.has(item.key),
      share,
      text: share === null ? MISSING_VALUE : formatCompositionShare(share),
    }
  })
}
