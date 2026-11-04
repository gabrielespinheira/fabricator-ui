import { createElement, useId, type ReactElement, type SVGProps } from "react"

import {
  getBrandViewBox,
  hasA11yProp,
  ICON_SIZE,
  mergeClasses,
} from "./generated/runtime/attributes.js"
import { prefixGradientFills } from "./generated/runtime/gradients.js"
import { toPascalCase } from "./generated/runtime/names.js"
import type { BrandGradient, BrandIconData } from "./generated/runtime/types.js"

export type BrandIconProps = Omit<SVGProps<SVGSVGElement>, "color"> & {
  /** Width and height. Defaults to 24. */
  size?: number | string
  /**
   * Any CSS colour, `currentColor` by default. `"brand"` paints the brand's
   * own colours: multi-colour art where the mark has it, else the official
   * hex, lifted in dark mode when it would vanish on a dark surface.
   */
  color?: "brand" | (string & {})
  /** Ignored: brand marks are filled. Accepted so icon lists can share props. */
  strokeWidth?: number | string
  /** Ignored, as `strokeWidth`. */
  absoluteStrokeWidth?: boolean
  /** Ignored, as `strokeWidth`. */
  nonScalingStroke?: boolean
}

export type BrandIconComponent = ((props: BrandIconProps) => ReactElement) & {
  displayName?: string
}

function paint(
  data: BrandIconData,
  color: BrandIconProps["color"],
  hasArt: boolean
) {
  if (color !== "brand") return { fill: color ?? "currentColor" }
  if (hasArt || data.colors.inherit) return { fill: "currentColor" }
  const { light, dark } = data.colors
  return light === dark
    ? { fill: light }
    : { fill: light, style: { fill: `light-dark(${light}, ${dark})` } }
}

function renderGradients(gradients: BrandGradient[], prefix: string) {
  return createElement(
    "defs",
    { key: "defs" },
    ...gradients.map((gradient) =>
      createElement(
        gradient.type,
        {
          key: gradient.id,
          id: `${prefix}${gradient.id}`,
          ...gradient.attributes,
        },
        ...gradient.stops.map((stop, index) =>
          createElement("stop", {
            key: index,
            offset: stop.offset,
            stopColor: stop.color,
            ...(stop.opacity !== undefined && { stopOpacity: stop.opacity }),
          })
        )
      )
    )
  )
}

/**
 * Renders a brand mark as a filled `<svg>`. `gradientPrefix` keeps gradient
 * ids unique per copy; the components pass one from `useId`.
 */
export function renderBrandIcon(
  data: BrandIconData,
  {
    size,
    width,
    height,
    color,
    strokeWidth: _strokeWidth,
    absoluteStrokeWidth: _absoluteStrokeWidth,
    nonScalingStroke: _nonScalingStroke,
    className,
    style,
    children,
    ...rest
  }: BrandIconProps,
  gradientPrefix = ""
) {
  const art = color === "brand" ? data.art : undefined
  const gradients = art?.gradients ?? []
  const isLabelled = Boolean(children) || hasA11yProp(rest)
  const { fill, style: paintStyle } = paint(data, color, Boolean(art))
  const mergedStyle =
    paintStyle || style ? { ...paintStyle, ...style } : undefined

  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: width ?? size ?? ICON_SIZE,
      height: height ?? size ?? ICON_SIZE,
      viewBox: getBrandViewBox(
        art?.width ?? ICON_SIZE,
        art?.height ?? ICON_SIZE,
        data.scale
      ),
      fill,
      className: mergeClasses("fab-icon", `fab-brand-${data.name}`, className),
      ...(!isLabelled && { "aria-hidden": "true" }),
      ...(mergedStyle && { style: mergedStyle }),
      ...rest,
    },
    ...(gradients.length > 0
      ? [renderGradients(gradients, gradientPrefix)]
      : []),
    ...prefixGradientFills(
      art?.node ?? data.node,
      gradients.length > 0 ? gradientPrefix : ""
    ).map(([tag, attributes], index) =>
      createElement(tag, { key: index, ...attributes })
    ),
    children
  )
}

/** Renders any brand data: `<BrandIcon data={myMark} />`. */
export function BrandIcon({
  data,
  ...props
}: BrandIconProps & { data: BrandIconData }) {
  return renderBrandIcon(data, props, useId())
}

/** Turns brand data into a component, the way every brand mark is built. */
export function createBrandIcon(data: BrandIconData): BrandIconComponent {
  const Component = (props: BrandIconProps) =>
    renderBrandIcon(data, props, useId())
  Component.displayName = `${toPascalCase(data.name)}Icon`
  return Component
}
