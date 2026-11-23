"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getStaggeredProgress,
  type ChartActive,
  type ChartConfig,
} from "@/registry/bases/__base__/lib/chart-model"
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
} from "@/registry/bases/__base__/lib/chart-sankey-model"
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

// Flow volumes between stages: nodes in columns, each as tall as what flows
// through it, joined by ribbons as thick as each flow and washed in their
// source's colour. Pointing at a node or a link lights it and what it
// touches. Links extend from their sources the first time the diagram is on
// screen, and nodes and links morph when the data changes.

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
} & Omit<React.ComponentProps<"div">, "children">

const FALLBACK_SIZE = { width: 480, height: 288 }
const NO_GEOMETRY: SankeyGeometry = { nodes: [], links: [] }

function getMarkId(mark: { id: string }) {
  return mark.id
}

function toSvgId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "")
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
  const { ref: plotRef, size, fontSize } = useChartSize<HTMLDivElement>()
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
  const dataVersion = React.useMemo(
    () => ({ nodes, links, hidden }),
    [nodes, links, hidden]
  )
  const reveal = useChartReveal(plotRef, animate)
  const drawn = useChartTween<SankeyGeometry>(
    plotRef,
    size ? model : NO_GEOMETRY,
    interpolateSankey,
    animate ? dataVersion : null
  )
  const drawnLinks = useChartDrawOrder(drawn.links, getMarkId)
  const drawnNodes = useChartDrawOrder(drawn.nodes, getMarkId)

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
  // The readout outlives inspection by the tooltip role's exit, to fade out.
  // The highlight follows the live index.
  const shown = useChartPresence(plotRef, activeIndex)
  const shownIndex =
    shown.value !== null && shown.value < markCount ? shown.value : null
  const content =
    shownIndex === null
      ? null
      : getSankeyTooltip(model, shownIndex, formatValue)
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
  const target = shownIndex === null ? null : getSankeyMark(model, shownIndex)
  // The tooltip points at the mark as drawn now, so during a morph it
  // travels with the ribbon or node instead of arriving first.
  const drawnLink =
    target?.kind === "link"
      ? (drawn.links.find(
          (link) => link.id === target.link.id && !link.isLeaving
        ) ?? target.link)
      : null
  const drawnNode =
    target?.kind === "node"
      ? (drawn.nodes.find(
          (node) => node.id === target.node.id && !node.isLeaving
        ) ?? target.node)
      : null
  const anchor = drawnLink
    ? {
        x: (drawnLink.x0 + drawnLink.x1) / 2,
        y:
          (drawnLink.sourceTop +
            drawnLink.sourceBottom +
            drawnLink.targetTop +
            drawnLink.targetBottom) /
          4,
      }
    : drawnNode
      ? {
          x: drawnNode.x + drawnNode.width,
          y: drawnNode.y + drawnNode.height / 2,
        }
      : null
  const revealWidth =
    reveal >= 1 ? (size?.width ?? 0) : (size?.width ?? 0) * reveal

  return (
    <div
      data-slot="sankey-chart"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn("cn-sankey-chart flex flex-col", className)}
      {...props}
    >
      <div
        ref={plotRef}
        data-slot="chart-plot"
        className={cn(
          "cn-chart-plot relative min-h-0 flex-1",
          "cn-sankey-chart-plot"
        )}
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
                  x={-8}
                  y={-8}
                  width={revealWidth + 8}
                  height={size.height + 16}
                />
              </clipPath>
            </defs>
            <g clipPath={`url(#${id}-reveal)`}>
              {drawnLinks.map((link) => {
                const isLit = highlight?.links.has(link.id) ?? false
                return (
                  <path
                    key={link.id}
                    data-slot="sankey-chart-link"
                    data-leaving={link.isLeaving || undefined}
                    data-dimmed={
                      (!link.isLeaving && highlight !== null && !isLit) ||
                      undefined
                    }
                    className="cn-sankey-chart-link"
                    d={getSankeyLinkPath(link)}
                    fill={getChartColor(link.paint)}
                    fillOpacity={
                      isLit ? SANKEY_LINK_ACTIVE_WASH : SANKEY_LINK_WASH
                    }
                  />
                )
              })}
              {drawnNodes.map((node) => (
                <rect
                  key={node.id}
                  data-slot="sankey-chart-node"
                  data-leaving={node.isLeaving || undefined}
                  data-dimmed={
                    (!node.isLeaving &&
                      highlight !== null &&
                      !highlight.nodes.has(node.id)) ||
                    undefined
                  }
                  className="cn-sankey-chart-node"
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={Math.max(0, node.height)}
                  rx={Math.min(SANKEY_NODE_RADIUS, node.height / 2)}
                  fill={getChartColor(node.paint)}
                />
              ))}
            </g>
            {drawnNodes.map((node) => {
              const labels = getSankeyLabels(node, fontSize)
              if (!labels.name) return null
              return (
                // The draw-in fades labels in column by column on the outer
                // group; the middle one fades them in and out with their node
                // on the move role, and the inner one dims on the feedback
                // role, so no fade retimes another.
                <g
                  key={node.id}
                  opacity={getStaggeredProgress(
                    reveal,
                    node.column,
                    Math.max(1, model.columns)
                  )}
                >
                  <g
                    data-leaving={node.isLeaving || undefined}
                    className="cn-chart-label-presence"
                  >
                    <g
                      data-slot="sankey-chart-label"
                      data-dimmed={
                        (!node.isLeaving &&
                          highlight !== null &&
                          !highlight.nodes.has(node.id)) ||
                        undefined
                      }
                      className="cn-sankey-chart-label"
                      textAnchor={labels.name.anchor}
                    >
                      <text
                        className="cn-sankey-chart-name"
                        x={labels.name.x}
                        y={labels.name.y}
                      >
                        {node.label}
                      </text>
                      {labels.value && (
                        <text
                          className="cn-sankey-chart-value"
                          x={labels.value.x}
                          y={labels.value.y}
                        >
                          {node.valueText}
                        </text>
                      )}
                    </g>
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
            count={model.links.length}
            active={
              activeIndex !== null && activeIndex < model.links.length
                ? activeIndex
                : null
            }
            onActiveChange={inspect}
            getIndexAt={(point) => getSankeyMarkAt(model, point, activeIndex)}
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
      {legend && (
        <ChartLegend
          series={model.series}
          hidden={hidden}
          onToggle={toggle}
          onSpotlight={setSpotlight}
        />
      )}
      <ChartDataTable label={label} table={table} />
    </div>
  )
}

export { SankeyChart, type SankeyChartProps }
