import { describe, expect, it } from "vitest"

import {
  getToastStack,
  shouldStackActions,
  type ToastStackOptions,
} from "./toast-stack-model"

const COLLAPSED: ToastStackOptions = {
  isExpanded: false,
  gap: 10,
  peek: 8,
  inset: 10,
}
const EXPANDED: ToastStackOptions = { ...COLLAPSED, isExpanded: true }

const SMALL = { width: 120, height: 40 }
const MEDIUM = { width: 240, height: 60 }
const LARGE = { width: 352, height: 120 }

describe("shouldStackActions", () => {
  it("keeps the actions beside text that leaves them room", () => {
    expect(
      shouldStackActions({ rowWidth: 180, maxWidth: 352, hasActions: true })
    ).toBe(false)
    expect(
      shouldStackActions({ rowWidth: 352, maxWidth: 352, hasActions: true })
    ).toBe(false)
  })

  it("moves the actions under text that doesn't", () => {
    expect(
      shouldStackActions({ rowWidth: 353, maxWidth: 352, hasActions: true })
    ).toBe(true)
  })

  it("has nothing to move without actions, however long the text", () => {
    expect(
      shouldStackActions({ rowWidth: 900, maxWidth: 352, hasActions: false })
    ).toBe(false)
  })
})

describe("getToastStack", () => {
  it("has nothing to place without toasts", () => {
    expect(getToastStack([], COLLAPSED)).toEqual([])
  })

  it("leaves a single toast at its own size", () => {
    expect(getToastStack([MEDIUM], COLLAPSED)).toEqual([
      { ...MEDIUM, offset: 0, inset: 0, isBehind: false },
    ])
  })

  it("cuts the toasts behind to the front one and steps them in", () => {
    expect(getToastStack([SMALL, LARGE, MEDIUM], COLLAPSED)).toEqual([
      { width: 120, height: 40, offset: 0, inset: 0, isBehind: false },
      { width: 100, height: 40, offset: 8, inset: 10, isBehind: true },
      { width: 80, height: 40, offset: 16, inset: 20, isBehind: true },
    ])
  })

  it("never narrows a toast past nothing", () => {
    const stack = getToastStack(
      Array.from({ length: 5 }, () => ({ width: 60, height: 40 })),
      COLLAPSED
    )
    expect(stack.map((toast) => toast.width)).toEqual([60, 40, 20, 0, 0])
  })

  it("expands each to its own size, one past another", () => {
    expect(getToastStack([SMALL, LARGE, MEDIUM], EXPANDED)).toEqual([
      { ...SMALL, offset: 0, inset: 0, isBehind: false },
      { ...LARGE, offset: 50, inset: 0, isBehind: false },
      { ...MEDIUM, offset: 180, inset: 0, isBehind: false },
    ])
  })
})
