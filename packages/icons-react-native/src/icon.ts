import { createElement, useId, type ReactElement, type ReactNode } from "react"
import { G, Mask, Svg, type SvgProps } from "react-native-svg"

import { useIconDefaults, type ResolvedIconDefaults } from "./context.js"
import { renderShapes } from "./elements.js"
import {
  getArtworkViewBox,
  getStrokeWidth,
  hasA11yProp,
  ICON_SIZE,
} from "./generated/runtime/attributes.js"
import type { IconData } from "./generated/runtime/types.js"
import { getCutoutMask, resolveUiPaint } from "./generated/runtime/ui-paint.js"

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
  defaults: ResolvedIconDefaults,
  identifier?: string
) {
  const resolvedSize = size ?? defaults.size ?? ICON_SIZE
  const stroke = color ?? defaults.foreground
  const isLabelled = Boolean(children) || hasA11yProp(rest)

  const secondaryPaint = secondaryColor ?? stroke
  const opacity = secondaryOpacity ?? 0.2
  const artwork = [
    ...renderShapes(
      resolveUiPaint(data.secondary ?? [], secondaryPaint).map(
        ([tag, attributes]) => [
          tag,
          attributes.stroke
            ? { ...attributes, fill: "none", strokeOpacity: String(opacity) }
            : {
                ...attributes,
                stroke: "none",
                fill: secondaryPaint,
                fillOpacity: String(opacity),
              },
        ]
      ),
      {},
      "tonal"
    ),
    ...renderShapes(
      resolveUiPaint(data.node, stroke),
      nonScalingStroke ? { vectorEffect: "non-scaling-stroke" } : {}
    ),
  ]
  const maskId = identifier && `fab-cutout-${identifier}`
  const body =
    data.cutout?.length && maskId
      ? [
          createElement(
            Mask,
            {
              key: "mask",
              id: maskId,
              maskUnits: "userSpaceOnUse",
              x: 0,
              y: 0,
              width: 24,
              height: 24,
            },
            ...renderShapes(getCutoutMask(data.cutout))
          ),
          createElement(
            G,
            { key: "artwork", mask: `url(#${maskId})` },
            ...artwork
          ),
        ]
      : artwork
  return createElement(
    Svg,
    {
      width: width ?? resolvedSize,
      height: height ?? resolvedSize,
      viewBox: getArtworkViewBox(ICON_SIZE, ICON_SIZE, data.opticalScale),
      fill: data.paint === "fill" ? stroke : "none",
      stroke: data.paint === "fill" ? "none" : stroke,
      strokeWidth: getStrokeWidth({
        strokeWidth: strokeWidth ?? defaults.strokeWidth ?? data.strokeWidth,
        absoluteStrokeWidth:
          absoluteStrokeWidth ?? defaults.absoluteStrokeWidth,
        size: resolvedSize,
        opticalScale: rest.viewBox ? 1 : data.opticalScale,
      }),
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...(!isLabelled && { "aria-hidden": true }),
      ...rest,
    },
    ...body,
    children
  )
}

/** Renders any icon data: `<Icon data={myIcon} />`. */
export function Icon({ data, ...props }: IconProps & { data: IconData }) {
  return renderIcon(data, props, useIconDefaults(), useId())
}
