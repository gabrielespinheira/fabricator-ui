import * as React from "react"
import { Slot } from "@rn-primitives/slot"

export type RenderProps = {
  /** Renders this element instead, with this part's props merged onto it. */
  render?: React.ReactElement<{ children?: React.ReactNode }>
  /** Radix's form of `render`: the only child takes this part's props. */
  asChild?: boolean
}

/**
 * The composition APIs both web bases use. Returns the element to render when
 * `render` or `asChild` is set, or null to render the part itself.
 */
export function renderSlot(
  { render, asChild }: RenderProps,
  props: Record<string, unknown>,
  children?: React.ReactNode
) {
  if (render) {
    return (
      <Slot {...props}>
        {React.cloneElement(
          render,
          undefined,
          children ?? render.props.children
        )}
      </Slot>
    )
  }
  if (asChild) return <Slot {...props}>{children}</Slot>
  return null
}

/**
 * For parts built on a primitive that has `asChild`: `render` as the primitive
 * takes it.
 */
export function resolveRender({
  render,
  asChild,
  children,
}: RenderProps & { children?: React.ReactNode }) {
  if (!render) return { asChild, children }
  return {
    asChild: true,
    children: React.cloneElement(
      render,
      undefined,
      children ?? render.props.children
    ),
  }
}
