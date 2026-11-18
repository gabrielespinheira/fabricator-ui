"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getBumpChartModel,
  getBumpLegendValue,
  getBumpPath,
  getBumpRevealAmount,
  getBumpSeriesAt,
  getBumpTable,
  getBumpTooltip,
  interpolateBumpSeries,
  type BumpRanking,
  type BumpSeriesGeometry,
} from "@/registry/bases/__base__/lib/chart-bump-model"
import {
  getChartSeries,
  getNearestIndex,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
  type ChartSeries,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartAxis,
  ChartCrosshair,
  ChartDataTable,
  ChartEmpty,
  ChartGrid,
  ChartInspector,
  ChartTooltip,
  getChartColor,
  useChartLegendState,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/bases/__base__/ui/chart-kit"

// Rank over time, who overtook whom: a line per series through its rank at
// every index, rank 1 at the top, with a ring holding the rank at each
// point and the series' name past its last one. Pointing at a line, or at
// its legend row, dims the others. Lines sweep in from the start edge the
// first time the chart is on screen, the rings appearing as the sweep
// passes them, and points move to their new places when the ranks change.

type BumpChartProps<TDatum extends ChartDatum> = {
  /** One row per index, each series' rank or score under its config key. */
  data: readonly TDatum[]
  config: ChartConfig
  /** The field naming each index. */
  index: keyof TDatum & string
  /** The chart's accessible name. */
  label: string
  /** Ranks as given (1 is the top), or scores ranked per index. */
  ranking?: BumpRanking
  formatValue?: (value: number, key: string) => string
  formatIndex?: (value: string, datum: TDatum) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 480, height: 240 }
const NO_SERIES: BumpSeriesGeometry[] = []

function toSvgId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "")
}

/**
 * A toggle per series with its latest rank and how it got there: pressing
 * hides the series, pointing at it spotlights it.
 */
function BumpLegend({
  series,
  geometry,
  hidden,
  onToggle,
  onSpotlight,
}: {
  series: readonly ChartSeries[]
  geometry: readonly BumpSeriesGeometry[]
  hidden: ReadonlySet<string>
  onToggle: (key: string) => void
  onSpotlight: (key: string | null) => void
}) {
  return (
    <ul
      data-slot="chart-legend"
      aria-label="Series"
      className="cn-chart-legend flex flex-wrap items-center"
      onPointerLeave={() => onSpotlight(null)}
    >
      {series.map((item) => {
        const isHidden = hidden.has(item.key)
        const shown = geometry.find((entry) => entry.key === item.key)
        return (
          <li key={item.key} className="flex">
            <button
              type="button"
              data-slot="chart-legend-item"
              aria-pressed={!isHidden}
              data-hidden={isHidden || undefined}
              className="cn-chart-legend-item inline-flex items-center outline-none select-none"
              onClick={() => {
                onToggle(item.key)
                // A series being hidden can't stay spotlit, or every other
                // series would stay dimmed under the pointer.
                onSpotlight(isHidden ? item.key : null)
              }}
              onPointerEnter={() => onSpotlight(isHidden ? null : item.key)}
              onFocus={() => onSpotlight(isHidden ? null : item.key)}
              onBlur={() => onSpotlight(null)}
            >
              <span
                data-slot="chart-legend-key"
                data-shape="line"
                className="cn-chart-legend-key"
                style={{ color: getChartColor(item.paint) }}
              />
              {item.label}
              {shown && !isHidden && (
                <span
                  data-slot="bump-chart-standing"
                  className="cn-bump-chart-standing"
                >
                  {getBumpLegendValue(shown)}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function BumpChart<TDatum extends ChartDatum>({
  data,
  config,
  index,
  label,
  ranking = "rank",
  formatValue,
  formatIndex,
  legend,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: BumpChartProps<TDatum>) {
  const id = toSvgId(React.useId())
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(config)
  const [active, setActive] = React.useState<number | null>(null)
  const [pointed, setPointed] = React.useState<string | null>(null)

  const allSeries = React.useMemo(() => getChartSeries(config), [config])
  const model = React.useMemo(
    () =>
      getBumpChartModel({
        data,
        config,
        index,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        ranking,
        hidden,
        formatIndex,
      }),
    [data, config, index, size, fontSize, ranking, hidden, formatIndex]
  )
  // A new token whenever the data changes rather than the size: points move
  // on the first, and jump on the second.
  const dataVersion = React.useMemo(
    () => ({ data, config, ranking, hidden }),
    [data, config, ranking, hidden]
  )
  const reveal = useChartReveal(plotRef, animate)
  // Series being shown rise from just under the bottom slot; hidden ones
  // sink there.
  const floor = model.plot.y + model.plot.height + model.radius
  const series = useChartTween(
    plotRef,
    size ? model.series : NO_SERIES,
    (from, to, progress) => interpolateBumpSeries(from, to, progress, floor),
    animate ? dataVersion : null
  )

  const activeIndex = active !== null && active < data.length ? active : null
  const content =
    activeIndex === null
      ? null
      : getBumpTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getBumpTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    onActiveChange?.(next === null ? null : { index: next, datum: data[next] })
  }

  const { plot, radius } = model
  const isEmpty = data.length === 0
  const showLegend = legend ?? allSeries.length > 1
  const focus = spotlight ?? pointed
  const isDimmed = (item: BumpSeriesGeometry) =>
    (focus !== null && focus !== item.key) || item.isLeaving === true
  const sweep =
    reveal >= 1 ? Number.POSITIVE_INFINITY : (size?.width ?? 0) * reveal
  const pointedPoint =
    activeIndex === null || pointed === null
      ? null
      : (model.series.find((item) => item.key === pointed)?.points[
          activeIndex
        ] ?? null)
  const anchor =
    activeIndex === null
      ? null
      : {
          x: model.positions[activeIndex],
          y: pointedPoint ? pointedPoint.y : plot.y + plot.height / 2,
        }

  return (
    <div
      data-slot="bump-chart"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-bump-chart flex flex-col", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        className="cn-chart-plot relative min-h-0 flex-1"
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          setPointed(
            getBumpSeriesAt(model, {
              x: event.clientX - box.left,
              y: event.clientY - box.top,
            })
          )
        }}
        onPointerLeave={() => setPointed(null)}
      >
        {size && !isEmpty && (
          <svg
            aria-hidden
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
          >
            <defs>
              <clipPath id={`${id}-reveal`}>
                <rect
                  x={0}
                  y={-8}
                  width={Number.isFinite(sweep) ? sweep : size.width + 16}
                  height={size.height + 16}
                />
              </clipPath>
            </defs>
            <ChartGrid
              ticks={model.slots}
              start={plot.x}
              end={plot.x + plot.width}
            />
            <ChartAxis
              side="bottom"
              offset={model.axisOffset}
              ticks={model.labelIndices.map((position) => ({
                position: model.positions[position],
                label: model.labels[position],
              }))}
            />
            {activeIndex !== null && (
              <ChartCrosshair
                x={model.positions[activeIndex]}
                top={plot.y - radius}
                bottom={plot.y + plot.height + radius}
              />
            )}
            <g clipPath={`url(#${id}-reveal)`}>
              {series.map((item) => (
                <path
                  key={item.key}
                  data-slot="chart-series"
                  data-dimmed={isDimmed(item) || undefined}
                  className="cn-chart-series"
                  d={getBumpPath(item.points)}
                  fill="none"
                  stroke={getChartColor(item.paint)}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            </g>
            {series.map((item) => {
              const color = getChartColor(item.paint)
              const name = model.names.find((entry) => entry.key === item.key)
              const nameAmount = name
                ? getBumpRevealAmount(sweep, name.x, radius)
                : 0
              return (
                <g
                  key={item.key}
                  data-slot="bump-chart-points"
                  data-dimmed={isDimmed(item) || undefined}
                  className="cn-chart-series"
                >
                  {item.points.map((point, position) => {
                    if (!point) return null
                    const amount = getBumpRevealAmount(sweep, point.x, radius)
                    return (
                      <g
                        key={position}
                        data-slot="bump-chart-dot"
                        opacity={amount}
                        transform={`translate(${point.x} ${point.y}) scale(${0.5 + amount * 0.5})`}
                      >
                        <circle
                          className="cn-bump-chart-ring"
                          r={radius}
                          stroke={color}
                          strokeWidth={2}
                        />
                        {model.showRanks && (
                          <text
                            className="cn-bump-chart-rank"
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            {point.rank}
                          </text>
                        )}
                      </g>
                    )
                  })}
                  {name && !item.isLeaving && (
                    <text
                      data-slot="bump-chart-name"
                      className="cn-bump-chart-name"
                      x={name.x}
                      y={name.y}
                      opacity={nameAmount}
                      dominantBaseline="central"
                    >
                      {name.text}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && anchor && (
          <ChartTooltip content={content} anchor={anchor} frame={size} />
        )}
        {!isEmpty && (
          <ChartInspector
            label={label}
            count={data.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getNearestIndex(model.positions, point.x)}
            valueText={
              content
                ? `${content.title}: ${content.rows
                    .map((row) => `${row.label} ${row.value}`)
                    .join(", ")}`
                : undefined
            }
          />
        )}
      </div>
      {showLegend && (
        <BumpLegend
          series={allSeries}
          geometry={model.series}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { BumpChart, type BumpChartProps }
