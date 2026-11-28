// A change against the previous period, as a dashboard shows it: a sign, one
// decimal, a direction and whether the change is good. Rates change in
// points. No change (or one that rounds to zero) is neutral, and a missing
// comparison says so instead of pretending to be zero.

export type DeltaUnit = "%" | "pt"
export type DeltaDirection = "up" | "down" | "flat" | "none"
export type DeltaTone = "good" | "bad" | "neutral"

export type Delta = {
  direction: DeltaDirection
  tone: DeltaTone
  label: string
}

const MINUS = "−"

function formatUnit(value: string, unit: DeltaUnit) {
  return unit === "pt" ? `${value} pt` : `${value}%`
}

export function getDelta({
  change,
  isGoodWhenUp,
  unit = "%",
  locale,
  emptyLabel = "No data",
}: {
  /** The change in the unit's terms; null when there is nothing to compare. */
  change: number | null
  /** False for metrics where down is good: churn, cost, latency. */
  isGoodWhenUp: boolean
  unit?: DeltaUnit
  locale?: string
  emptyLabel?: string
}): Delta {
  if (change === null) {
    return { direction: "none", tone: "neutral", label: emptyLabel }
  }
  const rounded = Math.round(change * 10) / 10
  if (rounded === 0) {
    return { direction: "flat", tone: "neutral", label: formatUnit("0", unit) }
  }
  const isUp = rounded > 0
  const magnitude = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(rounded))
  return {
    direction: isUp ? "up" : "down",
    tone: isUp === isGoodWhenUp ? "good" : "bad",
    label: formatUnit(`${isUp ? "+" : MINUS}${magnitude}`, unit),
  }
}
