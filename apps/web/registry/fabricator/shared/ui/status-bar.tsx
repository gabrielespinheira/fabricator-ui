"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getNearestIndex,
  getStaggeredProgress,
  type ChartActive,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  getStatusBarModel,
  getStatusBarTable,
  getStatusBarTooltip,
  interpolateStatusPills,
  type StatusConfig,
  type StatusPill,
} from "@/registry/bases/__base__/lib/chart-status-bar-model"
import {
  ChartDataTable,
  ChartEmpty,
  ChartInspector,
  ChartTooltip,
  getChartColor,
  useChartPresence,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/bases/__base__/ui/chart-kit"

// Uptime: a tall pill per day (or period), coloured by its status, with the
// first and last day and the uptime share under it and a legend naming each
// status shown. Pills rise in a left-to-right wave the first time the bar is
// on screen; the one under the pointer lifts while the rest dim a little,
// and a pill whose status changes crossfades to its new colour.

type StatusBarProps<TDatum extends ChartDatum> = {
  data: readonly TDatum[]
  /** The field naming each day or period: an ISO date, a Date or a label. */
  index: keyof TDatum & string
  /** The field holding each row's status. */
  statusKey?: string
  /** The field holding a note on the day, shown in its tooltip. */
  noteKey?: string
  /** Renames or recolours the default statuses, or adds others. */
  statuses?: StatusConfig
  /** The chart's accessible name. */
  label: string
  formatIndex?: (value: string, datum: TDatum) => string
  /** The statuses shown, by name. */
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 480, height: 32 }
const NO_PILLS: StatusPill[] = []
/** How far below its place a pill starts rising, as a share of its height. */
const RISE = 0.4

/** One day's pill. Memoized per pill, and nothing on it changes on hover:
 * on a page with ancestor `:has()` rules, an attribute change on ~90 pills
 * restyles and lays out the whole page on every pointer step. */
const StatusBarPill = React.memo(function StatusBarPill({
  pill,
  amount,
}: {
  pill: StatusPill
  amount: number
}) {
  const shown = amount * pill.presence
  const y = pill.y + (1 - amount) * pill.height * RISE
  return (
    <g
      data-slot="status-bar-pill"
      data-status={pill.status}
      className="cn-status-bar-pill"
    >
      <rect
        x={pill.x}
        y={y}
        width={pill.width}
        height={pill.height}
        rx={pill.radius}
        fill={getChartColor(pill.paint)}
        fillOpacity={pill.opacity * shown}
      />
      {pill.previous && (
        <rect
          x={pill.x}
          y={y}
          width={pill.width}
          height={pill.height}
          rx={pill.radius}
          fill={getChartColor(pill.previous.paint)}
          fillOpacity={pill.previous.opacity * shown}
        />
      )}
    </g>
  )
})

function StatusBar<TDatum extends ChartDatum>({
  data,
  index,
  statusKey = "status",
  noteKey,
  statuses,
  label,
  formatIndex,
  legend = true,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: StatusBarProps<TDatum>) {
  const { ref: plotRef, size } = useChartSize<HTMLDivElement>()
  const [active, setActive] = React.useState<number | null>(null)

  const model = React.useMemo(
    () =>
      getStatusBarModel({
        data,
        index,
        statusKey,
        noteKey,
        statuses,
        size: size ?? FALLBACK_SIZE,
        formatIndex,
      }),
    [data, index, statusKey, noteKey, statuses, size, formatIndex]
  )
  const dataVersion = React.useMemo(
    () => ({ data, index, statusKey, statuses }),
    [data, index, statusKey, statuses]
  )
  const reveal = useChartReveal(plotRef, animate)
  const pills = useChartTween(
    plotRef,
    size ? model.pills : NO_PILLS,
    interpolateStatusPills,
    animate ? dataVersion : null
  )

  const activeIndex =
    active !== null && active < model.pills.length ? active : null
  const activePill = activeIndex === null ? null : model.pills[activeIndex]
  // The lift and the readout outlive inspection by the tooltip role's exit,
  // to fade out. The dim follows the live pill.
  const shown = useChartPresence(plotRef, activeIndex)
  const shownIndex =
    shown.value !== null && shown.value < model.pills.length
      ? shown.value
      : null
  const targetPill = shownIndex === null ? null : model.pills[shownIndex]
  // The lift and the tooltip sit on the pill as drawn now, so during a
  // morph they travel with it instead of arriving first.
  const shownPill = targetPill
    ? (pills.find((pill) => pill.id === targetPill.id && !pill.isLeaving) ??
      targetPill)
    : null
  const content =
    shownIndex === null ? null : getStatusBarTooltip(model, shownIndex)
  const table = React.useMemo(() => getStatusBarTable(model), [model])

  const inspect = (next: number | null) => {
    setActive(next)
    const pill = next === null ? undefined : model.pills[next]
    onActiveChange?.(
      pill ? { index: pill.index, datum: data[pill.index] } : null
    )
  }

  const isEmpty = data.length === 0
  const anchor = shownPill
    ? { x: shownPill.x + shownPill.width / 2, y: shownPill.y }
    : null

  return (
    <div
      data-slot="status-bar"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-status-bar flex flex-col", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        className="cn-chart-plot cn-status-bar-plot relative"
      >
        {size && !isEmpty && (
          <svg
            aria-hidden
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
          >
            {/* One attribute on the group dims every pill, so hovering
                never touches the pills themselves. */}
            <g
              data-slot="status-bar-pills"
              data-inspecting={activePill !== null || undefined}
            >
              {pills.map((pill) => (
                <StatusBarPill
                  key={pill.id}
                  pill={pill}
                  amount={getStaggeredProgress(
                    reveal,
                    pill.index - model.first,
                    model.pills.length,
                    0.5
                  )}
                />
              ))}
            </g>
            {shownPill && (
              <g
                data-slot="status-bar-lift"
                data-leaving={shown.isLeaving || undefined}
                className="cn-status-bar-lift"
                style={{
                  transform: `translate(${shownPill.x + shownPill.width / 2}px, ${shownPill.y + shownPill.height / 2}px)`,
                }}
              >
                <rect
                  className="cn-status-bar-lift-mark"
                  x={-shownPill.width / 2}
                  y={-shownPill.height / 2}
                  width={shownPill.width}
                  height={shownPill.height}
                  rx={shownPill.radius}
                  fill={getChartColor(shownPill.paint)}
                  fillOpacity={shownPill.opacity}
                />
              </g>
            )}
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
            count={model.pills.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getNearestIndex(model.centers, point.x)}
            valueText={
              activeIndex !== null && content
                ? `${content.title}: ${content.rows
                    .map((row) => `${row.label} ${row.value}`)
                    .join(", ")}${content.note ? `. ${content.note}` : ""}`
                : undefined
            }
          />
        )}
      </div>
      {!isEmpty && (
        <div
          data-slot="status-bar-footer"
          className="cn-status-bar-footer grid grid-cols-[1fr_auto_1fr] items-center"
        >
          <span data-slot="status-bar-start" className="truncate">
            {model.startLabel}
          </span>
          <span data-slot="status-bar-uptime" className="cn-status-bar-uptime">
            {model.uptimeLabel}
          </span>
          <span data-slot="status-bar-end" className="truncate text-end">
            {model.endLabel}
          </span>
        </div>
      )}
      {legend && model.statuses.length > 0 && (
        <ul
          data-slot="status-bar-legend"
          aria-label="Statuses"
          className="cn-status-bar-legend flex flex-wrap items-center"
        >
          {model.statuses.map((status) => (
            <li
              key={status.key}
              data-slot="status-bar-legend-item"
              className="cn-status-bar-legend-item inline-flex items-center"
            >
              <span
                data-slot="status-bar-legend-key"
                className="cn-status-bar-legend-key"
                style={{
                  backgroundColor: getChartColor(status.paint),
                  opacity: status.opacity,
                }}
              />
              {status.label}
            </li>
          ))}
        </ul>
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { StatusBar, type StatusBarProps, type StatusConfig }
