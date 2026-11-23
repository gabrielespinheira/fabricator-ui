"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getBumpAnchor,
  getBumpChartModel,
  getBumpLegendValue,
  getBumpPath,
  getBumpRevealAmount,
  getBumpSeriesAt,
  getBumpTable,
  getBumpTooltip,
  interpolateBumpSeries,
  type BumpName,
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
  useChartDrawOrder,
  useChartLegendState,
  useChartPresence,
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

function getSeriesKey(item: BumpSeriesGeometry) {
  return item.key
}

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
  const drawnSeries = useChartDrawOrder(series, getSeriesKey)
  // A hidden series leaves the model's names at once, but its name should
  // ride down with its line: keep the last one seen for every series. Not
  // the previous names: the tween renders every frame, so they would hold
  // the new names from the second frame on.
  const [knownNames, setKnownNames] = React.useState<
    ReadonlyMap<string, BumpName>
  >(() => new Map())
  const hasNewNames = model.names.some(
    (entry) => knownNames.get(entry.key) !== entry
  )
  if (hasNewNames) {
    setKnownNames(
      new Map([
        ...knownNames,
        ...model.names.map((entry): [string, BumpName] => [entry.key, entry]),
      ])
    )
  }

  const activeIndex = active !== null && active < data.length ? active : null
  // The readout outlives inspection by the tooltip role's exit, to fade out.
  const shown = useChartPresence(plotRef, activeIndex)
  const shownIndex =
    shown.value !== null && shown.value < data.length ? shown.value : null
  // The pointed line clears as the pointer leaves too: the fading readout
  // keeps the last one so it doesn't slide to the middle on its way out.
  const shownPointed = useChartPresence(plotRef, pointed)
  const anchorKey = shown.isLeaving ? shownPointed.value : pointed
  const content =
    shownIndex === null ? null : getBumpTooltip(model, shownIndex, formatValue)
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
    item.isLeaving !== true && focus !== null && focus !== item.key
  const sweep =
    reveal >= 1 ? Number.POSITIVE_INFINITY : (size?.width ?? 0) * reveal
  const anchor =
    shownIndex === null ? null : getBumpAnchor(model, shownIndex, anchorKey)

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
          const hit = getBumpSeriesAt(model, {
            x: event.clientX - box.left,
            y: event.clientY - box.top,
          })
          // A miss keeps the line last pointed at, so crossing from one line
          // to the next moves the spotlight once instead of blinking.
          if (hit !== null) setPointed(hit)
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
            {shownIndex !== null && (
              <ChartCrosshair
                x={model.positions[shownIndex]}
                top={plot.y - radius}
                bottom={plot.y + plot.height + radius}
                leaving={shown.isLeaving}
              />
            )}
            <g clipPath={`url(#${id}-reveal)`}>
              {drawnSeries.map((item) => (
                <path
                  key={item.key}
                  data-slot="chart-series"
                  data-leaving={item.isLeaving || undefined}
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
            {drawnSeries.map((item) => {
              const color = getChartColor(item.paint)
              const name =
                model.names.find((entry) => entry.key === item.key) ??
                (item.isLeaving ? knownNames.get(item.key) : undefined)
              // The name rides the drawn line's last point, so it travels
              // with its line when the ranks change instead of waiting there.
              const last = item.points[item.points.length - 1]
              const nameY = last ? last.y : name?.y
              const nameAmount = name
                ? getBumpRevealAmount(sweep, name.x, radius)
                : 0
              return (
                <g
                  key={item.key}
                  data-slot="bump-chart-points"
                  data-leaving={item.isLeaving || undefined}
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
                  {name && nameY !== undefined && (
                    <text
                      data-slot="bump-chart-name"
                      className="cn-bump-chart-name"
                      x={name.x}
                      y={nameY}
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
          <ChartTooltip
            content={content}
            anchor={anchor}
            frame={size}
            leaving={shown.isLeaving}
          />
        )}
        {!isEmpty && (
          <ChartInspector
            label={label}
            count={data.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getNearestIndex(model.positions, point.x)}
            valueText={
              activeIndex !== null && content
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
