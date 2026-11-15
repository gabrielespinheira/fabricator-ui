import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type ViewProps } from "react-native"
import Svg, {
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  getStaggeredProgress,
  type ChartActive,
  type ChartConfig,
} from "@/registry/fabricator/shared/lib/chart-model"
import {
  getSankeyHighlight,
  getSankeyLabels,
  getSankeyLinkPath,
  getSankeyMark,
  getSankeyMarkAt,
  getSankeyModel,
  getSankeyTable,
  getSankeyTooltip,
  interpolateSankey,
  SANKEY_LINK_ACTIVE_WASH,
  SANKEY_LINK_WASH,
  SANKEY_NODE_RADIUS,
  type SankeyGeometry,
  type SankeyLinkDatum,
  type SankeyNodeDatum,
} from "@/registry/fabricator/shared/lib/chart-sankey-model"
import {
  ChartDataTable,
  ChartEmpty,
  ChartInspector,
  ChartLegend,
  ChartTooltip,
  getChartColor,
  useChartColors,
  useChartLegendState,
  useChartReveal,
  useChartSize,
  useChartTween,
} from "@/registry/native/ui/chart-kit"

// Flow volumes between stages, from the website's model: nodes in columns
// sized by what flows through them, ribbons as thick as each flow in their
// source's colour, and labels beside the nodes. A finger on a node or a link
// lights it and what it touches. Links extend from their sources once the
// plot has a size, and nodes and links morph when the data changes.

// Read as styles and drawn into SVG: the labels' size, colours and weight,
// and the opacity of what is dimmed while another mark is lit.
const sankeyPlotStyle = cva("cn-sankey-chart-plot")
const sankeyLinkStyle = cva("cn-sankey-chart-link")
const sankeyNodeStyle = cva("cn-sankey-chart-node")
const sankeyLabelStyle = cva("cn-sankey-chart-label")
const sankeyNameStyle = cva("cn-sankey-chart-name")
const sankeyValueStyle = cva("cn-sankey-chart-value")

type SankeyChartProps<
  TNode extends SankeyNodeDatum,
  TLink extends SankeyLinkDatum,
> = {
  /** Every node, in the order the palette colours them. */
  nodes: readonly TNode[]
  /** Flows between nodes, by id. They can't loop back. */
  links: readonly TLink[]
  /** The chart's accessible name. */
  label: string
  formatValue?: (value: number, key: string) => string
  legend?: boolean
  tooltip?: boolean
  animate?: boolean
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TNode | TLink> | null) => void
} & Omit<ViewProps, "children">

const FALLBACK_SIZE = { width: 320, height: 240 }
const NO_GEOMETRY: SankeyGeometry = { nodes: [], links: [] }

function toSvgId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "")
}

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

function readOpacity(style: { opacity?: unknown }, fallback: number) {
  return typeof style.opacity === "number" ? style.opacity : fallback
}

function SankeyChart<
  TNode extends SankeyNodeDatum,
  TLink extends SankeyLinkDatum,
>({
  nodes,
  links,
  label,
  formatValue,
  legend = false,
  tooltip = true,
  animate = true,
  loading = false,
  empty,
  onActiveChange,
  className,
  ...props
}: SankeyChartProps<TNode, TLink>) {
  const id = toSvgId(React.useId())
  const { onLayout, size } = useChartSize()
  const fontSize =
    readText(useResolveClassNames(sankeyPlotStyle())).fontSize ?? 12
  const linkDimmed = readOpacity(useResolveClassNames(sankeyLinkStyle()), 0.35)
  const nodeDimmed = readOpacity(useResolveClassNames(sankeyNodeStyle()), 0.35)
  const labelDimmed = readOpacity(
    useResolveClassNames(sankeyLabelStyle()),
    0.35
  )
  const nameText = readText(useResolveClassNames(sankeyNameStyle()))
  const valueText = readText(useResolveClassNames(sankeyValueStyle()))

  const nodeConfig = React.useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        nodes.map((node) => [
          node.id,
          { label: node.label ?? node.id, color: node.color },
        ])
      ),
    [nodes]
  )
  const { hidden, toggle, spotlight, setSpotlight } =
    useChartLegendState(nodeConfig)
  const [active, setActive] = React.useState<number | null>(null)

  const model = React.useMemo(
    () =>
      getSankeyModel({
        nodes,
        links,
        size: size ?? FALLBACK_SIZE,
        fontSize,
        hidden,
        formatValue,
      }),
    [nodes, links, size, fontSize, hidden, formatValue]
  )
  const colors = useChartColors(model.series.map((item) => item.paint))
  const dataVersion = React.useMemo(
    () => ({ nodes, links, hidden }),
    [nodes, links, hidden]
  )
  const reveal = useChartReveal(size !== null, animate)
  const drawn = useChartTween<SankeyGeometry>(
    size ? model : NO_GEOMETRY,
    interpolateSankey,
    animate ? dataVersion : null
  )

  const markCount = model.links.length + model.nodes.length
  const activeIndex = active !== null && active < markCount ? active : null
  const spotlightIndex =
    spotlight === null
      ? -1
      : model.nodes.findIndex((node) => node.id === spotlight)
  const highlight =
    activeIndex !== null
      ? getSankeyHighlight(model, activeIndex)
      : spotlightIndex >= 0
        ? getSankeyHighlight(model, model.links.length + spotlightIndex)
        : null
  const content =
    activeIndex === null
      ? null
      : getSankeyTooltip(model, activeIndex, formatValue)
  const table = React.useMemo(
    () => getSankeyTable(model, formatValue),
    [model, formatValue]
  )

  const inspect = (next: number | null) => {
    setActive(next)
    const mark = next === null ? null : getSankeyMark(model, next)
    if (!onActiveChange) return
    if (!mark) onActiveChange(null)
    else if (mark.kind === "link") {
      onActiveChange({
        index: links.indexOf(mark.link.datum),
        datum: mark.link.datum,
        key: mark.link.id,
      })
    } else {
      onActiveChange({
        index: nodes.indexOf(mark.node.datum),
        datum: mark.node.datum,
        key: mark.node.id,
      })
    }
  }

  const isEmpty = model.links.length === 0
  const mark = activeIndex === null ? null : getSankeyMark(model, activeIndex)
  const anchor =
    mark === null
      ? null
      : mark.kind === "link"
        ? {
            x: (mark.link.x0 + mark.link.x1) / 2,
            y: Math.min(mark.link.sourceTop, mark.link.targetTop),
          }
        : {
            x: mark.node.x + mark.node.width / 2,
            y: mark.node.y,
          }
  const revealWidth =
    reveal >= 1 ? (size?.width ?? 0) : (size?.width ?? 0) * reveal

  return (
    <View
      data-slot="sankey-chart"
      data-loading={loading}
      aria-busy={loading}
      className={cn("cn-sankey-chart flex-col", className)}
      {...props}
    >
      <View
        data-slot="chart-plot"
        data-loading={loading}
        onLayout={onLayout}
        className="cn-chart-plot relative min-h-0 flex-1"
      >
        {size && !isEmpty && (
          <Svg
            width={size.width}
            height={size.height}
            style={{ position: "absolute" }}
            importantForAccessibility="no-hide-descendants"
          >
            <Defs>
              <ClipPath id={`${id}-reveal`}>
                <Rect
                  x={-8}
                  y={-8}
                  width={revealWidth + 8}
                  height={size.height + 16}
                />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#${id}-reveal)`}>
              {drawn.links.map((link) => {
                const isLit = highlight?.links.has(link.id) ?? false
                const isDimmed =
                  link.isLeaving === true || (highlight !== null && !isLit)
                return (
                  <Path
                    key={link.id}
                    data-slot="sankey-chart-link"
                    d={getSankeyLinkPath(link)}
                    fill={getChartColor(link.paint, colors)}
                    fillOpacity={
                      isLit ? SANKEY_LINK_ACTIVE_WASH : SANKEY_LINK_WASH
                    }
                    opacity={isDimmed ? linkDimmed : 1}
                  />
                )
              })}
              {drawn.nodes.map((node) => {
                const isDimmed =
                  node.isLeaving === true ||
                  (highlight !== null && !highlight.nodes.has(node.id))
                return (
                  <Rect
                    key={node.id}
                    data-slot="sankey-chart-node"
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={Math.max(0, node.height)}
                    rx={Math.min(SANKEY_NODE_RADIUS, node.height / 2)}
                    fill={getChartColor(node.paint, colors)}
                    opacity={isDimmed ? nodeDimmed : 1}
                  />
                )
              })}
            </G>
            {drawn.nodes.map((node) => {
              if (node.isLeaving) return null
              const labels = getSankeyLabels(node, fontSize)
              if (!labels.name) return null
              const isDimmed =
                highlight !== null && !highlight.nodes.has(node.id)
              return (
                <G
                  key={node.id}
                  data-slot="sankey-chart-label"
                  opacity={
                    getStaggeredProgress(
                      reveal,
                      node.column,
                      Math.max(1, model.columns)
                    ) * (isDimmed ? labelDimmed : 1)
                  }
                >
                  <SvgText
                    x={labels.name.x}
                    y={labels.name.y}
                    textAnchor={labels.name.anchor}
                    fill={nameText.color}
                    fontSize={fontSize}
                    fontWeight={nameText.fontWeight}
                    fontFamily="Inter"
                  >
                    {node.label}
                  </SvgText>
                  {labels.value && (
                    <SvgText
                      x={labels.value.x}
                      y={labels.value.y}
                      textAnchor={labels.value.anchor}
                      fill={valueText.color}
                      fontSize={fontSize}
                      fontFamily="Inter"
                    >
                      {node.valueText}
                    </SvgText>
                  )}
                </G>
              )
            })}
          </Svg>
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
            count={model.links.length}
            active={
              activeIndex !== null && activeIndex < model.links.length
                ? activeIndex
                : null
            }
            onActiveChange={inspect}
            getIndexAt={(point) => getSankeyMarkAt(model, point)}
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
      {legend && (
        <ChartLegend
          series={model.series}
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

export { SankeyChart, type SankeyChartProps }
