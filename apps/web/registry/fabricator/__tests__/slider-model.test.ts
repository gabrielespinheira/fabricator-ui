import { describe, expect, it } from "vitest"

import {
  getSliderSteps,
  hasLeftDragThreshold,
} from "@/registry/fabricator/shared/lib/slider-model"

const values = (steps: ReturnType<typeof getSliderSteps>) =>
  steps.map((step) => step.value)

describe("getSliderSteps", () => {
  it("marks every step from min to max", () => {
    const steps = getSliderSteps({ min: 0, max: 100, step: 25, values: [0] })
    expect(values(steps)).toEqual([0, 25, 50, 75, 100])
    expect(steps.map((step) => step.ratio)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })

  it("keeps decimal steps exact", () => {
    const steps = getSliderSteps({ min: 0, max: 1, step: 0.1, values: [0] })
    expect(values(steps)).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ])
  })

  it("starts from min", () => {
    const steps = getSliderSteps({ min: 10, max: 20, step: 5, values: [10] })
    expect(values(steps)).toEqual([10, 15, 20])
    expect(steps.map((step) => step.ratio)).toEqual([0, 0.5, 1])
  })

  it("stops at the last step a thumb can reach", () => {
    expect(
      values(getSliderSteps({ min: 0, max: 10, step: 4, values: [0] }))
    ).toEqual([0, 4, 8])
  })

  it("fills the steps up to a single thumb", () => {
    const steps = getSliderSteps({ min: 0, max: 100, step: 25, values: [50] })
    expect(steps.map((step) => step.isFilled)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ])
  })

  it("fills the steps between the first and last thumbs", () => {
    const steps = getSliderSteps({
      min: 0,
      max: 100,
      step: 25,
      values: [75, 25],
    })
    expect(steps.map((step) => step.isFilled)).toEqual([
      false,
      true,
      true,
      true,
      false,
    ])
  })

  it("has no steps without a range to cover", () => {
    expect(getSliderSteps({ min: 0, max: 0, step: 1, values: [0] })).toEqual([])
    expect(getSliderSteps({ min: 0, max: 10, step: 0, values: [0] })).toEqual(
      []
    )
  })
})

describe("hasLeftDragThreshold", () => {
  const start = { x: 100, y: 20 }

  it("holds while the pointer stays near where it pressed", () => {
    expect(hasLeftDragThreshold(start, { x: 102, y: 21 })).toBe(false)
  })

  it("lets go once the pointer travels", () => {
    expect(hasLeftDragThreshold(start, { x: 104, y: 20 })).toBe(true)
    expect(hasLeftDragThreshold(start, { x: 100, y: 16 })).toBe(true)
  })
})
