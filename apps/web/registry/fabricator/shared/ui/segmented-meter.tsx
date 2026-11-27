"use client"

// Segmented Meter: parts of one total in a single bar, such as storage by
// kind or a budget by team, with a legend. Each part takes a chart series
// colour in order; when a value changes its part springs to the new size and
// the parts after it slide over. The bar is a meter for the total used; the
// legend reads every part.
import * as React from "react"
import { cn } from "cn"

import {
  getMeterShares,
  getMeterTotals,
} from "@/registry/bases/__base__/lib/segmented-meter-model"

export type SegmentedMeterSegment = { label: string; value: number }

type SegmentedMeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  segments: SegmentedMeterSegment[]
  max: number
  /** Names the meter, shown above the bar. */
  label: React.ReactNode
  /** Writes a value for the legend and the total, such as "31.4 GB". */
  formatValue?: (value: number) => string
}

function SegmentedMeter({
  segments,
  max,
  label,
  formatValue = (value) => String(value),
  className,
  ...props
}: SegmentedMeterProps) {
  const labelId = React.useId()
  const shares = getMeterShares(segments, max)
  const { used } = getMeterTotals(segments, max)
  return (
    <div
      data-slot="segmented-meter"
      className={cn("cn-segmented-meter flex flex-col", className)}
      {...props}
    >
      <div className="cn-segmented-meter-header flex items-baseline justify-between">
        <span id={labelId} className="cn-segmented-meter-label">
          {label}
        </span>
        <span className="cn-segmented-meter-total">
          {formatValue(used)} of {formatValue(max)}
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={used}
        aria-valuetext={`${formatValue(used)} of ${formatValue(max)}`}
        className="cn-segmented-meter-bar flex overflow-hidden"
      >
        {segments.map((segment, index) => (
          <span
            key={segment.label}
            data-slot="segmented-meter-segment"
            className="cn-segmented-meter-segment shrink-0"
            style={
              {
                "--segment-share": `${shares[index]}%`,
                "--segment-color": `var(--chart-series-${(index % 8) + 1})`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <ul className="cn-segmented-meter-legend flex flex-wrap">
        {segments.map((segment, index) => (
          <li
            key={segment.label}
            data-slot="segmented-meter-legend-item"
            className="cn-segmented-meter-legend-item flex items-center"
            style={
              {
                "--segment-color": `var(--chart-series-${(index % 8) + 1})`,
              } as React.CSSProperties
            }
          >
            <span aria-hidden className="cn-segmented-meter-dot shrink-0" />
            <span className="cn-segmented-meter-legend-label">
              {segment.label}
            </span>
            <span className="cn-segmented-meter-legend-value">
              {formatValue(segment.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { SegmentedMeter }
