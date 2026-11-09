import { createElement, useId, type ReactElement, type SVGProps } from "react"

import { hasA11yProp, mergeClasses } from "./generated/runtime/attributes.js"
import type { FileIconData } from "./generated/runtime/files.js"
import { toPascalCase } from "./generated/runtime/names.js"

export type FileIconProps = SVGProps<SVGSVGElement> & { size?: number | string }
export type FileIconComponent = (props: FileIconProps) => ReactElement

function renderShapes(node: FileIconData["node"], prefix: string) {
  return node.map(([tag, attributes], key) =>
    createElement(tag, {
      ...attributes,
      key,
      ...(attributes.mask && {
        mask: attributes.mask.replace("url(#", `url(#${prefix}`),
      }),
    })
  )
}

export function FileIcon({
  data,
  size = 16,
  width,
  height,
  children,
  className,
  ...props
}: FileIconProps & { data: FileIconData }) {
  const prefix = useId().replaceAll(":", "")
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 16 16",
      width: width ?? size,
      height: height ?? size,
      fill: "none",
      ...(!children && !hasA11yProp(props) && { "aria-hidden": true }),
      ...props,
      className: mergeClasses("fab-icon", `fab-${data.name}`, className),
    },
    ...(data.masks?.map((mask) =>
      createElement(
        "mask",
        { ...mask.attributes, key: mask.id, id: `${prefix}${mask.id}` },
        ...renderShapes(mask.node, prefix)
      )
    ) ?? []),
    ...renderShapes(data.node, prefix),
    children
  )
}

export function createFileIcon(data: FileIconData): FileIconComponent {
  const Component = (props: FileIconProps) =>
    createElement(FileIcon, { data, ...props })
  Component.displayName = `${toPascalCase(data.name)}Icon`
  return Component
}
