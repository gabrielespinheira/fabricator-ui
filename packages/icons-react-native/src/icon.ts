import { createElement, type ReactElement, type ReactNode } from "react"
import { Svg, type SvgProps } from "react-native-svg"

import { useIconDefaults, type ResolvedIconDefaults } from "./context.js"
import { renderShapes } from "./elements.js"
import {
  getStrokeWidth,
  hasA11yProp,
  ICON_SIZE,
} from "./generated/runtime/attributes.js"
import type { IconData } from "./generated/runtime/types.js"

export type IconProps = Omit<SvgProps, "color"> & {
  /** Width and height. Defaults to the provider's size, then 24. */
  size?: number
  /** Stroke colour. Defaults to the provider's colour, then the scheme's foreground. */
  color?: string
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
  /** Adds `vectorEffect="non-scaling-stroke"` to every shape. */
  nonScalingStroke?: boolean
  /** Duotone only: the secondary layer's colour. Defaults to the icon colour. */
  secondaryColor?: string
  /** Duotone only: the secondary layer's opacity. Defaults to 0.2. */
  secondaryOpacity?: number
  children?: ReactNode
}

export type IconComponent = ((props: IconProps) => ReactElement) & {
  displayName?: string
}

/** Renders stroke icon data with react-native-svg. */
export function renderIcon(
  data: IconData,
  {
    size,
    width,
    height,
    color,
    strokeWidth,
    absoluteStrokeWidth,
    nonScalingStroke,
    secondaryColor,
    secondaryOpacity,
    children,
    ...rest
  }: IconProps,
  defaults: ResolvedIconDefaults
) {
  const resolvedSize = size ?? defaults.size ?? ICON_SIZE
  const stroke = color ?? defaults.foreground
  const isLabelled = Boolean(children) || hasA11yProp(rest)

  return createElement(
    Svg,
    {
      width: width ?? resolvedSize,
      height: height ?? resolvedSize,
      viewBox: `0 0 ${ICON_SIZE} ${ICON_SIZE}`,
      fill: "none",
      stroke,
      strokeWidth: getStrokeWidth({
        strokeWidth: strokeWidth ?? defaults.strokeWidth,
        absoluteStrokeWidth:
          absoluteStrokeWidth ?? defaults.absoluteStrokeWidth,
        size: resolvedSize,
      }),
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...(!isLabelled && { "aria-hidden": true }),
      ...rest,
    },
    ...(data.secondary
      ? renderShapes(data.secondary, {
          stroke: "none",
          fill: secondaryColor ?? stroke,
          fillOpacity: secondaryOpacity ?? 0.2,
        })
      : []),
    ...renderShapes(
      // Lucide draws a few dots with fill="currentColor"; React Native has no
      // currentColor inheritance, so they take the stroke colour.
      data.node.map(([tag, attributes]) => [
        tag,
        attributes.fill === "currentColor"
          ? { ...attributes, fill: stroke }
          : attributes,
      ]),
      nonScalingStroke ? { vectorEffect: "non-scaling-stroke" } : {}
    ),
    children
  )
}

/** Renders any icon data: `<Icon data={myIcon} />`. */
export function Icon({ data, ...props }: IconProps & { data: IconData }) {
  return renderIcon(data, props, useIconDefaults())
}
