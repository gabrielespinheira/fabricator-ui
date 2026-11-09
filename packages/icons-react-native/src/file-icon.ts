import { createElement, useId, type ReactElement } from "react"
import { Mask, Svg, type SvgProps } from "react-native-svg"

import { useIconDefaults } from "./context.js"
import { renderShapes } from "./elements.js"
import { filePalette } from "./generated/file-palette.js"
import { hasA11yProp } from "./generated/runtime/attributes.js"
import {
  resolveFilePaint,
  type FileIconData,
} from "./generated/runtime/files.js"
import { toPascalCase } from "./generated/runtime/names.js"

export type FileIconProps = SvgProps & { size?: number }
export type FileIconComponent = (props: FileIconProps) => ReactElement

export function FileIcon({
  data,
  size,
  width,
  height,
  children,
  ...props
}: FileIconProps & { data: FileIconData }) {
  const defaults = useIconDefaults()
  const prefix = useId().replaceAll(":", "")
  const node = resolveFilePaint(
    data.node,
    filePalette,
    defaults.colorScheme
  ).map(([tag, attributes]): FileIconData["node"][number] => [
    tag,
    {
      ...attributes,
      ...(attributes.mask && {
        mask: attributes.mask.replace("url(#", `url(#${prefix}`),
      }),
    },
  ])
  const resolvedSize = size ?? defaults.size ?? 16
  return createElement(
    Svg,
    {
      viewBox: "0 0 16 16",
      width: width ?? resolvedSize,
      height: height ?? resolvedSize,
      fill: "none",
      ...(!children && !hasA11yProp(props) && { "aria-hidden": true }),
      ...props,
    },
    ...(data.masks?.map((mask) =>
      createElement(
        Mask,
        { ...mask.attributes, key: mask.id, id: `${prefix}${mask.id}` },
        ...renderShapes(mask.node)
      )
    ) ?? []),
    ...renderShapes(node),
    children
  )
}

export function createFileIcon(data: FileIconData): FileIconComponent {
  const Component = (props: FileIconProps) =>
    createElement(FileIcon, { data, ...props })
  Component.displayName = `${toPascalCase(data.name)}Icon`
  return Component
}
