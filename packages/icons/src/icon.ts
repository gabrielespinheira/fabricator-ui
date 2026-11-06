import { createElement, type ReactElement, type SVGProps } from "react"

import {
  getStrokeWidth,
  hasA11yProp,
  ICON_SIZE,
  mergeClasses,
} from "./generated/runtime/attributes.js"
import type { IconData, IconElement } from "./generated/runtime/types.js"

export type IconProps = SVGProps<SVGSVGElement> & {
  /** Width and height. Defaults to 24. */
  size?: number | string
  /** Keeps the stroke's pixel width at any size (Lucide's prop). */
  absoluteStrokeWidth?: boolean
  /** Adds `vector-effect="non-scaling-stroke"` to every shape. */
  nonScalingStroke?: boolean
  /** Duotone only: the secondary layer's colour. Defaults to the icon colour. */
  secondaryColor?: string
  /** Duotone only: the secondary layer's opacity. Defaults to 0.2. */
  secondaryOpacity?: number | string
}

export type IconComponent = ((props: IconProps) => ReactElement) & {
  displayName?: string
}

const SECONDARY_STYLE = {
  fill: "var(--icon-secondary-color, currentColor)",
  fillOpacity: "var(--icon-secondary-opacity, 0.2)",
}

function renderShapes(node: IconElement[], extra: Record<string, unknown>) {
  return node.map(([tag, attributes], index) =>
    createElement(tag, { key: index, ...extra, ...attributes })
  )
}

/** Renders stroke icon data as an `<svg>` with Lucide's attributes. */
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
    className,
    style,
    children,
    ...rest
  }: IconProps
) {
  const isLabelled = Boolean(children) || hasA11yProp(rest)
  const shapeAttributes = nonScalingStroke
    ? { vectorEffect: "non-scaling-stroke" }
    : {}
  const variables = {
    ...(secondaryColor !== undefined && {
      "--icon-secondary-color": secondaryColor,
    }),
    ...(secondaryOpacity !== undefined && {
      "--icon-secondary-opacity": secondaryOpacity,
    }),
  }
  const hasStyle = style !== undefined || Object.keys(variables).length > 0

  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: width ?? size ?? ICON_SIZE,
      height: height ?? size ?? ICON_SIZE,
      viewBox: `0 0 ${ICON_SIZE} ${ICON_SIZE}`,
      fill: "none",
      stroke: color ?? "currentColor",
      strokeWidth: getStrokeWidth({
        strokeWidth,
        absoluteStrokeWidth,
        size: size ?? width,
      }),
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: mergeClasses("fab-icon", `fab-icon-${data.name}`, className),
      ...(!isLabelled && { "aria-hidden": "true" }),
      ...(hasStyle && { style: { ...variables, ...style } }),
      ...rest,
    },
    ...(data.secondary
      ? renderShapes(data.secondary, { stroke: "none", style: SECONDARY_STYLE })
      : []),
    ...renderShapes(data.node, shapeAttributes),
    children
  )
}

/** Renders any icon data: `<Icon data={myIcon} />`. */
export function Icon({ data, ...props }: IconProps & { data: IconData }) {
  return renderIcon(data, props)
}
