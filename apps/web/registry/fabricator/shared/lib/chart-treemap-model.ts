// Treemaps: parts of a whole, nested. Every leaf is a cell whose area is its
// value, laid out by d3-hierarchy's squarified treemap with 2px of surface
// between cells, and coloured by the top-level group it belongs to. Cells are
// washes of their group's colour with a hairline edge, so the name and value
// inside them keep the text colours and their contrast in both themes.

import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy"

import {
  estimateTextWidth,
  formatChartNumber,
  formatChartPercent,
  getChartPaint,
  interpolateNumber,
  readChartNumber,
  readChartText,
  type ChartConfig,
  type ChartDatum,
  type ChartPaint,
  type ChartPoint,
  type ChartSeries,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

type TreemapRect = { x: number; y: number; width: number; height: number }

type TreemapCell<TDatum extends ChartDatum = ChartDatum> = TreemapRect & {
  /** The names from the group down to the leaf, joined: stable across data. */
  id: string
  name: string
  /** The top-level group's key, which also names its colour. */
  group: string
  paint: ChartPaint
  value: number
  /** The leaf's part of everything drawn, 0 to 1. */
  share: number
  /** The value as the cell writes it. */
  valueText: string
  datum: TDatum
  /** Set while a leaf of a hidden group, or of old data, shrinks away. */
  isLeaving?: boolean
}

type TreemapModel<TDatum extends ChartDatum = ChartDatum> = {
  /** Every group in data order, hidden ones included: the legend's series. */
  groups: ChartSeries[]
  /** The visible leaves, in reading order: group by group, top to bottom. */
  cells: TreemapCell<TDatum>[]
  total: number
  /** Every group is a leaf itself: one level, no group to name. */
  isFlat: boolean
  valueKey: string
}

type TreemapLabels = {
  name: ChartPoint | null
  value: ChartPoint | null
}

/** The gap of surface between neighbouring cells. */
const TREEMAP_GAP = 2
/** A cell's corner radius, smaller on cells too small to hold it. */
const TREEMAP_RADIUS = 4

/** The wash a cell rests at, and the deeper one it takes when inspected. */
const TREEMAP_WASH = 0.18
const TREEMAP_ACTIVE_WASH = 0.36

/** The opacity of a cell's hairline edge, in its group's colour. */
const TREEMAP_EDGE = 0.55

const CELL_PADDING = 8
const LINE_HEIGHT = 1.4
// Inter's cap height: a name's baseline sits this far under the padding so
// its capitals line up with the padding on the start edge.
const CAP_HEIGHT = 0.73

type TreeNode<TDatum extends ChartDatum> = {
  id: string
  name: string
  group: string
  value: number
  datum: TDatum | null
  children?: TreeNode<TDatum>[]
}

function isDatum<TDatum extends ChartDatum>(value: unknown): value is TDatum {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readChildren<TDatum extends ChartDatum>(
  datum: TDatum,
  childrenKey: string
): TDatum[] {
  const children = datum[childrenKey]
  return Array.isArray(children) ? children.filter(isDatum<TDatum>) : []
}

/** A name unique among its siblings, so two "Other"s keep their own ids. */
function getUniqueName(name: string, seen: Set<string>, position: number) {
  const unique = seen.has(name) ? `${name}#${position}` : name
  seen.add(unique)
  return unique
}

function buildNode<TDatum extends ChartDatum>(
  datum: TDatum,
  id: string,
  group: string,
  keys: { nameKey: string; valueKey: string; childrenKey: string }
): TreeNode<TDatum> | null {
  const children = readChildren(datum, keys.childrenKey)
  const name = readChartText(datum, keys.nameKey)
  if (children.length === 0) {
    const value = readChartNumber(datum, keys.valueKey) ?? 0
    if (value <= 0) return null
    return { id, name, group, value, datum }
  }
  const seen = new Set<string>()
  const nodes = children
    .map((child, position) =>
      buildNode(
        child,
        `${id}/${getUniqueName(readChartText(child, keys.nameKey), seen, position)}`,
        group,
        keys
      )
    )
    .filter((node): node is TreeNode<TDatum> => node !== null)
  if (nodes.length === 0) return null
  return { id, name, group, value: 0, datum, children: nodes }
}

/**
 * Top first, then start first. Edges within a pixel count as level, so
 * cells laid side by side read as a row.
 */
function compareReadingOrder(a: TreemapRect, b: TreemapRect) {
  if (Math.abs(a.y - b.y) > 1) return a.y - b.y
  return a.x - b.x
}

function formatDefault(value: number) {
  return formatChartNumber(value)
}

/**
 * The top-level groups in data order, each with its colour: the legend's
 * series. A group keeps its slot when another is hidden.
 */
function getTreemapGroups(
  data: readonly ChartDatum[],
  config: ChartConfig | undefined,
  nameKey: string
): ChartSeries[] {
  const seen = new Set<string>()
  return data.map((datum, position) => {
    const name = readChartText(datum, nameKey)
    const entry = config?.[name]
    return {
      key: getUniqueName(name, seen, position),
      label: entry?.label ?? name,
      paint: getChartPaint(entry?.color, position),
      dashed: false,
    }
  })
}

function getTreemapModel<TDatum extends ChartDatum>({
  data,
  config,
  nameKey = "name",
  valueKey = "value",
  childrenKey = "children",
  size,
  hidden,
  formatValue = formatDefault,
}: {
  data: readonly TDatum[]
  config?: ChartConfig
  nameKey?: string
  valueKey?: string
  childrenKey?: string
  size: ChartSize
  hidden?: ReadonlySet<string>
  formatValue?: (value: number, key: string) => string
}): TreemapModel<TDatum> {
  const keys = { nameKey, valueKey, childrenKey }
  const groups = getTreemapGroups(data, config, nameKey)
  const groupKeys = groups.map((group) => group.key)
  const paints = new Map(groups.map((group) => [group.key, group.paint]))
  const isFlat = data.every(
    (datum) => readChildren(datum, childrenKey).length === 0
  )

  const roots = data
    .map((datum, position) =>
      hidden?.has(groupKeys[position])
        ? null
        : buildNode(datum, groupKeys[position], groupKeys[position], keys)
    )
    .filter((node): node is TreeNode<TDatum> => node !== null)

  const root = hierarchy<TreeNode<TDatum>>(
    { id: "", name: "", group: "", value: 0, datum: null, children: roots },
    (node) => node.children
  )
    .sum((node) => (node.children ? 0 : node.value))
    // Largest first, as squarify expects; ties keep the data's order.
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  const total = root.value ?? 0
  if (total <= 0 || size.width <= 0 || size.height <= 0) {
    return { groups, cells: [], total: 0, isFlat, valueKey }
  }
  const laidOut = treemap<TreeNode<TDatum>>()
    .tile(treemapSquarify)
    .size([size.width, size.height])
    .paddingInner(TREEMAP_GAP)
    .round(false)(root)

  const toRect = (node: {
    x0: number
    y0: number
    x1: number
    y1: number
  }) => ({
    x: node.x0,
    y: node.y0,
    width: Math.max(0, node.x1 - node.x0),
    height: Math.max(0, node.y1 - node.y0),
  })

  const groupNodes = [...(laidOut.children ?? [])].sort((a, b) =>
    compareReadingOrder(toRect(a), toRect(b))
  )
  const cells = groupNodes.flatMap((groupNode) =>
    groupNode
      .leaves()
      .sort((a, b) => compareReadingOrder(toRect(a), toRect(b)))
      .flatMap((leaf): TreemapCell<TDatum>[] => {
        const { datum } = leaf.data
        if (!datum) return []
        const value = leaf.value ?? 0
        return [
          {
            ...toRect(leaf),
            id: leaf.data.id,
            name: leaf.data.name,
            group: leaf.data.group,
            paint: paints.get(leaf.data.group) ?? { token: "muted-foreground" },
            value,
            share: value / total,
            valueText: formatValue(value, valueKey),
            datum,
          },
        ]
      })
  )

  return { groups, cells, total, isFlat, valueKey }
}

/**
 * Where a cell's name and value go, measured against the cell as it is now
 * drawn, so a cell that is still growing or shrinking shows only what fits.
 * Points are baselines at the start edge. A label that doesn't fit is
 * dropped, never clipped: the tooltip and the table keep it.
 */
function getTreemapLabels(
  cell: TreemapRect & { name: string; valueText: string },
  fontSize: number
): TreemapLabels {
  const room = cell.width - CELL_PADDING * 2
  const nameFits =
    cell.name !== "" &&
    estimateTextWidth(cell.name, fontSize) <= room &&
    cell.height >= CELL_PADDING * 2 + fontSize
  if (!nameFits) return { name: null, value: null }
  const name = {
    x: cell.x + CELL_PADDING,
    y: cell.y + CELL_PADDING + fontSize * CAP_HEIGHT,
  }
  const valueFits =
    estimateTextWidth(cell.valueText, fontSize) <= room &&
    cell.height >= CELL_PADDING * 2 + fontSize * (1 + LINE_HEIGHT)
  return {
    name,
    value: valueFits ? { x: name.x, y: name.y + fontSize * LINE_HEIGHT } : null,
  }
}

/** The index of the cell under a point, or -1. Gaps count as the nearer cell. */
function getTreemapCellAt(model: TreemapModel, point: ChartPoint) {
  const reach = TREEMAP_GAP / 2
  return model.cells.findIndex(
    (cell) =>
      point.x >= cell.x - reach &&
      point.x <= cell.x + cell.width + reach &&
      point.y >= cell.y - reach &&
      point.y <= cell.y + cell.height + reach
  )
}

/** A rect scaled about its own centre. */
function scaleTreemapRect<TRect extends TreemapRect>(
  rect: TRect,
  scale: number
): TRect {
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  return {
    ...rect,
    x: centerX - (rect.width * scale) / 2,
    y: centerY - (rect.height * scale) / 2,
    width: rect.width * scale,
    height: rect.height * scale,
  }
}

/**
 * A cell during the draw-in: it fades in and scales up from its own centre,
 * from 60% of its size, as its share of the reveal runs from 0 to 1.
 */
function revealTreemapCell<TCell extends TreemapRect>(
  cell: TCell,
  amount: number
): { cell: TCell; opacity: number } {
  if (amount >= 1) return { cell, opacity: 1 }
  return {
    cell: scaleTreemapRect(cell, interpolateNumber(0.6, 1, amount)),
    opacity: amount,
  }
}

function blendCell<TDatum extends ChartDatum>(
  from: TreemapRect,
  to: TreemapCell<TDatum>,
  progress: number
): TreemapCell<TDatum> {
  return {
    ...to,
    x: interpolateNumber(from.x, to.x, progress),
    y: interpolateNumber(from.y, to.y, progress),
    width: interpolateNumber(from.width, to.width, progress),
    height: interpolateNumber(from.height, to.height, progress),
  }
}

/**
 * The cells between two layouts, keyed by their path. A cell that stays
 * moves and resizes; a new one grows from its centre; a leaving one shrinks
 * into its centre, marked `isLeaving`. Null when no cell is in both: there is
 * nothing to follow, so the map redraws.
 */
function interpolateTreemapCells<TDatum extends ChartDatum>(
  from: readonly TreemapCell<TDatum>[],
  to: readonly TreemapCell<TDatum>[],
  progress: number
): TreemapCell<TDatum>[] | null {
  const previous = new Map(from.map((cell) => [cell.id, cell]))
  const next = new Set(to.map((cell) => cell.id))
  if (!to.some((cell) => previous.has(cell.id))) return null
  const moving = to.map((cell) =>
    blendCell(
      previous.get(cell.id) ?? scaleTreemapRect(cell, 0),
      cell,
      progress
    )
  )
  const leaving = from
    .filter((cell) => !next.has(cell.id))
    .map((cell) => ({
      ...blendCell(cell, scaleTreemapRect(cell, 0), progress),
      isLeaving: true,
    }))
  return [...moving, ...leaving]
}

const NO_KEY: ChartPaint = { value: "transparent" }

/** The inspected leaf: its name, its group and value, its share. */
function getTreemapTooltip(
  model: TreemapModel,
  index: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  const cell = model.cells[index]
  if (!cell) return { title: "", rows: [] }
  const group = model.groups.find((item) => item.key === cell.group)
  return {
    title: cell.name,
    rows: [
      {
        key: cell.group,
        label: model.isFlat ? "Value" : (group?.label ?? cell.group),
        paint: cell.paint,
        dashed: false,
        value: formatValue(cell.value, model.valueKey),
      },
      {
        key: "share",
        label: "Share of total",
        paint: NO_KEY,
        dashed: false,
        value: formatChartPercent(cell.share),
      },
    ],
  }
}

/** Every leaf as a row, in reading order: its group, value and share. */
function getTreemapTable(
  model: TreemapModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  const labels = new Map(model.groups.map((group) => [group.key, group.label]))
  return {
    columns: model.isFlat
      ? ["Value", "Share of total"]
      : ["Group", "Value", "Share of total"],
    rows: model.cells.map((cell) => ({
      header: cell.name,
      cells: [
        ...(model.isFlat ? [] : [labels.get(cell.group) ?? cell.group]),
        formatValue(cell.value, model.valueKey),
        formatChartPercent(cell.share),
      ],
    })),
  }
}

export type { TreemapCell, TreemapLabels, TreemapModel, TreemapRect }

export {
  getTreemapCellAt,
  getTreemapGroups,
  getTreemapLabels,
  getTreemapModel,
  getTreemapTable,
  getTreemapTooltip,
  interpolateTreemapCells,
  revealTreemapCell,
  scaleTreemapRect,
  TREEMAP_ACTIVE_WASH,
  TREEMAP_EDGE,
  TREEMAP_GAP,
  TREEMAP_RADIUS,
  TREEMAP_WASH,
}
