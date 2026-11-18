// Funnels: ordered stages losing volume. Each stage is as wide (or, laid on
// its side, as tall) as its value, centred on one axis, and narrows into the
// next through a smooth taper, so the funnel reads as one shape split into
// stages. One hue, in opacity steps that fall with the stage: the order is
// the encoding, and each stage's value sits on a pill of the card.

import {
  estimateTextWidth,
  formatChartNumber,
  formatChartPercent,
  getChartPaint,
  interpolateNumber,
  MISSING_VALUE,
  readChartNumber,
  readChartText,
  type ChartColor,
  type ChartConfig,
  type ChartDatum,
  type ChartPaint,
  type ChartSeries,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

type FunnelOrientation = "vertical" | "horizontal"

type FunnelRect = { x: number; y: number; width: number; height: number }

type FunnelStage<TDatum extends ChartDatum = ChartDatum> = {
  /** The stage's name, kept unique: what a morph follows. */
  id: string
  name: string
  index: number
  value: number | null
  valueText: string
  datum: TDatum
  /** Along the funnel: where the stage starts, its taper starts, it ends. */
  start: number
  flatEnd: number
  end: number
  /** Across it: the centre line, the stage's size and its taper's end size. */
  center: number
  size: number
  nextSize: number
  /** The fill's opacity: one hue, lighter with each stage. */
  opacity: number
  /** The value as a part of the first stage's, 0 to 1. */
  share: number | null
  /** The value as a part of the previous stage's. */
  conversion: number | null
  conversionText: string | null
  /** Set while a stage that left the data shrinks into the centre line. */
  isLeaving?: boolean
}

type FunnelModel<TDatum extends ChartDatum = ChartDatum> = {
  orientation: FunnelOrientation
  /** The value's series: its label and the funnel's one hue. */
  series: ChartSeries
  stages: FunnelStage<TDatum>[]
  /** Each stage's whole band, for the highlight and the pointer. */
  bands: FunnelRect[]
  /** Each band's centre along the funnel, for snapping. */
  centers: number[]
  /** Where names go: the x they start at, or the baseline of the row under
   * a horizontal funnel. */
  nameEdge: number
  /** How long a name may be before it's dropped. */
  nameRoom: number
  fontSize: number
  valueKey: string
}

type FunnelText = {
  x: number
  y: number
  anchor: "start" | "middle" | "end"
  text: string
}

type FunnelPill = {
  x: number
  y: number
  width: number
  height: number
  text: FunnelText
}

type FunnelLabels = {
  name: FunnelText | null
  pill: FunnelPill | null
  /** The conversion into this stage, beside the taper that leads to it. */
  conversion: FunnelText | null
}

/** The surface between two stages. */
const FUNNEL_GAP = 2
/** The last stage's opacity; the first is solid. */
const LAST_STAGE_OPACITY = 0.35
/** How much of a stage stays at its own size before the taper starts. */
const FLAT_SHARE = 0.55
const LABEL_GAP = 12
const CONVERSION_GAP = 8
const MIN_SIZE = 2
const PILL_PADDING_X = 6
const PILL_PADDING_Y = 3
// Half of Inter's x-height: added to a centre line, it gives the baseline
// that centres a line of text on it.
const CENTER_BASELINE = 0.35
// Inter's cap height, for how far a line of text reaches above its baseline.
const CAP_HEIGHT = 0.73

function formatDefault(value: number) {
  return formatChartNumber(value)
}

function getStageOpacity(index: number, count: number) {
  if (count <= 1) return 1
  return 1 - (index / (count - 1)) * (1 - LAST_STAGE_OPACITY)
}

function getFunnelModel<TDatum extends ChartDatum>({
  data,
  config,
  nameKey = "name",
  valueKey = "value",
  color,
  size,
  fontSize,
  orientation = "vertical",
  formatValue = formatDefault,
}: {
  data: readonly TDatum[]
  config?: ChartConfig
  nameKey?: string
  valueKey?: string
  color?: ChartColor
  size: ChartSize
  fontSize: number
  orientation?: FunnelOrientation
  formatValue?: (value: number, key: string) => string
}): FunnelModel<TDatum> {
  const entry = config?.[valueKey]
  const paint: ChartPaint = getChartPaint(color ?? entry?.color, 0)
  const series: ChartSeries = {
    key: valueKey,
    label: entry?.label ?? "Value",
    paint,
    dashed: false,
  }
  const seen = new Set<string>()
  const names = data.map((datum) => readChartText(datum, nameKey))
  const ids = names.map((name, position) => {
    const id = seen.has(name) ? `${name}#${position}` : name
    seen.add(id)
    return id
  })
  const values = data.map((datum) => readChartNumber(datum, valueKey))
  const first = values[0] ?? null
  const conversions = values.map((value, position) => {
    const previous = position > 0 ? values[position - 1] : null
    return value === null || previous === null || previous <= 0
      ? null
      : value / previous
  })
  const conversionTexts = conversions.map((conversion) =>
    conversion === null ? null : formatChartPercent(conversion)
  )
  const largest = Math.max(0, ...values.map((value) => value ?? 0))
  const count = data.length
  const isVertical = orientation === "vertical"

  // Room for the names before the funnel and the conversions after it, or
  // the rows above and below it on its side.
  const nameWidth = Math.max(
    0,
    ...names.map((name) => estimateTextWidth(name, fontSize))
  )
  const conversionWidth = Math.max(
    0,
    ...conversionTexts.map((text) =>
      text === null ? 0 : estimateTextWidth(text, fontSize)
    )
  )
  const rowHeight = Math.ceil(fontSize * 1.25) + LABEL_GAP / 2
  // Names take what they need, up to 45% of a narrow chart: on a phone the
  // funnel narrows before its stages lose their names.
  const nameRoom = isVertical
    ? Math.min(nameWidth, size.width * 0.45)
    : size.width / Math.max(1, count) - 4
  const before = isVertical
    ? nameRoom > 0
      ? nameRoom + LABEL_GAP
      : 0
    : conversionWidth > 0
      ? rowHeight
      : 0
  const after = isVertical
    ? conversionWidth > 0
      ? conversionWidth + LABEL_GAP
      : 0
    : nameWidth > 0
      ? rowHeight
      : 0
  const crossLength = isVertical ? size.width : size.height
  const mainLength = isVertical ? size.height : size.width
  const maxSize = Math.max(0, crossLength - before - after)
  const center = before + maxSize / 2
  const band = mainLength / Math.max(1, count)

  const sizes = values.map((value) =>
    value === null || value <= 0 || largest <= 0
      ? 0
      : Math.max(MIN_SIZE, (value / largest) * maxSize)
  )

  const stages = data.map((datum, position): FunnelStage<TDatum> => {
    const isLast = position === count - 1
    const start = position * band
    const end = isLast ? start + band : start + band - FUNNEL_GAP
    const value = values[position]
    return {
      id: ids[position],
      name: names[position],
      index: position,
      value,
      valueText: value === null ? MISSING_VALUE : formatValue(value, valueKey),
      datum,
      start,
      flatEnd: isLast ? end : start + (end - start) * FLAT_SHARE,
      end,
      center,
      size: sizes[position],
      nextSize: isLast ? sizes[position] : sizes[position + 1],
      opacity: getStageOpacity(position, count),
      share:
        value === null || first === null || first <= 0 ? null : value / first,
      conversion: conversions[position],
      conversionText: conversionTexts[position],
    }
  })

  const bands = stages.map((_, position) =>
    isVertical
      ? { x: 0, y: position * band, width: size.width, height: band }
      : { x: position * band, y: 0, width: band, height: size.height }
  )

  return {
    orientation,
    series,
    stages,
    bands,
    centers: stages.map((_, position) => position * band + band / 2),
    nameEdge: isVertical ? 0 : size.height - fontSize * 0.25,
    nameRoom,
    fontSize,
    valueKey,
  }
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * A stage's outline: its own size up to the taper, then a smooth S-curve to
 * the next stage's size. `amount` scales it across, from the centre line
 * (the draw-in grows stages out of it).
 */
function getFunnelStagePath(
  stage: Pick<
    FunnelStage,
    "start" | "flatEnd" | "end" | "center" | "size" | "nextSize"
  >,
  orientation: FunnelOrientation,
  amount = 1
) {
  const half = (stage.size / 2) * amount
  const nextHalf = (stage.nextSize / 2) * amount
  const middle = (stage.flatEnd + stage.end) / 2
  const { start, flatEnd, end, center } = stage
  // Points as [along, across]; a horizontal funnel swaps them into x and y.
  const points: [number, number][] = [
    [start, center - half],
    [start, center + half],
    [flatEnd, center + half],
    [middle, center + half],
    [middle, center + nextHalf],
    [end, center + nextHalf],
    [end, center - nextHalf],
    [middle, center - nextHalf],
    [middle, center - half],
    [flatEnd, center - half],
  ]
  const [a, b, c, d, e, f, g, h, i, j] = points.map(([along, across]) =>
    orientation === "vertical"
      ? `${round(across)},${round(along)}`
      : `${round(along)},${round(across)}`
  )
  return `M${a}L${b}L${c}C${d} ${e} ${f}L${g}C${h} ${i} ${j}Z`
}

/**
 * Half a stage's size at a point along it: its own size before the taper,
 * the next stage's after it, and on the curve between. The curve's control
 * points sit at the taper's middle, so both coordinates are fixed
 * polynomials of the curve's t, solved by bisection.
 */
function getTaperHalfSize(
  stage: Pick<FunnelStage, "flatEnd" | "end" | "size" | "nextSize">,
  along: number
) {
  if (along <= stage.flatEnd) return stage.size / 2
  if (along >= stage.end) return stage.nextSize / 2
  const share = (along - stage.flatEnd) / (stage.end - stage.flatEnd)
  let low = 0
  let high = 1
  for (let step = 0; step < 24; step++) {
    const t = (low + high) / 2
    if (1.5 * t - 1.5 * t * t + t * t * t < share) low = t
    else high = t
  }
  const t = (low + high) / 2
  const blend = 3 * t * t - 2 * t * t * t
  return interpolateNumber(stage.size, stage.nextSize, blend) / 2
}

/**
 * Every stage's name, value pill and conversion, placed against the stages
 * as they are now drawn. The conversion into a stage sits beside the taper
 * that leads to it. Labels that don't fit are dropped, never clipped: the
 * tooltip and the table keep them.
 */
function getFunnelLabels(
  stages: readonly FunnelStage[],
  model: Pick<FunnelModel, "orientation" | "nameEdge" | "nameRoom" | "fontSize">
): FunnelLabels[] {
  const { fontSize } = model
  const isVertical = model.orientation === "vertical"
  const shift = fontSize * CENTER_BASELINE
  let previous: FunnelStage | null = null
  return stages.map((stage) => {
    if (stage.isLeaving) return { name: null, pill: null, conversion: null }
    const flatMiddle = (stage.start + stage.flatEnd) / 2
    const length = stage.end - stage.start
    const nameFits =
      stage.name !== "" &&
      estimateTextWidth(stage.name, fontSize) <= model.nameRoom
    const name: FunnelText | null = !nameFits
      ? null
      : isVertical
        ? {
            x: model.nameEdge,
            y: flatMiddle + shift,
            anchor: "start",
            text: stage.name,
          }
        : {
            x: flatMiddle,
            y: model.nameEdge,
            anchor: "middle",
            text: stage.name,
          }

    const pillWidth =
      estimateTextWidth(stage.valueText, fontSize) + PILL_PADDING_X * 2
    const pillHeight = Math.ceil(fontSize * 1.2) + PILL_PADDING_Y * 2
    const pillFits = (isVertical ? pillHeight : pillWidth) + 4 <= length
    const pillCenter = isVertical
      ? { x: stage.center, y: flatMiddle }
      : { x: flatMiddle, y: stage.center }
    const pill: FunnelPill | null = pillFits
      ? {
          x: pillCenter.x - pillWidth / 2,
          y: pillCenter.y - pillHeight / 2,
          width: pillWidth,
          height: pillHeight,
          text: {
            x: pillCenter.x,
            y: pillCenter.y + shift,
            anchor: "middle",
            text: stage.valueText,
          },
        }
      : null

    let conversion: FunnelText | null = null
    if (previous && stage.conversionText !== null) {
      // Halfway along the taper, just outside the curve it describes: as far
      // out as the curve reaches anywhere along the text, so a steep taper
      // never runs into it.
      const taper = (previous.flatEnd + previous.end) / 2
      const halfText = estimateTextWidth(stage.conversionText, fontSize) / 2
      const [before, after] = isVertical
        ? [
            fontSize * (CAP_HEIGHT - CENTER_BASELINE),
            fontSize * CENTER_BASELINE,
          ]
        : [halfText, halfText]
      const reach =
        Math.max(
          getTaperHalfSize(previous, taper - before),
          getTaperHalfSize(previous, taper + after)
        ) + CONVERSION_GAP
      conversion = isVertical
        ? {
            x: previous.center + reach,
            y: taper + shift,
            anchor: "start",
            text: stage.conversionText,
          }
        : {
            x: taper,
            y: previous.center - reach,
            anchor: "middle",
            text: stage.conversionText,
          }
    }
    previous = stage
    return { name, pill, conversion }
  })
}

function blendStage<TDatum extends ChartDatum>(
  from: FunnelStage<TDatum>,
  to: FunnelStage<TDatum>,
  progress: number
): FunnelStage<TDatum> {
  const blend = (
    key:
      | "start"
      | "flatEnd"
      | "end"
      | "center"
      | "size"
      | "nextSize"
      | "opacity"
  ) => interpolateNumber(from[key], to[key], progress)
  return {
    ...to,
    start: blend("start"),
    flatEnd: blend("flatEnd"),
    end: blend("end"),
    center: blend("center"),
    size: blend("size"),
    nextSize: blend("nextSize"),
    opacity: blend("opacity"),
  }
}

function collapseStage<TDatum extends ChartDatum>(
  stage: FunnelStage<TDatum>
): FunnelStage<TDatum> {
  return { ...stage, size: 0, nextSize: 0 }
}

/**
 * The stages between two funnels, keyed by name. A stage that stays moves,
 * resizes and takes its new step of the hue; a new one grows out of the
 * centre line; a leaving one shrinks into it, marked `isLeaving`. Null when
 * no stage is in both.
 */
function interpolateFunnelStages<TDatum extends ChartDatum>(
  from: readonly FunnelStage<TDatum>[],
  to: readonly FunnelStage<TDatum>[],
  progress: number
): FunnelStage<TDatum>[] | null {
  const previous = new Map(from.map((stage) => [stage.id, stage]))
  const next = new Set(to.map((stage) => stage.id))
  if (!to.some((stage) => previous.has(stage.id))) return null
  const moving = to.map((stage) =>
    blendStage(previous.get(stage.id) ?? collapseStage(stage), stage, progress)
  )
  const leaving = from
    .filter((stage) => !next.has(stage.id))
    .map((stage) => ({
      ...blendStage(stage, collapseStage(stage), progress),
      isLeaving: true,
    }))
  return [...moving, ...leaving]
}

const NO_KEY: ChartPaint = { value: "transparent" }

/** The inspected stage: its value, its share of the first, its conversion. */
function getFunnelTooltip(
  model: FunnelModel,
  index: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  const stage = model.stages[index]
  if (!stage) return { title: "", rows: [] }
  return {
    title: stage.name,
    rows: [
      {
        key: model.series.key,
        label: model.series.label,
        paint: model.series.paint,
        dashed: false,
        value:
          stage.value === null
            ? MISSING_VALUE
            : formatValue(stage.value, model.valueKey),
      },
      {
        key: "share",
        label: "Of first stage",
        paint: NO_KEY,
        dashed: false,
        value:
          stage.share === null
            ? MISSING_VALUE
            : formatChartPercent(stage.share),
      },
      ...(index > 0
        ? [
            {
              key: "conversion",
              label: "From previous stage",
              paint: NO_KEY,
              dashed: false,
              value: stage.conversionText ?? MISSING_VALUE,
            },
          ]
        : []),
    ],
  }
}

/** Every stage as a row: its value, share of the first and conversion. */
function getFunnelTable(
  model: FunnelModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  return {
    columns: [model.series.label, "Of first stage", "From previous stage"],
    rows: model.stages.map((stage) => ({
      header: stage.name,
      cells: [
        stage.value === null
          ? MISSING_VALUE
          : formatValue(stage.value, model.valueKey),
        stage.share === null ? MISSING_VALUE : formatChartPercent(stage.share),
        stage.conversionText ?? MISSING_VALUE,
      ],
    })),
  }
}

export type {
  FunnelLabels,
  FunnelModel,
  FunnelOrientation,
  FunnelPill,
  FunnelRect,
  FunnelStage,
  FunnelText,
}

export {
  FUNNEL_GAP,
  getFunnelLabels,
  getFunnelModel,
  getFunnelStagePath,
  getFunnelTable,
  getFunnelTooltip,
  interpolateFunnelStages,
}
