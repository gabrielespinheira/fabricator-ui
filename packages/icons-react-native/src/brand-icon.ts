import { createElement, useId, type ReactElement, type ReactNode } from "react"
import {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Svg,
  type SvgProps,
} from "react-native-svg"

import { useIconDefaults, type ResolvedIconDefaults } from "./context.js"
import { renderShapes } from "./elements.js"
import {
  getBrandViewBox,
  hasA11yProp,
  ICON_SIZE,
} from "./generated/runtime/attributes.js"
import { prefixGradientFills } from "./generated/runtime/gradients.js"
import { toPascalCase } from "./generated/runtime/names.js"
import type { BrandGradient, BrandIconData } from "./generated/runtime/types.js"

export type BrandIconProps = Omit<SvgProps, "color"> & {
  size?: number
  /**
   * Any colour, the scheme's foreground by default. `"brand"` paints the
   * brand's own colours: multi-colour art where the mark has it, else the
   * official hex, lifted in dark mode when it would vanish.
   */
  color?: "brand" | (string & {})
  /** Ignored: brand marks are filled. Accepted so icon lists can share props. */
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
  nonScalingStroke?: boolean
  children?: ReactNode
}

export type BrandIconComponent = ((props: BrandIconProps) => ReactElement) & {
  displayName?: string
}

function brandFill(data: BrandIconData, defaults: ResolvedIconDefaults) {
  if (data.colors.inherit) return defaults.foreground
  return defaults.colorScheme === "dark" ? data.colors.dark : data.colors.light
}

function renderGradient(gradient: BrandGradient, prefix: string) {
  const props = {
    key: gradient.id,
    id: `${prefix}${gradient.id}`,
    ...gradient.attributes,
  }
  const stops = gradient.stops.map((stop, index) =>
    createElement(Stop, {
      key: index,
      offset: stop.offset,
      stopColor: stop.color,
      ...(stop.opacity !== undefined && { stopOpacity: stop.opacity }),
    })
  )
  return gradient.type === "linearGradient"
    ? createElement(LinearGradient, props, ...stops)
    : createElement(RadialGradient, props, ...stops)
}

function renderGradients(gradients: BrandGradient[], prefix: string) {
  return createElement(
    Defs,
    { key: "defs" },
    ...gradients.map((gradient) => renderGradient(gradient, prefix))
  )
}

/**
 * Renders a brand mark with react-native-svg. `gradientPrefix` keeps gradient
 * ids unique per copy, which matters on react-native-web.
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
    children,
    ...rest
  }: BrandIconProps,
  defaults: ResolvedIconDefaults,
  gradientPrefix = ""
) {
  const isBrand = color === "brand"
  const art = isBrand ? data.art : undefined
  const gradients = art?.gradients ?? []
  const resolvedSize = size ?? defaults.size ?? ICON_SIZE
  const fill = isBrand
    ? art
      ? defaults.foreground
      : brandFill(data, defaults)
    : (color ?? defaults.foreground)
  const isLabelled = Boolean(children) || hasA11yProp(rest)

  return createElement(
    Svg,
    {
      width: width ?? resolvedSize,
      height: height ?? resolvedSize,
      viewBox: getBrandViewBox(
        art?.width ?? ICON_SIZE,
        art?.height ?? ICON_SIZE,
        data.scale
      ),
      fill,
      ...(!isLabelled && { "aria-hidden": true }),
      ...rest,
    },
    ...(gradients.length > 0
      ? [renderGradients(gradients, gradientPrefix)]
      : []),
    ...renderShapes(
      prefixGradientFills(
        art?.node ?? data.node,
        gradients.length > 0 ? gradientPrefix : ""
      )
    ),
    children
  )
}

/** Renders any brand data: `<BrandIcon data={myMark} />`. */
export function BrandIcon({
  data,
  ...props
}: BrandIconProps & { data: BrandIconData }) {
  return renderBrandIcon(data, props, useIconDefaults(), useId())
}

/** Turns brand data into a component, the way every brand mark is built. */
export function createBrandIcon(data: BrandIconData): BrandIconComponent {
  const Component = (props: BrandIconProps) =>
    renderBrandIcon(data, props, useIconDefaults(), useId())
  Component.displayName = `${toPascalCase(data.name)}Icon`
  return Component
}
