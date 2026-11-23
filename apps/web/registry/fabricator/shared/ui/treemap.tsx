"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getStaggeredProgress,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  getTreemapCellAt,
  getTreemapGroups,
  getTreemapLabels,
  getTreemapModel,
  getTreemapTable,
  getTreemapTooltip,
  interpolateTreemapCells,
  revealTreemapCell,
  TREEMAP_ACTIVE_WASH,
  TREEMAP_EDGE,
  TREEMAP_RADIUS,
  TREEMAP_WASH,
  type TreemapCell,
} from "@/registry/bases/__base__/lib/chart-treemap-model"
import {
  ChartDataTable,
  ChartEmpty,
  ChartInspector,
  ChartLegend,
  ChartTooltip,
  getChartColor,
  useChartDrawOrder,
  useChartLegendState,
  useChartPresence,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/bases/__base__/ui/chart-kit"

// Hierarchical parts of a whole: a cell per leaf, sized by its value and
// washed in the colour of its top-level group, with its name and value
// inside when they fit. Cells fade and scale up in a quick wave the first
// time the map is on screen, and re-lay smoothly when the data changes.

type TreemapProps<TDatum extends ChartDatum> = {
  /** The top-level nodes, each a group; `children` nest further nodes. */
  data: readonly TDatum[]
  /** The field naming each node. */
  nameKey?: keyof TDatum & string
  /** The field holding a leaf's value. */
  valueKey?: keyof TDatum & string
  /** The field holding a node's children. */
  childrenKey?: keyof TDatum & string
  /** Labels and colours for groups, keyed by the group's name. */
  config?: ChartConfig
  /** The chart's accessible name. */
  label: string
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 480, height: 288 }
const NO_CELLS: TreemapCell[] = []

function getCellId(cell: TreemapCell) {
  return cell.id
}

function Treemap<TDatum extends ChartDatum>({
  data,
  nameKey,
  valueKey,
  childrenKey,
  config,
  label,
  formatValue,
  legend,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: TreemapProps<TDatum>) {
  const nameField: string = nameKey ?? "name"
  const valueField: string = valueKey ?? "value"
  const childrenField: string = childrenKey ?? "children"
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
  const groups = React.useMemo(
    () => getTreemapGroups(data, config, nameField),
    [data, config, nameField]
  )
  const groupConfig = React.useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        groups.map((group) => [group.key, { label: group.label }])
      ),
    [groups]
  )
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(groupConfig)
  const [active, setActive] = React.useState<number | null>(null)

  const model = React.useMemo(
    () =>
      getTreemapModel({
        data,
        config,
        nameKey: nameField,
        valueKey: valueField,
        childrenKey: childrenField,
        size: size ?? FALLBACK_SIZE,
        hidden,
        formatValue,
      }),
    [
      data,
      config,
      nameField,
      valueField,
      childrenField,
      size,
      hidden,
      formatValue,
    ]
  )
  const dataVersion = React.useMemo(
    () => ({ data, config, nameField, valueField, childrenField, hidden }),
    [data, config, nameField, valueField, childrenField, hidden]
  )
  const reveal = useChartReveal(plotRef, animate)
  const cells = useChartTween(
    plotRef,
    size ? model.cells : NO_CELLS,
    interpolateTreemapCells,
    animate ? dataVersion : null
  )
  const drawnCells = useChartDrawOrder(cells, getCellId)

  const activeIndex =
    active !== null && active < model.cells.length ? active : null
  const activeCell = activeIndex === null ? null : model.cells[activeIndex]
  // The readout outlives inspection by the tooltip role's exit, to fade out.
  // The lit cell and the dim follow the live index.
  const shown = useChartPresence(plotRef, activeIndex)
  const shownIndex =
    shown.value !== null && shown.value < model.cells.length
      ? shown.value
      : null
  const shownCell = shownIndex === null ? null : model.cells[shownIndex]
  const content =
    shownIndex === null
      ? null
      : getTreemapTooltip(model, shownIndex, formatValue)
  const table = React.useMemo(
    () => getTreemapTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    const cell = next === null ? undefined : model.cells[next]
    onActiveChange?.(
      next === null || !cell
        ? null
        : { index: next, datum: cell.datum, key: cell.group }
    )
  }

  const isEmpty = model.cells.length === 0
  const showLegend = legend ?? groups.length > 1
  const drawnActive = shownCell
    ? (cells.find((cell) => cell.id === shownCell.id) ?? shownCell)
    : null
  const anchor = drawnActive
    ? {
        x: drawnActive.x + drawnActive.width / 2,
        y: drawnActive.y + drawnActive.height / 2,
      }
    : null

  return (
    <div
      data-slot="treemap"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-treemap flex flex-col", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        className={cn(
          "cn-chart-plot relative min-h-0 flex-1",
          "cn-treemap-plot"
        )}
      >
        {size && !isEmpty && (
          <svg
            aria-hidden
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
          >
            {drawnCells.map((cell, order) => {
              const revealed = revealTreemapCell(
                cell,
                getStaggeredProgress(reveal, order, drawnCells.length)
              )
              const drawn = revealed.cell
              const isActive = cell.id === activeCell?.id
              const isDimmed =
                !cell.isLeaving &&
                ((activeCell !== null && !isActive) ||
                  (activeCell === null &&
                    spotlight !== null &&
                    spotlight !== cell.group))
              const color = getChartColor(cell.paint)
              const labels = getTreemapLabels(drawn, fontSize)
              const width = Math.max(0, drawn.width - 1)
              const height = Math.max(0, drawn.height - 1)
              return (
                <g key={cell.id} opacity={revealed.opacity}>
                  <g
                    data-slot="treemap-cell"
                    data-active={isActive || undefined}
                    data-leaving={cell.isLeaving || undefined}
                    data-dimmed={isDimmed || undefined}
                    className="cn-treemap-cell"
                  >
                    {/* Inset half a pixel, so the hairline edge stays inside
                        the cell and the 2px gap stays surface. */}
                    <rect
                      x={drawn.x + 0.5}
                      y={drawn.y + 0.5}
                      width={width}
                      height={height}
                      rx={Math.min(TREEMAP_RADIUS, width / 2, height / 2)}
                      fill={color}
                      fillOpacity={
                        isActive ? TREEMAP_ACTIVE_WASH : TREEMAP_WASH
                      }
                      stroke={color}
                      strokeOpacity={TREEMAP_EDGE}
                    />
                    {labels.name && (
                      <text
                        data-slot="treemap-cell-name"
                        className="cn-treemap-cell-name"
                        x={labels.name.x}
                        y={labels.name.y}
                      >
                        {cell.name}
                      </text>
                    )}
                    {labels.value && (
                      <text
                        data-slot="treemap-cell-value"
                        className="cn-treemap-cell-value"
                        x={labels.value.x}
                        y={labels.value.y}
                      >
                        {cell.valueText}
                      </text>
                    )}
                  </g>
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
            count={model.cells.length}
            active={activeIndex}
            onActiveChange={inspect}
            getIndexAt={(point) => getTreemapCellAt(model, point)}
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
        <ChartLegend
          series={groups}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { Treemap, type TreemapProps }
