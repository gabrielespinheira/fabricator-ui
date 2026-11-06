import * as React from "react"

type TextDirection = "ltr" | "rtl"

/**
 * Fabricator is left-to-right only. The provider takes the website's props so
 * ported code reads the same, and renders its children as they are.
 */
function DirectionProvider({
  children,
}: {
  direction?: TextDirection
  children?: React.ReactNode
}) {
  return children
}

function useDirection(): TextDirection {
  return "ltr"
}

export { DirectionProvider, useDirection }
