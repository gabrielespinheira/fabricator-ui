// Sankey diagrams: volumes flowing between nodes, left to right. The layout
// is ours (d3-sankey is unmaintained): nodes go in columns by their longest
// path from a source, sinks in the last column; a node is as tall as the
// larger of what flows in and out; a few passes of relaxation move nodes
// towards their neighbours so links run straight, and each link is a ribbon
// as thick as its value, ordered at both ends so links don't cross needlessly.

import {
  estimateTextWidth,
  formatChartNumber,
  formatChartPercent,
  getChartPaint,
  interpolateNumber,
  type ChartColor,
  type ChartPaint,
  type ChartPoint,
  type ChartSeries,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

type SankeyNodeDatum = { id: string; label?: string; color?: ChartColor }

type SankeyLinkDatum = { source: string; target: string; value: number }

type SankeyErrorCode = "cycle" | "unknown-node" | "duplicate-node"

/**
 * Data a Sankey can't be drawn from: links that loop back (`cycle`, with the
 * loop's nodes in order), a link to a node that isn't in `nodes`
 * (`unknown-node`), or two nodes with one id (`duplicate-node`).
 */
class SankeyLayoutError extends Error {
  readonly code: SankeyErrorCode
  readonly nodes: string[]

  constructor(code: SankeyErrorCode, nodes: string[], message: string) {
    super(message)
    this.name = "SankeyLayoutError"
    this.code = code
    this.nodes = nodes
  }
}

type SankeyNode<TNode extends SankeyNodeDatum = SankeyNodeDatum> = {
  id: string
  label: string
  paint: ChartPaint
  datum: TNode
  column: number
  x: number
  y: number
  width: number
  height: number
  valueIn: number
  valueOut: number
  /** The larger of what flows in and out: the node's height. */
  value: number
  valueText: string
  /** Labels go after the node, or before it in the last column. */
  labelSide: "before" | "after"
  /** How many label lines fit: the name and value, the name, or none. */
  labelLines: 0 | 1 | 2
  isLeaving?: boolean
}

type SankeyLink<TLink extends SankeyLinkDatum = SankeyLinkDatum> = {
  id: string
  source: string
  target: string
  value: number
  datum: TLink
  /** The source node's colour, which the ribbon washes in. */
  paint: ChartPaint
  /** The ribbon's ends: the source's end edge and the target's start edge. */
  x0: number
  x1: number
  sourceTop: number
  sourceBottom: number
  targetTop: number
  targetBottom: number
  /** The link's part of everything leaving its source, 0 to 1. */
  share: number
  isLeaving?: boolean
}

type SankeyGeometry<
  TNode extends SankeyNodeDatum = SankeyNodeDatum,
  TLink extends SankeyLinkDatum = SankeyLinkDatum,
> = {
  nodes: SankeyNode<TNode>[]
  links: SankeyLink<TLink>[]
}

type SankeyModel<
  TNode extends SankeyNodeDatum = SankeyNodeDatum,
  TLink extends SankeyLinkDatum = SankeyLinkDatum,
> = SankeyGeometry<TNode, TLink> & {
  /** Every node in data order, hidden ones included: the legend's series. */
  series: ChartSeries[]
  columns: number
}

/** A mark the pointer, a finger or the keyboard can inspect. */
type SankeyMark<
  TNode extends SankeyNodeDatum = SankeyNodeDatum,
  TLink extends SankeyLinkDatum = SankeyLinkDatum,
> =
  | { kind: "link"; link: SankeyLink<TLink> }
  | { kind: "node"; node: SankeyNode<TNode> }

type SankeyText = { x: number; y: number; anchor: "start" | "end" }

type SankeyLabels = { name: SankeyText | null; value: SankeyText | null }

const SANKEY_NODE_WIDTH = 10
/** A node bar's corner radius, smaller on bars too short to hold it. */
const SANKEY_NODE_RADIUS = 3
const NODE_PADDING = 16
const ITERATIONS = 6
const LABEL_GAP = 6
const LINE_HEIGHT = 1.3
const CENTER_BASELINE = 0.35
/** Hit regions reach at least this far across, however thin the mark. */
const MIN_REACH = 24
const MIN_LINK_REACH = 8

/** The wash a link rests at, and the deeper one it takes when highlighted. */
const SANKEY_LINK_WASH = 0.22
const SANKEY_LINK_ACTIVE_WASH = 0.45

function formatDefault(value: number) {
  return formatChartNumber(value)
}

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function center(node: { y: number; height: number }) {
  return node.y + node.height / 2
}

/**
 * Every node's column: the longest path to it from a source. Throws a
 * `SankeyLayoutError` for a cycle, with the loop's nodes in order.
 */
function getColumns(ids: readonly string[], outgoing: Map<string, string[]>) {
  const state = new Map<string, "visiting" | "done">()
  const stack: string[] = []
  const order: string[] = []
  const visit = (id: string) => {
    state.set(id, "visiting")
    stack.push(id)
    for (const next of outgoing.get(id) ?? []) {
      const seen = state.get(next)
      if (seen === "visiting") {
        const loop = [...stack.slice(stack.indexOf(next)), next]
        throw new SankeyLayoutError(
          "cycle",
          loop,
          `Sankey links can't loop: ${loop.join(" → ")}`
        )
      }
      if (seen === undefined) visit(next)
    }
    stack.pop()
    state.set(id, "done")
    order.push(id)
  }
  for (const id of ids) if (!state.has(id)) visit(id)

  const columns = new Map(ids.map((id) => [id, 0]))
  for (const id of order.reverse()) {
    const column = columns.get(id) ?? 0
    for (const next of outgoing.get(id) ?? []) {
      columns.set(next, Math.max(columns.get(next) ?? 0, column + 1))
    }
  }
  // Sinks go in the last column, so every flow ends at the same edge.
  const last = Math.max(0, ...columns.values())
  for (const id of ids) {
    if ((outgoing.get(id) ?? []).length === 0) columns.set(id, last)
  }
  return columns
}

type LayoutNode = { id: string; order: number; y: number; height: number }

/**
 * Pushes overlapping nodes in a column apart, keeping `padding` between
 * them and every node inside the plot, and sorts the column top to bottom.
 */
function resolveCollisions(
  column: LayoutNode[],
  padding: number,
  height: number
) {
  column.sort((a, b) => a.y - b.y || a.order - b.order)
  let edge = 0
  for (const node of column) {
    if (node.y < edge) node.y = edge
    edge = node.y + node.height + padding
  }
  edge = height
  for (let index = column.length - 1; index >= 0; index--) {
    const node = column[index]
    if (node.y + node.height > edge) node.y = edge - node.height
    edge = node.y - padding
  }
}

function getSankeyModel<
  TNode extends SankeyNodeDatum,
  TLink extends SankeyLinkDatum,
>({
  nodes,
  links,
  size,
  fontSize,
  hidden,
  formatValue = formatDefault,
  nodeWidth = SANKEY_NODE_WIDTH,
  nodePadding = NODE_PADDING,
  iterations = ITERATIONS,
}: {
  nodes: readonly TNode[]
  links: readonly TLink[]
  size: ChartSize
  fontSize: number
  hidden?: ReadonlySet<string>
  formatValue?: (value: number, key: string) => string
  nodeWidth?: number
  nodePadding?: number
  iterations?: number
}): SankeyModel<TNode, TLink> {
  const byId = new Map<string, { datum: TNode; order: number }>()
  nodes.forEach((datum, order) => {
    if (byId.has(datum.id)) {
      throw new SankeyLayoutError(
        "duplicate-node",
        [datum.id],
        `Two Sankey nodes have the id "${datum.id}"`
      )
    }
    byId.set(datum.id, { datum, order })
  })
  for (const link of links) {
    for (const id of [link.source, link.target]) {
      if (!byId.has(id)) {
        throw new SankeyLayoutError(
          "unknown-node",
          [id],
          `A Sankey link names "${id}", which isn't in nodes`
        )
      }
    }
  }
  const series: ChartSeries[] = nodes.map((datum, order) => ({
    key: datum.id,
    label: datum.label ?? datum.id,
    paint: getChartPaint(datum.color, order),
    dashed: false,
  }))
  const seriesById = new Map(series.map((item) => [item.key, item]))

  const kept = links.filter(
    (link) =>
      Number.isFinite(link.value) &&
      link.value > 0 &&
      !hidden?.has(link.source) &&
      !hidden?.has(link.target)
  )
  const outgoing = new Map<string, string[]>()
  for (const link of kept) {
    outgoing.set(link.source, [
      ...(outgoing.get(link.source) ?? []),
      link.target,
    ])
  }
  const ids = nodes
    .map((datum) => datum.id)
    .filter((id) =>
      kept.some((link) => link.source === id || link.target === id)
    )
  if (ids.length === 0 || size.width <= 0 || size.height <= 0) {
    return { nodes: [], links: [], series, columns: 0 }
  }
  const columnOf = getColumns(ids, outgoing)
  const columnCount = Math.max(...columnOf.values()) + 1

  const valueIn = new Map(ids.map((id) => [id, 0]))
  const valueOut = new Map(ids.map((id) => [id, 0]))
  for (const link of kept) {
    valueOut.set(link.source, (valueOut.get(link.source) ?? 0) + link.value)
    valueIn.set(link.target, (valueIn.get(link.target) ?? 0) + link.value)
  }
  const valueOf = (id: string) =>
    Math.max(valueIn.get(id) ?? 0, valueOut.get(id) ?? 0)

  const columns: LayoutNode[][] = Array.from({ length: columnCount }, () => [])
  for (const id of ids) {
    columns[columnOf.get(id) ?? 0].push({
      id,
      order: byId.get(id)?.order ?? 0,
      y: 0,
      height: 0,
    })
  }
  const tallest = Math.max(...columns.map((column) => column.length))
  const padding = Math.min(
    nodePadding,
    (size.height * 0.5) / Math.max(1, tallest - 1)
  )
  const scale = Math.min(
    ...columns
      .filter((column) => column.length > 0)
      .map(
        (column) =>
          (size.height - (column.length - 1) * padding) /
          sum(column.map((node) => valueOf(node.id)))
      )
  )
  const layout = new Map<string, LayoutNode>()
  for (const column of columns) {
    let y = 0
    for (const node of column) {
      node.height = valueOf(node.id) * scale
      node.y = y
      y += node.height + padding
      layout.set(node.id, node)
    }
    // Start each column centred; relaxation moves nodes from there.
    const offset = (size.height - (y - padding)) / 2
    for (const node of column) node.y += offset
  }

  // Relaxation: each node moves towards the weighted centre of the nodes
  // it flows from (left to right) or into (right to left), then the column
  // pushes overlapping nodes apart.
  const relax = (
    column: LayoutNode[],
    neighbours: (id: string) => { id: string; value: number }[],
    alpha: number
  ) => {
    for (const node of column) {
      const weights = neighbours(node.id)
      const total = sum(weights.map((weight) => weight.value))
      if (total <= 0) continue
      const target =
        sum(
          weights.map(
            (weight) =>
              weight.value *
              center(layout.get(weight.id) ?? { y: 0, height: 0 })
          )
        ) / total
      node.y += (target - center(node)) * alpha
    }
    resolveCollisions(column, padding, size.height)
  }
  const sources = (id: string) =>
    kept
      .filter((link) => link.target === id)
      .map((link) => ({ id: link.source, value: link.value }))
  const targets = (id: string) =>
    kept
      .filter((link) => link.source === id)
      .map((link) => ({ id: link.target, value: link.value }))
  for (const column of columns) resolveCollisions(column, padding, size.height)
  for (let pass = 0; pass < iterations; pass++) {
    const alpha = 0.99 ** pass
    for (let index = columnCount - 2; index >= 0; index--) {
      relax(columns[index], targets, alpha)
    }
    for (let index = 1; index < columnCount; index++) {
      relax(columns[index], sources, alpha)
    }
  }

  const xOf = (column: number) =>
    columnCount <= 1
      ? 0
      : (column * (size.width - nodeWidth)) / (columnCount - 1)
  const columnGap = columnCount <= 1 ? size.width : xOf(1) - xOf(0) - nodeWidth
  const lineHeight = fontSize * LINE_HEIGHT

  const sankeyNodes: SankeyNode<TNode>[] = []
  columns.forEach((column, columnIndex) => {
    const isLast = columnIndex === columnCount - 1 && columnCount > 1
    column.forEach((node, position) => {
      const entry = byId.get(node.id)
      const item = seriesById.get(node.id)
      if (!entry || !item) return
      const value = valueOf(node.id)
      const valueText = formatValue(value, "value")
      // A label is centred on its node; it may spread into half of the gap
      // to each neighbour, or to the plot's edge.
      const previous = column[position - 1]
      const next = column[position + 1]
      const roomAbove = previous
        ? (node.y - (previous.y + previous.height)) / 2
        : node.y
      const roomBelow = next
        ? (next.y - (node.y + node.height)) / 2
        : size.height - (node.y + node.height)
      const fitsLines = (lines: number) =>
        (lines * lineHeight - node.height) / 2 <= Math.min(roomAbove, roomBelow)
      const room = columnGap - LABEL_GAP * 2
      const nameWidth = estimateTextWidth(item.label, fontSize)
      const valueWidth = estimateTextWidth(valueText, fontSize)
      const labelLines =
        nameWidth <= room && valueWidth <= room && fitsLines(2)
          ? 2
          : nameWidth <= room && fitsLines(1)
            ? 1
            : 0
      sankeyNodes.push({
        id: node.id,
        label: item.label,
        paint: item.paint,
        datum: entry.datum,
        column: columnIndex,
        x: xOf(columnIndex),
        y: node.y,
        width: nodeWidth,
        height: node.height,
        valueIn: valueIn.get(node.id) ?? 0,
        valueOut: valueOut.get(node.id) ?? 0,
        value,
        valueText,
        labelSide: isLast ? "before" : "after",
        labelLines,
      })
    })
  })
  const placed = new Map(sankeyNodes.map((node) => [node.id, node]))

  // Each node stacks its links in the order of the nodes at their other
  // ends, centred on it, so neighbouring links leave side by side.
  const seenIds = new Set<string>()
  const linkIds = kept.map((link, position) => {
    const base = `${link.source}→${link.target}`
    const id = seenIds.has(base) ? `${base}#${position}` : base
    seenIds.add(id)
    return id
  })
  const sourceTops = new Map<number, number>()
  const targetTops = new Map<number, number>()
  for (const node of sankeyNodes) {
    const stack = (
      side: "source" | "target",
      tops: Map<number, number>,
      total: number
    ) => {
      const other = side === "source" ? "target" : "source"
      const entries = kept
        .map((link, position) => ({ link, position }))
        .filter(({ link }) => link[side] === node.id)
        .sort((a, b) => {
          const first = placed.get(a.link[other])
          const second = placed.get(b.link[other])
          return (
            (first ? center(first) : 0) - (second ? center(second) : 0) ||
            a.position - b.position
          )
        })
      let y = node.y + (node.height - total * scale) / 2
      for (const { link, position } of entries) {
        tops.set(position, y)
        y += link.value * scale
      }
    }
    stack("source", sourceTops, node.valueOut)
    stack("target", targetTops, node.valueIn)
  }

  const sankeyLinks = kept.flatMap((link, position): SankeyLink<TLink>[] => {
    const source = placed.get(link.source)
    const target = placed.get(link.target)
    if (!source || !target) return []
    const thickness = link.value * scale
    const sourceTop = sourceTops.get(position) ?? source.y
    const targetTop = targetTops.get(position) ?? target.y
    return [
      {
        id: linkIds[position],
        source: link.source,
        target: link.target,
        value: link.value,
        datum: link,
        paint: source.paint,
        x0: source.x + source.width,
        x1: target.x,
        sourceTop,
        sourceBottom: sourceTop + thickness,
        targetTop,
        targetBottom: targetTop + thickness,
        share: source.valueOut > 0 ? link.value / source.valueOut : 0,
      },
    ]
  })
  const columnOfNode = (id: string) => placed.get(id)?.column ?? 0
  sankeyLinks.sort(
    (a, b) =>
      columnOfNode(a.source) - columnOfNode(b.source) ||
      a.sourceTop - b.sourceTop ||
      a.targetTop - b.targetTop
  )

  return {
    nodes: sankeyNodes,
    links: sankeyLinks,
    series,
    columns: columnCount,
  }
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * A link as a ribbon: two cubic curves, one along each edge, that leave the
 * source level and arrive at the target level, closed into one shape.
 */
function getSankeyLinkPath(
  link: Pick<
    SankeyLink,
    "x0" | "x1" | "sourceTop" | "sourceBottom" | "targetTop" | "targetBottom"
  >
) {
  const [x0, x1, middle] = [link.x0, link.x1, (link.x0 + link.x1) / 2].map(
    round
  )
  const [sourceTop, sourceBottom, targetTop, targetBottom] = [
    link.sourceTop,
    link.sourceBottom,
    link.targetTop,
    link.targetBottom,
  ].map(round)
  return `M${x0},${sourceTop}C${middle},${sourceTop} ${middle},${targetTop} ${x1},${targetTop}L${x1},${targetBottom}C${middle},${targetBottom} ${middle},${sourceBottom} ${x0},${sourceBottom}Z`
}

/** Where a node's name and value go, against the node as it's now drawn. */
function getSankeyLabels(
  node: Pick<
    SankeyNode,
    "x" | "y" | "width" | "height" | "labelSide" | "labelLines"
  >,
  fontSize: number
): SankeyLabels {
  if (node.labelLines === 0) return { name: null, value: null }
  const isAfter = node.labelSide === "after"
  const x = isAfter ? node.x + node.width + LABEL_GAP : node.x - LABEL_GAP
  const anchor = isAfter ? "start" : "end"
  const middle = center(node) + fontSize * CENTER_BASELINE
  if (node.labelLines === 1) {
    return { name: { x, y: middle, anchor }, value: null }
  }
  const half = (fontSize * LINE_HEIGHT) / 2
  return {
    name: { x, y: middle - half, anchor },
    value: { x, y: middle + half, anchor },
  }
}

// Where the ribbon's curves are at an x, as a share of the way from the
// source level to the target level: the curves' control points sit at the
// middle, so x and y both follow fixed polynomials of the curve's t.
function getRibbonBlend(link: Pick<SankeyLink, "x0" | "x1">, x: number) {
  const span = link.x1 - link.x0
  if (span <= 0) return 0
  const along = (x - link.x0) / span
  let low = 0
  let high = 1
  for (let step = 0; step < 24; step++) {
    const t = (low + high) / 2
    if (1.5 * t - 1.5 * t * t + t * t * t < along) low = t
    else high = t
  }
  const t = (low + high) / 2
  return 3 * t * t - 2 * t * t * t
}

/**
 * The mark under a point, as an inspector index: links first, in reading
 * order, then nodes. A node's reach is at least 24px wide; a link's at least
 * 8px tall. Where links cross, the one whose middle is nearest wins. -1 for
 * none.
 */
function getSankeyMarkAt(model: SankeyGeometry, point: ChartPoint) {
  const nodeIndex = model.nodes.findIndex((node) => {
    const reachX = Math.max(0, (MIN_REACH - node.width) / 2)
    const reachY = Math.max(2, (MIN_LINK_REACH - node.height) / 2)
    return (
      point.x >= node.x - reachX &&
      point.x <= node.x + node.width + reachX &&
      point.y >= node.y - reachY &&
      point.y <= node.y + node.height + reachY
    )
  })
  if (nodeIndex >= 0) return model.links.length + nodeIndex

  let best = -1
  let bestDistance = Number.POSITIVE_INFINITY
  model.links.forEach((link, index) => {
    if (point.x < link.x0 || point.x > link.x1) return
    const blend = getRibbonBlend(link, point.x)
    const top = interpolateNumber(link.sourceTop, link.targetTop, blend)
    const bottom = interpolateNumber(
      link.sourceBottom,
      link.targetBottom,
      blend
    )
    const middle = (top + bottom) / 2
    const reach = Math.max(bottom - top, MIN_LINK_REACH) / 2
    const distance = Math.abs(point.y - middle)
    if (distance <= reach && distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

/** The link or node behind an inspector index: links first, then nodes. */
function getSankeyMark<
  TNode extends SankeyNodeDatum,
  TLink extends SankeyLinkDatum,
>(
  model: SankeyGeometry<TNode, TLink>,
  index: number
): SankeyMark<TNode, TLink> | null {
  const link = model.links[index]
  if (link) return { kind: "link", link }
  const node = model.nodes[index - model.links.length]
  return node ? { kind: "node", node } : null
}

/**
 * What stays lit while a mark is inspected: a node, every link touching it
 * and the nodes at those links' other ends, or a link and the two nodes it
 * joins. Everything else dims.
 */
function getSankeyHighlight(model: SankeyGeometry, index: number) {
  const mark = getSankeyMark(model, index)
  if (!mark) return null
  if (mark.kind === "link") {
    return {
      nodes: new Set([mark.link.source, mark.link.target]),
      links: new Set([mark.link.id]),
    }
  }
  const { id } = mark.node
  const touching = model.links.filter(
    (link) => link.source === id || link.target === id
  )
  return {
    nodes: new Set([
      id,
      ...touching.map((link) =>
        link.source === id ? link.target : link.source
      ),
    ]),
    links: new Set(touching.map((link) => link.id)),
  }
}

function blendNode<TNode extends SankeyNodeDatum>(
  from: SankeyNode<TNode>,
  to: SankeyNode<TNode>,
  progress: number
): SankeyNode<TNode> {
  return {
    ...to,
    x: interpolateNumber(from.x, to.x, progress),
    y: interpolateNumber(from.y, to.y, progress),
    height: interpolateNumber(from.height, to.height, progress),
  }
}

function collapseNode<TNode extends SankeyNodeDatum>(
  node: SankeyNode<TNode>
): SankeyNode<TNode> {
  return { ...node, y: center(node), height: 0 }
}

function blendLink<TLink extends SankeyLinkDatum>(
  from: SankeyLink<TLink>,
  to: SankeyLink<TLink>,
  progress: number
): SankeyLink<TLink> {
  const blend = (
    key:
      | "x0"
      | "x1"
      | "sourceTop"
      | "sourceBottom"
      | "targetTop"
      | "targetBottom"
  ) => interpolateNumber(from[key], to[key], progress)
  return {
    ...to,
    x0: blend("x0"),
    x1: blend("x1"),
    sourceTop: blend("sourceTop"),
    sourceBottom: blend("sourceBottom"),
    targetTop: blend("targetTop"),
    targetBottom: blend("targetBottom"),
  }
}

function collapseLink<TLink extends SankeyLinkDatum>(
  link: SankeyLink<TLink>
): SankeyLink<TLink> {
  const source = (link.sourceTop + link.sourceBottom) / 2
  const target = (link.targetTop + link.targetBottom) / 2
  return {
    ...link,
    sourceTop: source,
    sourceBottom: source,
    targetTop: target,
    targetBottom: target,
  }
}

function interpolateById<TItem extends { id: string; isLeaving?: boolean }>(
  from: readonly TItem[],
  to: readonly TItem[],
  progress: number,
  blend: (from: TItem, to: TItem, progress: number) => TItem,
  collapse: (item: TItem) => TItem
) {
  const previous = new Map(from.map((item) => [item.id, item]))
  const next = new Set(to.map((item) => item.id))
  return [
    ...to.map((item) =>
      blend(previous.get(item.id) ?? collapse(item), item, progress)
    ),
    ...from
      .filter((item) => !next.has(item.id))
      .map((item) => ({
        ...blend(item, collapse(item), progress),
        isLeaving: true,
      })),
  ]
}

/**
 * The diagram between two layouts, keyed by node and link ids. What stays
 * moves and resizes; a new node or link grows from its middle, a leaving one
 * thins into it, marked `isLeaving`. Null when no node is in both.
 */
function interpolateSankey<
  TNode extends SankeyNodeDatum,
  TLink extends SankeyLinkDatum,
>(
  from: SankeyGeometry<TNode, TLink>,
  to: SankeyGeometry<TNode, TLink>,
  progress: number
): SankeyGeometry<TNode, TLink> | null {
  const previous = new Set(from.nodes.map((node) => node.id))
  if (!to.nodes.some((node) => previous.has(node.id))) return null
  return {
    nodes: interpolateById(
      from.nodes,
      to.nodes,
      progress,
      blendNode,
      collapseNode
    ),
    links: interpolateById(
      from.links,
      to.links,
      progress,
      blendLink,
      collapseLink
    ),
  }
}

function getLinkTitle(model: SankeyModel, link: SankeyLink) {
  const label = (id: string) =>
    model.series.find((item) => item.key === id)?.label ?? id
  return `${label(link.source)} → ${label(link.target)}`
}

/**
 * A link's flow and its share of its source's outflow, or a node's totals
 * in and out (sources have only out, sinks only in).
 */
function getSankeyTooltip(
  model: SankeyModel,
  index: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  const mark = getSankeyMark(model, index)
  if (!mark) return { title: "", rows: [] }
  if (mark.kind === "link") {
    const { link } = mark
    const source =
      model.series.find((item) => item.key === link.source)?.label ??
      link.source
    return {
      title: getLinkTitle(model, link),
      rows: [
        {
          key: link.id,
          label: "Flow",
          paint: link.paint,
          dashed: false,
          value: formatValue(link.value, "value"),
        },
        {
          key: "share",
          label: `Of ${source}`,
          paint: { value: "transparent" },
          dashed: false,
          value: formatChartPercent(link.share),
        },
      ],
    }
  }
  const { node } = mark
  const rows = [
    { key: "in", label: "In", total: node.valueIn },
    { key: "out", label: "Out", total: node.valueOut },
  ]
    .filter((row) => row.total > 0)
    .map((row) => ({
      key: row.key,
      label: row.label,
      paint: node.paint,
      dashed: false,
      value: formatValue(row.total, "value"),
    }))
  return { title: node.label, rows }
}

/** Every link as a row, in reading order: its flow and share of its source. */
function getSankeyTable(
  model: SankeyModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  return {
    columns: ["Flow", "Share of source"],
    rows: model.links.map((link) => ({
      header: getLinkTitle(model, link),
      cells: [formatValue(link.value, "value"), formatChartPercent(link.share)],
    })),
  }
}

export type {
  SankeyErrorCode,
  SankeyGeometry,
  SankeyLabels,
  SankeyLink,
  SankeyLinkDatum,
  SankeyMark,
  SankeyModel,
  SankeyNode,
  SankeyNodeDatum,
  SankeyText,
}

export {
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
  SANKEY_NODE_WIDTH,
  SankeyLayoutError,
}
