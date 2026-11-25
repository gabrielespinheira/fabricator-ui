import { describe, expect, it } from "vitest"

import {
  formatArtifactValue,
  getArtifactChartData,
  isEndAligned,
  toArtifactCsv,
  toArtifactFileName,
  toArtifactMarkdown,
  toArtifactText,
  type AssistantArtifact,
} from "@/registry/fabricator/shared/blocks/assistant-01/lib/assistant-artifact-model"

const artifact: AssistantArtifact = {
  id: "growth",
  title: "Growth by region",
  scope: "MRR, Q2 to Q3 2026",
  source: "q3-revenue.csv",
  columns: [
    { key: "region", label: "Region", format: "text" },
    { key: "q3", label: "Q3 MRR", format: "money" },
    { key: "change", label: "Change", format: "change" },
  ],
  rows: [
    { region: "APAC", q3: 141_000, change: -3.2 },
    { region: 'Europe, "EMEA"', q3: 412_000, change: 18.4 },
  ],
  total: { region: "Total", q3: 553_000, change: 8 },
  chart: {
    label: "Change in MRR",
    index: "region",
    value: "change",
    isRanked: true,
  },
}

describe("formatArtifactValue", () => {
  it("writes each kind of value the way a table reads", () => {
    expect(formatArtifactValue("EMEA", "text")).toBe("EMEA")
    expect(formatArtifactValue(41, "count")).toBe("41")
    expect(formatArtifactValue(12480, "count")).toBe("12,480")
    expect(formatArtifactValue(968_000, "money")).toBe("$968K")
    expect(formatArtifactValue(91_600, "money")).toBe("$92K")
    expect(formatArtifactValue(1_497_600, "money")).toBe("$1.50M")
    expect(formatArtifactValue(1.9, "percent")).toBe("1.9%")
    expect(formatArtifactValue(18.4, "change")).toBe("+18.4%")
    expect(formatArtifactValue(-3.2, "change")).toBe("−3.2%")
    expect(formatArtifactValue(0, "change")).toBe("0.0%")
  })

  it("names a missing value", () => {
    expect(formatArtifactValue(undefined, "money")).toBe("No data")
  })
})

describe("isEndAligned", () => {
  it("aligns every number to the end", () => {
    expect(artifact.columns.map(isEndAligned)).toEqual([false, true, true])
  })
})

describe("getArtifactChartData", () => {
  it("ranks the values from the largest", () => {
    expect(getArtifactChartData(artifact)).toEqual([
      { label: 'Europe, "EMEA"', value: 18.4 },
      { label: "APAC", value: -3.2 },
    ])
  })

  it("keeps the order of the rows when it means something, like months", () => {
    const monthly = {
      ...artifact,
      chart: { ...artifact.chart, isRanked: false },
    }
    expect(getArtifactChartData(monthly).map(({ value }) => value)).toEqual([
      -3.2, 18.4,
    ])
  })
})

describe("exporting", () => {
  it("writes CSV with raw numbers and quoted text", () => {
    expect(toArtifactCsv(artifact)).toBe(
      'Region,Q3 MRR,Change\r\nAPAC,141000,-3.2\r\n"Europe, ""EMEA""",412000,18.4\r\n'
    )
  })

  it("copies tab-separated rows that paste into a spreadsheet", () => {
    expect(toArtifactText(artifact)).toBe(
      'Region\tQ3 MRR\tChange\nAPAC\t141000\t-3.2\nEurope, "EMEA"\t412000\t18.4'
    )
  })

  it("writes a Markdown table with its numbers at the end", () => {
    expect(toArtifactMarkdown(artifact)).toBe(
      '**Growth by region**\n\n| Region | Q3 MRR | Change |\n| --- | ---: | ---: |\n| APAC | $141K | −3.2% |\n| Europe, "EMEA" | $412K | +18.4% |\n| Total | $553K | +8.0% |'
    )
  })

  it("names the file after the artifact", () => {
    expect(toArtifactFileName(artifact.title)).toBe("growth-by-region.csv")
    expect(toArtifactFileName("???")).toBe("data.csv")
  })
})
