import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { useMergedRef } from "./fluid-hover"

function getMergedRef<T>(...refs: Array<React.Ref<T> | undefined>) {
  const captured: { ref?: React.RefCallback<T> } = {}
  function Probe() {
    captured.ref = useMergedRef(...refs)
    return null
  }
  renderToStaticMarkup(<Probe />)
  if (!captured.ref) throw new Error("The probe did not render")
  return captured.ref
}

describe("useMergedRef", () => {
  it("cleans up React 19 callback refs and clears object refs", () => {
    const dispose = vi.fn()
    const callback = vi.fn(() => dispose)
    const object = React.createRef<object>()
    const merged = getMergedRef(callback, object, undefined)
    const element = {}
    const cleanup = merged(element)
    expect(callback).toHaveBeenCalledWith(element)
    expect(object.current).toBe(element)
    expect(cleanup).toBeTypeOf("function")
    if (typeof cleanup !== "function") throw new Error("Missing ref cleanup")
    cleanup()
    expect(dispose).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledOnce()
    expect(object.current).toBeNull()
  })

  it("detaches callbacks without a disposer with null", () => {
    const callback = vi.fn((_element: object | null) => {})
    const merged = getMergedRef(callback)
    const cleanup = merged({})
    if (typeof cleanup !== "function") throw new Error("Missing ref cleanup")
    cleanup()
    expect(callback).toHaveBeenLastCalledWith(null)
  })

  it("still accepts a direct null assignment", () => {
    const callback = vi.fn((_element: object | null) => {})
    const object = React.createRef<object>()
    const merged = getMergedRef(callback, object)
    merged({})
    expect(merged(null)).toBeUndefined()
    expect(callback).toHaveBeenLastCalledWith(null)
    expect(object.current).toBeNull()
  })
})
