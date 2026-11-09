import * as React from "react"
import { describe, expect, it } from "vitest"

import {
  getTextContent,
  wrapTextChildren,
} from "@/registry/native/lib/text-children"

const label = (text: string, key: number) => ({ text, key })

describe("wrapTextChildren", () => {
  it("wraps a string", () => {
    expect(wrapTextChildren("Save", label)).toEqual([{ text: "Save", key: 0 }])
  })

  it("joins neighbouring text", () => {
    expect(wrapTextChildren(["Save ", 3, " files"], label)).toEqual([
      { text: "Save 3 files", key: 0 },
    ])
  })

  it("keeps elements and skips empty nodes", () => {
    const icon = React.createElement("icon")
    const output = wrapTextChildren([icon, "Save", null, false], label)
    expect(output).toHaveLength(2)
    expect(output[1]).toEqual({ text: "Save", key: 1 })
  })

  it("keys elements, since it returns a list", () => {
    const output = wrapTextChildren(
      [React.createElement("a"), React.createElement("b")],
      label
    )
    expect(
      output.every((child) => React.isValidElement(child) && child.key !== null)
    ).toBe(true)
  })

  it("keeps text on both sides of an element apart", () => {
    const icon = React.createElement("icon")
    const output = wrapTextChildren(["a", icon, "b"], label)
    expect(output).toHaveLength(3)
    expect(output[2]).toEqual({ text: "b", key: 2 })
  })
})

describe("getTextContent", () => {
  it("reads the text beside an icon", () => {
    const icon = React.createElement("icon")
    expect(getTextContent([icon, "Files ", 2])).toBe("Files 2")
  })

  it("joins text on both sides of an element with a space", () => {
    const icon = React.createElement("icon")
    expect(getTextContent(["Save", icon, "now"])).toBe("Save now")
  })

  it("is empty without text", () => {
    expect(getTextContent(React.createElement("icon"))).toBe("")
  })
})
