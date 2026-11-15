"use client"

import * as React from "react"
import { cn } from "cn"

import { CHART_LABEL_GAP } from "@/registry/bases/__base__/lib/chart-cartesian-model"
import {
  getHeatCalendarIndexAt,
  getHeatCalendarModel,
  getHeatCalendarStep,
  getHeatCalendarTable,
  getHeatCalendarTooltip,
  interpolateHeatCells,
  readHeatCalendarDate,
  type HeatCalendarRange,
  type HeatCell,
} from "@/registry/bases/__base__/lib/chart-heat-calendar-model"
import {
  getStaggeredProgress,
  type ChartActive,
  type ChartColor,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  ChartAxis,
  ChartDataTable,
  ChartEmpty,
  ChartInspector,
  ChartTooltip,
  getChartColor,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/bases/__base__/ui/chart-kit"

// A value per day over months, as a grid of weeks by weekdays in five
// levels: a contribution graph. Cells are square and sized to the width,
// between a minimum and a maximum; past the minimum the grid scrolls,
// starting at the latest week. A lifted copy of the cell under the pointer
// glides from day to day with the tooltip.

/** The inspected day: its row in the data when it has one. */
type HeatCalendarActive<TDatum extends ChartDatum> = Omit<
  ChartActive<TDatum>,
  "datum"
> & {
  /** The day as `yyyy-MM-dd`. */
  date: string
  value: number | null
  /** The first row on the day, if any. */
  datum?: TDatum
}

type HeatCalendarProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  /** The field holding each row's day: an ISO date string or a Date. */
  dateKey?: string
  /** The field holding each row's value; rows on one day add up. */
  valueKey?: string
  /** The chart's accessible name. */
  label: string
  /** The days to draw. Default: the 52 weeks ending at the latest date. */
  range?: HeatCalendarRange
  /** The weekday each column starts on: 0 Sunday, 1 Monday. */
  weekStartsOn?: 0 | 1
  /** The most levels 1, 2 and 3 hold. Default: the data's quartiles. */
  thresholds?: number[]
  /** The hue every level is painted in. Default: the first palette slot. */
  color?: ChartColor
  formatValue?: (value: number, key: string) => string
  /** The "Less … More" key under the grid. */
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: HeatCalendarActive<TDatum> | null) => void
} & Omit<React.ComponentProps<"div">, "children" | "color">

const FALLBACK_SIZE = { width: 720, height: 0 }
const NO_CELLS: HeatCell[] = []
const KEY_CELL = 10
/** How far cells grow from as they fade in, as a share of their size. */
const REVEAL_SCALE = 0.4

/** A stable key for a range written inline, so it doesn't redraw each render. */
function useStableRange(range: HeatCalendarRange | undefined) {
  const start = range ? readHeatCalendarDate(range.start)?.getTime() : undefined
  const end = range ? readHeatCalendarDate(range.end)?.getTime() : undefined
  return React.useMemo(
    () =>
      start === undefined || end === undefined
        ? undefined
        : { start: new Date(start), end: new Date(end) },
    [start, end]
  )
}

function useStableThresholds(thresholds: number[] | undefined) {
  const key = thresholds?.length ? thresholds.join(",") : undefined
  return React.useMemo(() => key?.split(",").map(Number), [key])
}

function HeatCalendar<TDatum extends ChartDatum>({
  data,
  dateKey = "date",
  valueKey = "value",
  label,
  range,
  weekStartsOn = 1,
  thresholds,
  color,
  formatValue,
  legend = true,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: HeatCalendarProps<TDatum>) {
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [active, setActive] = React.useState<{
    index: number
    offset: number
  } | null>(null)

  const stableRange = useStableRange(range)
  const stableThresholds = useStableThresholds(thresholds)
  const model = React.useMemo(
    () =>
      getHeatCalendarModel({
        data,
        dateKey,
        valueKey,
        range: stableRange,
        weekStartsOn,
        thresholds: stableThresholds,
        color,
        size: size ?? FALLBACK_SIZE,
        fontSize,
      }),
    [
      data,
      dateKey,
      valueKey,
      stableRange,
      weekStartsOn,
      stableThresholds,
      color,
      size,
      fontSize,
    ]
  )
  const dataVersion = React.useMemo(
    () => ({
      data,
      dateKey,
      valueKey,
      stableRange,
      weekStartsOn,
      stableThresholds,
      color,
    }),
    [
      data,
      dateKey,
      valueKey,
      stableRange,
      weekStartsOn,
      stableThresholds,
      color,
    ]
  )
  const reveal = useChartReveal(plotRef, animate)
  const cells = useChartTween(
    plotRef,
    size ? model.cells : NO_CELLS,
    interpolateHeatCells,
    animate ? dataVersion : null
  )

  // The latest week is the one to see first: scroll there whenever the
  // grid's width changes.
  React.useEffect(() => {
    const scroller = scrollRef.current
    if (scroller) scroller.scrollLeft = scroller.scrollWidth
  }, [model.width])

  const activeCell =
    active !== null && active.index < model.cells.length
      ? model.cells[active.index]
      : null
  const content =
    activeCell === null
      ? null
      : getHeatCalendarTooltip(model, activeCell.index, formatValue, valueKey)
  const table = React.useMemo(
    () => getHeatCalendarTable(model, formatValue, valueKey),
    [model, formatValue, valueKey]
  )

  const inspect = (next: number | null) => {
    const scroller = scrollRef.current
    const cell = next === null ? undefined : model.cells[next]
    // A day the keyboard moved out of sight scrolls into it.
    if (scroller && cell) {
      const end = cell.x + cell.size + model.gap
      if (end > scroller.scrollLeft + scroller.clientWidth) {
        scroller.scrollLeft = end - scroller.clientWidth
      } else if (cell.x - model.gap < scroller.scrollLeft) {
        scroller.scrollLeft = cell.x - model.gap
      }
    }
    setActive(
      next === null ? null : { index: next, offset: scroller?.scrollLeft ?? 0 }
    )
    if (!onActiveChange) return
    if (!cell) {
      onActiveChange(null)
      return
    }
    onActiveChange({
      index: cell.index,
      date: cell.id,
      value: cell.value,
      datum: cell.datumIndex === null ? undefined : data[cell.datumIndex],
    })
  }

  const isEmpty = model.cells.length === 0
  const paint = getChartColor(model.paint)
  const anchor =
    activeCell && active
      ? {
          x: model.gutter + activeCell.x + activeCell.size / 2 - active.offset,
          y: activeCell.y,
        }
      : null
  const keyCell = Math.min(KEY_CELL, model.cellSize)

  return (
    <div
      data-slot="heat-calendar"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-heat-calendar flex flex-col", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        data-empty={isEmpty || undefined}
        className="cn-chart-plot cn-heat-calendar-plot relative flex"
        style={isEmpty ? undefined : { height: model.height }}
      >
        {size && !isEmpty && (
          <svg
            data-slot="heat-calendar-weekdays"
            aria-hidden
            width={model.gutter}
            height={model.height}
            className="shrink-0 overflow-visible"
          >
            <ChartAxis
              side="start"
              offset={model.gutter - CHART_LABEL_GAP}
              ticks={model.weekdayLabels.map((item) => ({
                position: item.y,
                label: item.label,
              }))}
            />
          </svg>
        )}
        {!isEmpty && (
          <div
            ref={scrollRef}
            data-slot="heat-calendar-scroll"
            className="cn-heat-calendar-scroll min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
            onScroll={(event) => {
              const offset = event.currentTarget.scrollLeft
              setActive((current) =>
                current && current.offset !== offset
                  ? { ...current, offset }
                  : current
              )
            }}
          >
            <div
              className="relative"
              style={{ width: model.width, height: model.height }}
            >
              {size && (
                <svg
                  aria-hidden
                  width={model.width}
                  height={model.height}
                  className="absolute inset-0 overflow-visible"
                >
                  <g data-slot="heat-calendar-months" className="cn-chart-axis">
                    {model.monthLabels.map((month) => (
                      <text
                        key={`${month.label}-${month.x}`}
                        x={month.x}
                        y={0}
                        dominantBaseline="hanging"
                      >
                        {month.label}
                      </text>
                    ))}
                  </g>
                  {cells.map((cell) => {
                    const amount = getStaggeredProgress(
                      reveal,
                      cell.week + cell.day,
                      model.columns + 6,
                      0.5
                    )
                    const scale = REVEAL_SCALE + (1 - REVEAL_SCALE) * amount
                    const side = cell.size * scale
                    const inset = (cell.size - side) / 2
                    const shown = amount * cell.presence
                    const radius = model.radius * scale
                    return (
                      <React.Fragment key={cell.id}>
                        <rect
                          data-slot="heat-calendar-cell"
                          data-level={cell.level}
                          className="cn-heat-calendar-cell"
                          x={cell.x + inset}
                          y={cell.y + inset}
                          width={side}
                          height={side}
                          rx={radius}
                          opacity={shown}
                        />
                        {cell.opacity > 0 && (
                          <rect
                            data-slot="heat-calendar-level"
                            x={cell.x + inset}
                            y={cell.y + inset}
                            width={side}
                            height={side}
                            rx={radius}
                            fill={paint}
                            fillOpacity={cell.opacity * shown}
                          />
                        )}
                      </React.Fragment>
                    )
                  })}
                  {activeCell && (
                    <g
                      data-slot="heat-calendar-lift"
                      className="cn-heat-calendar-lift"
                      style={{
                        transform: `translate(${activeCell.x}px, ${activeCell.y}px)`,
                      }}
                    >
                      <g className="cn-heat-calendar-lift-mark">
                        <rect
                          className="cn-heat-calendar-lift-ring"
                          x={-2}
                          y={-2}
                          width={activeCell.size + 4}
                          height={activeCell.size + 4}
                          rx={model.radius + 2}
                        />
                        <rect
                          className="cn-heat-calendar-cell"
                          width={activeCell.size}
                          height={activeCell.size}
                          rx={model.radius}
                        />
                        <rect
                          className="cn-heat-calendar-lift-level"
                          width={activeCell.size}
                          height={activeCell.size}
                          rx={model.radius}
                          fill={paint}
                          fillOpacity={activeCell.opacity}
                        />
                      </g>
                    </g>
                  )}
                </svg>
              )}
              <ChartInspector
                label={label}
                count={model.cells.length}
                active={activeCell?.index ?? null}
                onActiveChange={inspect}
                getIndexAt={(point) => getHeatCalendarIndexAt(model, point)}
                getStep={getHeatCalendarStep}
                valueText={content?.title}
                className="touch-manipulation"
              />
            </div>
          </div>
        )}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && anchor && (
          <ChartTooltip
            content={content}
            anchor={anchor}
            frame={size}
            side="top"
          />
        )}
      </div>
      {!isEmpty && (
        <div
          data-slot="heat-calendar-footer"
          className="cn-heat-calendar-footer flex flex-wrap items-center justify-between"
          style={{ maxWidth: model.gutter + model.width }}
        >
          <span data-slot="heat-calendar-range">{model.rangeLabel}</span>
          {legend && (
            <div
              data-slot="heat-calendar-key"
              aria-hidden
              className="cn-heat-calendar-key flex items-center"
            >
              <span>Less</span>
              <svg
                width={model.levels.length * (keyCell + model.gap) - model.gap}
                height={keyCell}
              >
                {model.levels.map((level, position) => (
                  <React.Fragment key={level.level}>
                    <rect
                      className="cn-heat-calendar-cell"
                      x={position * (keyCell + model.gap)}
                      width={keyCell}
                      height={keyCell}
                      rx={2}
                    />
                    <rect
                      x={position * (keyCell + model.gap)}
                      width={keyCell}
                      height={keyCell}
                      rx={2}
                      fill={paint}
                      fillOpacity={level.opacity}
                    />
                  </React.Fragment>
                ))}
              </svg>
              <span>More</span>
            </div>
          )}
        </div>
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { HeatCalendar, type HeatCalendarActive, type HeatCalendarProps }
