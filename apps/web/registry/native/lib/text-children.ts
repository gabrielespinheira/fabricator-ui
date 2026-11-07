import * as React from "react"

/**
 * Wraps text nodes in `wrap`, because React Native can't draw a bare string
 * inside a view. Neighbouring strings and numbers stay together, so
 * `Save {count}` is one label.
 */
export function wrapTextChildren<Wrapped>(
  children: React.ReactNode,
  wrap: (text: string, key: number) => Wrapped
) {
  const output: (React.ReactNode | Wrapped)[] = []
  let text = ""
  const flush = () => {
    if (text === "") return
    output.push(wrap(text, output.length))
    text = ""
  }
  // toArray drops empty nodes and keys the rest: this returns a list.
  for (const child of React.Children.toArray(children)) {
    if (typeof child === "string" || typeof child === "number") {
      text += String(child)
      continue
    }
    flush()
    output.push(child)
  }
  flush()
  return output
}

/**
 * The text of `children`, for an accessible name when the text itself isn't
 * drawn (an icon-only tab). Runs of text on either side of an element are
 * joined with a space.
 */
export function getTextContent(children: React.ReactNode) {
  return wrapTextChildren(children, (text) => text.trim())
    .filter((child): child is string => typeof child === "string" && child !== "")
    .join(" ")
}
