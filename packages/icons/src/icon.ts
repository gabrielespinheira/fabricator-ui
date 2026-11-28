import {
  createElement,
  useId,
  type ReactElement,
  type ReactNode,
  type SVGProps,
} from "react"

import {
  getArtworkViewBox,
  getStrokeWidth,
  hasA11yProp,
  ICON_SIZE,
  mergeClasses,
} from "./generated/runtime/attributes.js"
import type { IconData, IconElement } from "./generated/runtime/types.js"
import { getCutoutMask, resolveUiPaint } from "./generated/runtime/ui-paint.js"

export type IconProps = SVGProps<SVGSVGElement> & {
  /** Width and height. Defaults to 24. */
  size?: number | string
  /**
   * The stroke in grid units. Left out, it follows a pixel `size`: heavier
   * as the icon shrinks (2.125 at 16px), 1.75 at 24px or with no size.
   */
  strokeWidth?: number | string
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

export type IconArtworkLayer = "primary" | "secondary" | "cutout"
// Three grids wide, centred on the icon's (written out: it ships in every icon).
const animatedMaskArea = { x: "-24", y: "-24", width: "72", height: "72" }

type IconShape = ReactElement<SVGProps<SVGElement>>
type WrapShape = (
  shape: IconShape,
  layer: IconArtworkLayer,
  index: number
) => IconShape

function renderShapes(
  node: IconElement[],
  extra: Record<string, unknown>,
  layer = "outline"
) {
  return node.map(([tag, attributes], index) =>
    createElement(tag, { key: `${layer}-${index}`, ...extra, ...attributes })
  )
}

function renderSecondary(node: IconElement[], paint: string) {
  const color = `var(--icon-secondary-color, ${paint})`
  const opacity = "var(--icon-secondary-opacity, 0.2)"
  return node.map(([tag, attributes], index) =>
    createElement(
      tag,
      attributes.stroke
        ? {
            ...attributes,
            key: `tonal-${index}`,
            fill: "none",
            style: { stroke: color, strokeOpacity: opacity },
          }
        : {
            key: `tonal-${index}`,
            stroke: "none",
            style: { fill: color, fillOpacity: opacity },
            ...attributes,
          }
    )
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
  }: IconProps,
  options: {
    maskId?: string
    allowOverflow?: boolean
    wrapArtwork?: (artwork: ReactNode) => ReactNode
    wrapShape?: WrapShape
  } = {}
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
  const paint = color ?? "currentColor"
  const { wrapShape } = options
  const artwork = [
    ...renderSecondary(data.secondary ?? [], paint).map((shape, index) =>
      wrapShape ? wrapShape(shape, "secondary", index) : shape
    ),
    ...renderShapes(resolveUiPaint(data.node, color), shapeAttributes).map(
      (shape, index) => (wrapShape ? wrapShape(shape, "primary", index) : shape)
    ),
  ]
  const maskId = options.maskId && `fab-cutout-${options.maskId}`
  const maskArea = options.allowOverflow ? animatedMaskArea : undefined
  const body =
    data.cutout?.length && maskId
      ? [
          createElement(
            "mask",
            {
              key: "mask",
              id: maskId,
              maskUnits: "userSpaceOnUse",
              x: 0,
              y: 0,
              width: 24,
              height: 24,
              ...maskArea,
            },
            ...renderShapes(getCutoutMask(data.cutout, maskArea), {}).map(
              (shape, index) =>
                wrapShape && index > 0
                  ? wrapShape(shape, "cutout", index - 1)
                  : shape
            )
          ),
          createElement(
            "g",
            { key: "artwork", mask: `url(#${maskId})` },
            ...artwork
          ),
        ]
      : artwork

  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: width ?? size ?? ICON_SIZE,
      height: height ?? size ?? ICON_SIZE,
      viewBox: getArtworkViewBox(ICON_SIZE, ICON_SIZE, data.opticalScale),
      fill: data.paint === "fill" ? paint : "none",
      stroke: data.paint === "fill" ? "none" : paint,
      strokeWidth: getStrokeWidth({
        strokeWidth,
        baseStrokeWidth: data.strokeWidth,
        absoluteStrokeWidth,
        size: size ?? width,
        opticalScale: rest.viewBox ? 1 : data.opticalScale,
      }),
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: mergeClasses("fab-icon", `fab-icon-${data.name}`, className),
      ...(!isLabelled && { "aria-hidden": "true" }),
      // React writes no attribute for an empty style.
      style: { ...variables, ...style },
      ...(options.allowOverflow && { overflow: "visible" }),
      ...rest,
    },
    options.wrapArtwork ? options.wrapArtwork(body) : body,
    children
  )
}

/** Renders any icon data: `<Icon data={myIcon} />`. */
export function Icon({ data, ...props }: IconProps & { data: IconData }) {
  return renderIcon(data, props, { maskId: useId() })
}
