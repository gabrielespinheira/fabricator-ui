// Something the assistant made that outlives its message: rows with typed
// columns, drawn as a chart and a table, and exported. No React.

export type AssistantArtifactFormat =
  | "text"
  | "count"
  | "money"
  | "percent"
  /** A signed change in percent, coloured by its direction. */
  | "change"

export type AssistantArtifactColumn = {
  key: string
  label: string
  format: AssistantArtifactFormat
}

export type AssistantArtifactRow = Record<string, string | number>

export type AssistantArtifact = {
  id: string
  title: string
  /** What the numbers are: the measure and the period. */
  scope: string
  /** Where they come from: "q3-revenue.csv". */
  source: string
  columns: AssistantArtifactColumn[]
  rows: AssistantArtifactRow[]
  total?: AssistantArtifactRow
  chart: {
    label: string
    /** The column that names each bar. */
    index: string
    /** The column each bar measures. */
    value: string
    /** Sorts the bars from the largest; leave out for months and steps. */
    isRanked: boolean
  }
}

const count = new Intl.NumberFormat("en-US")

const MILLION = 1_000_000

function formatMoney(value: number) {
  const digits = Math.abs(value) >= MILLION ? 2 : 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatPercent(value: number) {
  return `${Math.abs(value).toFixed(1)}%`
}

function getSign(value: number) {
  if (value === 0) return ""
  return value > 0 ? "+" : "−"
}

export function formatArtifactValue(
  value: string | number | undefined,
  format: AssistantArtifactFormat
) {
  if (value === undefined) return "No data"
  if (typeof value === "string") return value
  switch (format) {
    case "money":
      return formatMoney(value)
    case "percent":
      return formatPercent(value)
    case "change":
      return `${getSign(value)}${formatPercent(value)}`
    default:
      return count.format(value)
  }
}

export function isEndAligned(column: AssistantArtifactColumn) {
  return column.format !== "text"
}

export function getArtifactChartData({ rows, chart }: AssistantArtifact) {
  const data = rows.map((row) => ({
    label: String(row[chart.index] ?? ""),
    value: Number(row[chart.value] ?? 0),
  }))
  if (!chart.isRanked) return data
  return data.toSorted((a, b) => b.value - a.value)
}

/** The table as raw values, the header first. */
function getRawTable({ columns, rows }: AssistantArtifact) {
  return [
    columns.map((column) => column.label),
    ...rows.map((row) =>
      columns.map((column) => String(row[column.key] ?? ""))
    ),
  ]
}

function quoteCsv(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function toArtifactCsv(artifact: AssistantArtifact) {
  return getRawTable(artifact)
    .map((cells) => `${cells.map(quoteCsv).join(",")}\r\n`)
    .join("")
}

/** Tab-separated, so it pastes into a spreadsheet as cells. */
export function toArtifactText(artifact: AssistantArtifact) {
  return getRawTable(artifact)
    .map((cells) => cells.join("\t"))
    .join("\n")
}

function toMarkdownRow(cells: string[]) {
  return `| ${cells.join(" | ")} |`
}

export function toArtifactMarkdown(artifact: AssistantArtifact) {
  const { columns, rows, total } = artifact
  const body = total ? [...rows, total] : rows
  return [
    `**${artifact.title}**`,
    "",
    toMarkdownRow(columns.map((column) => column.label)),
    toMarkdownRow(
      columns.map((column) => (isEndAligned(column) ? "---:" : "---"))
    ),
    ...body.map((row) =>
      toMarkdownRow(
        columns.map((column) =>
          formatArtifactValue(row[column.key], column.format)
        )
      )
    ),
  ].join("\n")
}

export function toFileSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** "growth-by-region.csv" for "Growth by region". */
export function toArtifactFileName(title: string) {
  return `${toFileSlug(title) || "data"}.csv`
}
