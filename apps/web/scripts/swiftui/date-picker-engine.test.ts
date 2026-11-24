import { describe, expect, it } from "vitest"

import { callDatePickerEngine } from "./date-picker-engine"

const request = {
  action: "commit",
  text: "tomorrow",
  value: null,
  referenceDate: { year: 2026, month: 11, day: 16 },
  granularity: "day",
  locale: "en_US",
}

describe("SwiftUI Date Picker's civil-date boundary", () => {
  it("rejects malformed requests and impossible civil dates", () => {
    expect(JSON.parse(callDatePickerEngine("{"))).toMatchObject({ ok: false })
    expect(JSON.parse(callDatePickerEngine("{}"))).toMatchObject({ ok: false })
    expect(
      JSON.parse(
        callDatePickerEngine(
          JSON.stringify({
            ...request,
            referenceDate: { year: 2026, month: 2, day: 30 },
          })
        )
      )
    ).toMatchObject({
      ok: false,
      error: { name: "RangeError", message: "Invalid civil date" },
    })
  })

  it("maps native locale identifiers without silently changing unsupported languages", () => {
    expect(
      JSON.parse(
        callDatePickerEngine(
          JSON.stringify({
            ...request,
            locale: "pt_BR",
            text: "18 de novembro de 2026",
            format: "d 'de' MMMM 'de' yyyy",
          })
        )
      )
    ).toEqual({
      ok: true,
      value: {
        value: { year: 2026, month: 11, day: 18 },
        text: "18 de novembro de 2026",
        isInvalid: false,
      },
    })
    expect(
      JSON.parse(
        callDatePickerEngine(JSON.stringify({ ...request, locale: "xx_YY" }))
      )
    ).toMatchObject({ ok: false, error: { name: "RangeError" } })
  })

  it("carries civil dates across relative month and leap-day calculations", () => {
    expect(
      JSON.parse(
        callDatePickerEngine(
          JSON.stringify({
            ...request,
            text: "next month",
            granularity: "month",
            referenceDate: { year: 2026, month: 12, day: 31 },
          })
        )
      )
    ).toMatchObject({
      ok: true,
      value: { value: { year: 2027, month: 1, day: 1 }, text: "Jan 2027" },
    })
    expect(
      JSON.parse(
        callDatePickerEngine(
          JSON.stringify({
            ...request,
            referenceDate: { year: 2024, month: 2, day: 28 },
          })
        )
      )
    ).toMatchObject({
      ok: true,
      value: { value: { year: 2024, month: 2, day: 29 } },
    })
  })
})
