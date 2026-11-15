"use client"

import * as React from "react"
import { cn } from "cn"

import {
  formatChartNumber,
  formatChartPercent,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  getDonutCenterFontSize,
  getPieAnchor,
  getPieChartModel,
  getPieListRows,
  getPieParts,
  getPieSeries,
  getPieSliceAt,
  getPieSlicePath,
  getPieTable,
  getPieTooltip,
  getSliceOffset,
  interpolatePieSlices,
  PIE_LIFT,
  sweepPieSlices,
  type PieSlice,
  type PieVariant,
} from "@/registry/bases/__base__/lib/chart-pie-model"
import {
  ChartDataTable,
  ChartEmpty,
  ChartInspector,
  ChartLegend,
  ChartTooltip,
  getChartColor,
  useChartLegendState,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/bases/__base__/ui/chart-kit"

// The plot Pie Chart and Donut Chart share: slices clockwise from 12 o'clock
// that sweep in the first time the chart is on screen, a lift and a spotlight
// for the slice under the pointer, the tooltip, the legend and the hidden
// table. A donut adds its total in the centre and a value list beside the
// ring. Slices turn to their new angles when the data or the visible slices
// change.

type ChartPiePlotProps<TDatum extends ChartDatum> = {
  variant: PieVariant
  data: readonly TDatum[]
  /** The field naming each slice. */
  nameKey?: keyof TDatum & string
  /** The field holding each slice's value. */
  valueKey?: keyof TDatum & string
  /** Labels and colours, keyed by the slices' names. */
  config?: ChartConfig
  /** The chart's accessible name. */
  label: string
  /** Prints each slice's share inside it, where it fits. */
  labels?: boolean
  /** The small line under a donut's total. */
  centerLabel?: string
  /** A donut's value list, beside the ring or under it. */
  list?: boolean
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  /** On for a pie; a donut's centre is its readout, so off for one. */
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 240, height: 240 }
const NO_SLICES: PieSlice[] = []
const NO_CONFIG: ChartConfig = {}

function ChartPiePlot<TDatum extends ChartDatum>({
  variant,
  data,
  nameKey = "name",
  valueKey = "value",
  config = NO_CONFIG,
  label,
  labels = false,
  centerLabel = "Total",
  list = false,
  formatValue,
  legend,
  tooltip,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: ChartPiePlotProps<TDatum>) {
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const [active, setActive] = React.useState<number | null>(null)

  // The parts don't depend on the size or on what is hidden: the legend
  // counts them, so the last visible slice can't be hidden.
  const parts = React.useMemo(
    () => getPieParts({ data, nameKey, valueKey, config }),
    [data, nameKey, valueKey, config]
  )
  const partConfig = React.useMemo(
    () =>
      Object.fromEntries(parts.map((part) => [part.id, { label: part.label }])),
    [parts]
  )
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(partConfig)

  const model = React.useMemo(
    () =>
      getPieChartModel({
        data,
        nameKey,
        valueKey,
        config,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        variant,
        hidden,
        labels,
      }),
    [data, nameKey, valueKey, config, size, fontSize, variant, hidden, labels]
  )
  // A new token whenever the data changes rather than the size: the slices
  // turn on the first, and jump on the second.
  const dataVersion = React.useMemo(
    () => ({ data, nameKey, valueKey, config, hidden }),
    [data, nameKey, valueKey, config, hidden]
  )
  const reveal = useChartReveal(plotRef, animate)
  const target = size ? model.slices : NO_SLICES
  const tweened = useChartTween(
    plotRef,
    target,
    interpolatePieSlices,
    animate ? dataVersion : null
  )
  const slices = sweepPieSlices(tweened, reveal)
  // Labels wait for the slices to settle, so none is placed on a slice
  // still turning.
  const isSettled = tweened === target && reveal >= 1

  const activeIndex =
    active !== null && active < model.slices.length ? active : null
  const activeSlice = activeIndex === null ? null : model.slices[activeIndex]
  const highlighted = activeSlice?.id ?? spotlight
  const content =
    activeIndex === null ? null : getPieTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getPieTable(model, formatValue),
    [model, formatValue]
  )
  const format = formatValue ?? ((value: number) => formatChartNumber(value))

  const inspect = (next: number | null) => {
    setActive(next)
    if (!onActiveChange) return
    const slice = next === null ? null : model.slices[next]
    const row = parts.find((part) => part.id === slice?.id)?.rows[0]
    onActiveChange(
      row === undefined
        ? null
        : { index: row, datum: data[row], key: slice?.id }
    )
  }

  const isDonut = variant === "donut"
  const showTooltip = tooltip ?? !isDonut
  const isEmpty = parts.length === 0
  const canLift = model.slices.length > 1
  const hasList = isDonut && list && parts.length > 0
  const showLegend = legend ?? (!hasList && parts.length > 1)
  const listRows = hasList ? getPieListRows(model, formatValue) : []
  const centerTexts = [
    format(model.total, valueKey),
    ...model.slices.map((slice) => format(slice.value, valueKey)),
  ]
  const centerFontSize = getDonutCenterFontSize(model.innerRadius, centerTexts)

  return (
    <div
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("flex flex-col items-center", className)}
      {...props}
    >
      <div
        data-slot="chart-pie-body"
        data-list={hasList || undefined}
        className="cn-chart-pie-body flex w-full flex-col items-center"
      >
        <div
          ref={plotRef}
          data-slot="chart-plot"
          data-variant={variant}
          data-list={hasList || undefined}
          className="cn-chart-plot cn-chart-pie-plot relative"
        >
          {size && !isEmpty && (
            <svg
              aria-hidden
              width={size.width}
              height={size.height}
              className="absolute inset-0 overflow-visible"
            >
              <g transform={`translate(${model.center.x} ${model.center.y})`}>
                {slices.map((slice) => {
                  const isActive = slice.id === highlighted
                  const offset =
                    isActive && canLift && !slice.isLeaving
                      ? getSliceOffset(slice, PIE_LIFT)
                      : { x: 0, y: 0 }
                  const box = isSettled ? slice.labelBox : null
                  return (
                    <g
                      key={slice.id}
                      data-slot="chart-slice"
                      data-active={isActive || undefined}
                      data-dimmed={
                        (highlighted !== null && !isActive) ||
                        slice.isLeaving ||
                        undefined
                      }
                      className="cn-chart-slice"
                      style={{
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                      }}
                    >
                      <path
                        d={getPieSlicePath(model, slice)}
                        fill={getChartColor(slice.paint)}
                      />
                      {box && (
                        <g
                          data-slot="chart-slice-label"
                          className="cn-chart-slice-label"
                        >
                          <rect
                            className="cn-chart-slice-label-pill"
                            x={box.x - box.width / 2}
                            y={box.y - box.height / 2}
                            width={box.width}
                            height={box.height}
                            rx={box.height / 2}
                          />
                          <text
                            className="cn-chart-slice-label-text"
                            x={box.x}
                            y={box.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            {box.text}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          )}
          {isDonut && size && !isEmpty && (
            <div
              aria-hidden
              data-slot="donut-chart-center"
              className="cn-donut-chart-center pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center text-center"
              style={{
                left: model.center.x,
                top: model.center.y,
                width: model.innerRadius * 1.6,
              }}
            >
              {[null, ...model.slices].map((slice) => (
                <div
                  key={slice?.id ?? "total"}
                  data-active={
                    (slice ? slice.id === highlighted : highlighted === null) ||
                    undefined
                  }
                  className="cn-donut-chart-center-layer flex min-w-0 flex-col items-center [grid-area:1/1]"
                >
                  <span
                    data-slot="donut-chart-center-value"
                    className="cn-donut-chart-center-value"
                    style={{ fontSize: centerFontSize }}
                  >
                    {slice
                      ? format(slice.value, valueKey)
                      : format(model.total, valueKey)}
                  </span>
                  <span
                    data-slot="donut-chart-center-label"
                    className="cn-donut-chart-center-label max-w-full truncate"
                  >
                    {slice
                      ? `${slice.label} · ${formatChartPercent(slice.share)}`
                      : centerLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
          {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
          {showTooltip && size && content && activeIndex !== null && (
            <ChartTooltip
              content={content}
              anchor={getPieAnchor(model, activeIndex)}
              frame={size}
            />
          )}
          {!isEmpty && (
            <ChartInspector
              label={label}
              count={model.slices.length}
              active={activeIndex}
              onActiveChange={inspect}
              getIndexAt={(point) => getPieSliceAt(model, point)}
              valueText={
                content
                  ? `${content.title}: ${content.rows
                      .map((row) => `${row.value}, ${row.label}`)
                      .join(", ")}`
                  : undefined
              }
            />
          )}
        </div>
        {hasList && (
          <ul
            data-slot="donut-chart-list"
            aria-label={label}
            className="cn-donut-chart-list flex flex-col"
            onPointerLeave={() => setSpotlight(null)}
          >
            {listRows.map((row) => {
              const isHidden = hidden.has(row.id)
              return (
                <li
                  key={row.id}
                  tabIndex={0}
                  data-slot="donut-chart-list-item"
                  data-active={row.id === highlighted || undefined}
                  className="cn-donut-chart-list-item flex flex-col outline-none"
                  onPointerEnter={() => setSpotlight(isHidden ? null : row.id)}
                  onFocus={() => setSpotlight(isHidden ? null : row.id)}
                  onBlur={() => setSpotlight(null)}
                >
                  <div className="cn-donut-chart-list-row flex items-center">
                    <span
                      data-slot="donut-chart-list-key"
                      className="cn-donut-chart-list-key shrink-0"
                      style={{ color: getChartColor(row.paint) }}
                    />
                    <span
                      data-slot="donut-chart-list-label"
                      className="cn-donut-chart-list-label min-w-0 flex-1 truncate"
                    >
                      {row.label}
                    </span>
                    <span
                      data-slot="donut-chart-list-share"
                      className="cn-donut-chart-list-share"
                    >
                      {row.shareText}
                    </span>
                    <span
                      data-slot="donut-chart-list-value"
                      className="cn-donut-chart-list-value"
                    >
                      {row.value}
                    </span>
                  </div>
                  <span
                    data-slot="donut-chart-list-bar"
                    className="cn-donut-chart-list-bar block overflow-hidden"
                  >
                    <span
                      className="cn-donut-chart-list-bar-fill block h-full"
                      style={{
                        width: reveal > 0 ? `${row.share * 100}%` : 0,
                        backgroundColor: getChartColor(row.paint),
                      }}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {showLegend && (
        <ChartLegend
          className="justify-center"
          series={getPieSeries(model)}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { ChartPiePlot, type ChartPiePlotProps }
