import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Svg, { G, Rect, Text as SvgText } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  getStaggeredProgress,
  type ChartActive,
  type ChartConfig,
  type ChartDatum,
} from "@/registry/fabricator/shared/lib/chart-model"
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
} from "@/registry/fabricator/shared/lib/chart-treemap-model"
import {
  ChartDataTable,
  ChartDimmable,
  ChartEmpty,
  ChartInspector,
  ChartLegend,
  ChartRevealFade,
  ChartTooltip,
  getChartColor,
  useChartColors,
  useChartLegendState,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/native/ui/chart-kit"

// Hierarchical parts of a whole, from the website's model: a cell per leaf,
// sized by its value and washed in its top-level group's colour, with its
// name and value inside when they fit. Cells fade and scale up in a quick
// wave once the map has a size, and re-lay smoothly when the data changes.

// Read as styles and drawn into SVG: the labels' size, the dimmed cells'
// opacity, and the names' and values' colours and weight.
const treemapPlotStyle = cva("cn-treemap-plot")
const treemapCellStyle = cva("cn-treemap-cell")
const treemapCellNameStyle = cva("cn-treemap-cell-name")
const treemapCellValueStyle = cva("cn-treemap-cell-value")

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
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 320, height: 240 }
const NO_CELLS: TreemapCell[] = []

function readText(style: {
  color?: unknown
  fontSize?: unknown
  fontWeight?: unknown
}) {
  const weight =
    typeof style.fontWeight === "number"
      ? style.fontWeight
      : Number(style.fontWeight)
  return {
    color: typeof style.color === "string" ? style.color : undefined,
    fontSize: typeof style.fontSize === "number" ? style.fontSize : undefined,
    fontWeight: Number.isFinite(weight) ? weight : undefined,
  }
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
  const { onLayout, size } = useChartSize()
  const plotText = readText(useResolveClassNames(treemapPlotStyle()))
  const fontSize = plotText.fontSize ?? 12
  const cellStyle = useResolveClassNames(treemapCellStyle())
  const dimmedOpacity =
    typeof cellStyle.opacity === "number" ? cellStyle.opacity : 0.6
  const nameText = readText(useResolveClassNames(treemapCellNameStyle()))
  const valueText = readText(useResolveClassNames(treemapCellValueStyle()))

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
  const colors = useChartColors(groups.map((group) => group.paint))

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
  const plotRef = React.useRef<React.ComponentRef<typeof View>>(null)
  const reveal = useChartReveal(size !== null, animate, plotRef)
  const cells = useChartTween(
    size ? model.cells : NO_CELLS,
    interpolateTreemapCells,
    animate ? dataVersion : null
  )

  const activeIndex =
    active !== null && active < model.cells.length ? active : null
  const activeCell = activeIndex === null ? null : model.cells[activeIndex]
  const content =
    activeIndex === null
      ? null
      : getTreemapTooltip(model, activeIndex, formatValue)
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
  const drawnActive = activeCell
    ? (cells.find((cell) => cell.id === activeCell.id) ?? activeCell)
    : null
  const anchor = drawnActive
    ? {
        x: drawnActive.x + drawnActive.width / 2,
        y: drawnActive.y + drawnActive.height / 2,
      }
    : null

  return (
    <View
      data-slot="treemap"
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-treemap flex-col", className)}
      {...props}
    >
      <View
        ref={plotRef}
        data-slot="chart-plot"
        data-loading={loading}
        onLayout={onLayout}
        className="cn-chart-plot relative min-h-0 flex-1"
      >
        {size && !isEmpty && (
          <ChartRevealFade isReady={size !== null} enabled={animate}>
            <Svg
              width={size.width}
              height={size.height}
              style={{ position: "absolute" }}
              importantForAccessibility="no-hide-descendants"
            >
              {cells.map((cell, order) => {
                const revealed = revealTreemapCell(
                  cell,
                  getStaggeredProgress(reveal, order, cells.length)
                )
                const drawn = revealed.cell
                const isActive = cell.id === activeCell?.id
                const isDimmed =
                  cell.isLeaving === true ||
                  (activeCell !== null && !isActive) ||
                  (activeCell === null &&
                    spotlight !== null &&
                    spotlight !== cell.group)
                const color = getChartColor(cell.paint, colors)
                const labels = getTreemapLabels(drawn, fontSize)
                const width = Math.max(0, drawn.width - 1)
                const height = Math.max(0, drawn.height - 1)
                return (
                  <G
                    key={cell.id}
                    data-slot="treemap-cell"
                    opacity={revealed.opacity}
                  >
                    <ChartDimmable
                      isDimmed={isDimmed}
                      dimmedOpacity={dimmedOpacity}
                    >
                      <Rect
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
                        strokeWidth={1}
                      />
                      {labels.name && (
                        <SvgText
                          data-slot="treemap-cell-name"
                          x={labels.name.x}
                          y={labels.name.y}
                          fill={nameText.color}
                          fontSize={fontSize}
                          fontWeight={nameText.fontWeight}
                          fontFamily="Inter"
                        >
                          {cell.name}
                        </SvgText>
                      )}
                      {labels.value && (
                        <SvgText
                          data-slot="treemap-cell-value"
                          x={labels.value.x}
                          y={labels.value.y}
                          fill={valueText.color}
                          fontSize={fontSize}
                          fontFamily="Inter"
                        >
                          {cell.valueText}
                        </SvgText>
                      )}
                    </ChartDimmable>
                  </G>
                )
              })}
            </Svg>
          </ChartRevealFade>
        )}
        {isEmpty && !loading && <ChartEmpty>{empty}</ChartEmpty>}
        {tooltip && size && content && anchor && (
          <ChartTooltip
            content={content}
            anchor={anchor}
            frame={size}
            colors={colors}
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
              content
                ? `${content.title}: ${content.rows
                    .map((row) => `${row.label} ${row.value}`)
                    .join(", ")}`
                : undefined
            }
          />
        )}
      </View>
      {showLegend && (
        <ChartLegend
          series={groups}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
          colors={colors}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </View>
  )
}

export { Treemap, type TreemapProps }
