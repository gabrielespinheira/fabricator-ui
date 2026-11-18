import { describe, expect, it } from "vitest"

import {
  FUNNEL_GAP,
  getFunnelLabels,
  getFunnelModel,
  getFunnelStagePath,
  getFunnelTable,
  getFunnelTooltip,
  interpolateFunnelStages,
} from "./chart-funnel-model"

const data = [
  { stage: "Visited", users: 1000 },
  { stage: "Signed up", users: 650 },
  { stage: "Activated", users: 400 },
  { stage: "Paid", users: 100 },
]
const size = { width: 600, height: 300 }

function model(options: Partial<Parameters<typeof getFunnelModel>[0]> = {}) {
  return getFunnelModel({
    data,
    nameKey: "stage",
    valueKey: "users",
    size,
    fontSize: 12,
    ...options,
  })
}

describe("getFunnelModel", () => {
  it("sizes each stage by its value against the largest", () => {
    const { stages } = model()
    expect(stages[1].size / stages[0].size).toBeCloseTo(0.65)
    expect(stages[3].size / stages[0].size).toBeCloseTo(0.1)
  })

  it("stacks stages top to bottom with a 2px gap, centred on one line", () => {
    const { stages } = model()
    expect(stages[0].start).toBe(0)
    expect(stages[1].start - stages[0].end).toBeCloseTo(FUNNEL_GAP)
    expect(stages.at(-1)?.end).toBeCloseTo(size.height)
    expect(new Set(stages.map((stage) => stage.center)).size).toBe(1)
  })

  it("tapers each stage into the next one's size; the last stays flat", () => {
    const { stages } = model()
    expect(stages[0].nextSize).toBe(stages[1].size)
    expect(stages[0].flatEnd).toBeGreaterThan(stages[0].start)
    expect(stages[0].flatEnd).toBeLessThan(stages[0].end)
    const last = stages[3]
    expect(last.nextSize).toBe(last.size)
    expect(last.flatEnd).toBe(last.end)
  })

  it("keeps room for names before the funnel and conversions after it", () => {
    const { stages } = model()
    const left = stages[0].center - stages[0].size / 2
    const right = stages[0].center + stages[0].size / 2
    expect(left).toBeGreaterThan(40)
    expect(right).toBeLessThan(size.width - 30)
  })

  it("lays stages left to right when horizontal", () => {
    const { stages, bands } = model({ orientation: "horizontal" })
    expect(stages[1].start).toBeCloseTo(size.width / 4)
    expect(bands[1]).toEqual({ x: 150, y: 0, width: 150, height: 300 })
    expect(stages[0].size).toBeLessThan(size.height)
  })

  it("steps one hue's opacity down with the stage, keeping the last visible", () => {
    const opacities = model().stages.map((stage) => stage.opacity)
    expect(opacities[0]).toBe(1)
    for (let index = 1; index < opacities.length; index++) {
      expect(opacities[index]).toBeLessThan(opacities[index - 1])
    }
    expect(opacities.at(-1)).toBeGreaterThanOrEqual(0.3)
  })

  it("takes its hue from color, then config, then the first slot", () => {
    expect(model().series.paint).toEqual({ token: "chart-series-1" })
    expect(
      model({ config: { users: { label: "Users", color: "chart-series-3" } } })
        .series
    ).toEqual(
      expect.objectContaining({
        label: "Users",
        paint: { token: "chart-series-3" },
      })
    )
    expect(model({ color: "info" }).series.paint).toEqual({ token: "info" })
  })

  it("works out each stage's share of the first and conversion", () => {
    const { stages } = model()
    expect(stages[2].share).toBeCloseTo(0.4)
    expect(stages[2].conversion).toBeCloseTo(400 / 650)
    expect(stages[1].conversionText).toBe("65%")
    expect(stages[0].conversion).toBeNull()
  })

  it("draws a missing value as an empty stage", () => {
    const { stages } = getFunnelModel({
      data: [
        { name: "A", value: 10 },
        { name: "B", value: null },
        { name: "C", value: 5 },
      ],
      size,
      fontSize: 12,
    })
    expect(stages[1].size).toBe(0)
    expect(stages[1].valueText).toBe("–")
    expect(stages[2].conversion).toBeNull()
  })

  it("gives each stage a band to highlight and a centre to snap to", () => {
    const { bands, centers } = model()
    expect(bands).toHaveLength(4)
    expect(bands[0]).toEqual({ x: 0, y: 0, width: 600, height: 75 })
    expect(centers[1]).toBeCloseTo(112.5)
  })
})

describe("getFunnelStagePath", () => {
  const stage = {
    start: 0,
    flatEnd: 10,
    end: 20,
    center: 50,
    size: 40,
    nextSize: 20,
  }

  it("keeps the stage's size, then curves into the next", () => {
    expect(getFunnelStagePath(stage, "vertical")).toBe(
      "M30,0L70,0L70,10C70,15 60,15 60,20L40,20C40,15 30,15 30,10Z"
    )
  })

  it("swaps the axes when horizontal", () => {
    expect(getFunnelStagePath(stage, "horizontal")).toBe(
      "M0,30L0,70L10,70C15,70 15,60 20,60L20,40C15,40 15,30 10,30Z"
    )
  })

  it("grows out of the centre line", () => {
    expect(getFunnelStagePath(stage, "vertical", 0)).toBe(
      "M50,0L50,0L50,10C50,15 50,15 50,20L50,20C50,15 50,15 50,10Z"
    )
  })
})

describe("getFunnelLabels", () => {
  it("names each stage, pills its value and sets conversions by the taper", () => {
    const current = model()
    const labels = getFunnelLabels(current.stages, current)
    expect(labels[0].name).toEqual(
      expect.objectContaining({ x: 0, anchor: "start", text: "Visited" })
    )
    expect(labels[0].pill?.text.text).toBe("1,000")
    expect(labels[0].pill?.text.x).toBe(current.stages[0].center)
    expect(labels[0].conversion).toBeNull()
    const conversion = labels[1].conversion
    const [first] = current.stages
    expect(conversion).toEqual(
      expect.objectContaining({ anchor: "start", text: "65%" })
    )
    // Just outside the taper's edge, halfway along it, clear of the curve
    // where it is wider above the text's middle.
    expect(conversion?.x ?? 0).toBeGreaterThan(
      first.center + (first.size + first.nextSize) / 4 + 8
    )
    expect(conversion?.x ?? 0).toBeLessThan(first.center + first.size / 2 + 8)
    expect(conversion?.y ?? 0).toBeGreaterThan(first.flatEnd)
    expect(conversion?.y ?? 0).toBeLessThan(current.stages[1].start + 12)
  })

  it("drops a pill when its stage is too short to hold it", () => {
    const current = model({ size: { width: 600, height: 40 } })
    const labels = getFunnelLabels(current.stages, current)
    expect(labels.every((label) => label.pill === null)).toBe(true)
  })

  it("sets names under and conversions over a horizontal funnel", () => {
    const current = model({ orientation: "horizontal" })
    const labels = getFunnelLabels(current.stages, current)
    expect(labels[0].name?.anchor).toBe("middle")
    expect(labels[0].name?.y ?? 0).toBeGreaterThan(size.height - 12)
    const [first] = current.stages
    expect(labels[1].conversion?.y ?? 0).toBeLessThan(
      first.center - (first.size + first.nextSize) / 4 - 8
    )
    expect(labels[1].conversion?.y ?? 0).toBeGreaterThanOrEqual(
      first.center - first.size / 2 - 8
    )
    expect(labels[1].conversion?.anchor).toBe("middle")
  })

  it("labels nothing on a leaving stage", () => {
    const current = model()
    const labels = getFunnelLabels(
      [{ ...current.stages[0], isLeaving: true }],
      current
    )
    expect(labels[0]).toEqual({ name: null, pill: null, conversion: null })
  })
})

describe("interpolateFunnelStages", () => {
  const next = model({
    data: [
      { stage: "Visited", users: 800 },
      { stage: "Signed up", users: 600 },
      { stage: "Paid", users: 200 },
      { stage: "Renewed", users: 150 },
    ],
  })

  it("moves stages that stay, grows new ones and shrinks leaving ones", () => {
    const from = model()
    const halfway = interpolateFunnelStages(from.stages, next.stages, 0.5) ?? []
    const signedUp = halfway.find((stage) => stage.id === "Signed up")
    expect(signedUp?.size).toBeCloseTo(
      (from.stages[1].size + next.stages[1].size) / 2
    )
    const start = interpolateFunnelStages(from.stages, next.stages, 0) ?? []
    expect(start.find((stage) => stage.id === "Renewed")?.size).toBe(0)
    const end = interpolateFunnelStages(from.stages, next.stages, 1) ?? []
    const activated = end.find((stage) => stage.id === "Activated")
    expect(activated?.isLeaving).toBe(true)
    expect(activated?.size).toBe(0)
  })

  it("can't morph between funnels that share no stage", () => {
    const other = model({ data: [{ stage: "Other", users: 1 }] })
    expect(
      interpolateFunnelStages(model().stages, other.stages, 0.5)
    ).toBeNull()
  })
})

describe("getFunnelTooltip", () => {
  it("gives the value, share of the first stage and conversion", () => {
    expect(getFunnelTooltip(model(), 2)).toEqual({
      title: "Activated",
      rows: [
        expect.objectContaining({ label: "Value", value: "400" }),
        expect.objectContaining({ label: "Of first stage", value: "40%" }),
        expect.objectContaining({
          label: "From previous stage",
          value: "61.5%",
        }),
      ],
    })
  })

  it("has no conversion for the first stage", () => {
    expect(getFunnelTooltip(model(), 0).rows).toHaveLength(2)
  })
})

describe("getFunnelTable", () => {
  it("lists every stage", () => {
    const table = getFunnelTable(model())
    expect(table.columns).toEqual([
      "Value",
      "Of first stage",
      "From previous stage",
    ])
    expect(table.rows[0]).toEqual({
      header: "Visited",
      cells: ["1,000", "100%", "–"],
    })
    expect(table.rows[3]).toEqual({
      header: "Paid",
      cells: ["100", "10%", "25%"],
    })
  })
})

describe("getFunnelModel on a phone", () => {
  it("keeps every stage's name and narrows the funnel instead", () => {
    const current = getFunnelModel({
      data: [
        { stage: "Visited site", people: 12_400 },
        { stage: "Created a project", people: 4_870 },
        { stage: "Invited a teammate", people: 2_640 },
      ],
      nameKey: "stage",
      valueKey: "people",
      size: { width: 310, height: 288 },
      fontSize: 12,
    })
    const labels = getFunnelLabels(current.stages, current)
    expect(labels.every((label) => label.name !== null)).toBe(true)
    expect(current.stages[0].size).toBeGreaterThan(100)
  })
})
