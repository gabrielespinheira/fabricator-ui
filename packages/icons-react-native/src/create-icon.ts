import { createElement } from "react"

import { useIconDefaults } from "./context.js"
import { toPascalCase } from "./generated/runtime/names.js"
import type { IconData } from "./generated/runtime/types.js"
import { Icon, renderIcon, type IconComponent, type IconProps } from "./icon.js"

/** Turns stroke icon data into a component, the way every outline icon is built. */
export function createIcon(data: IconData): IconComponent {
  const Component: IconComponent = data.cutout?.length
    ? (props: IconProps) => createElement(Icon, { ...props, data })
    : function NativeIcon(props: IconProps) {
        return renderIcon(data, props, useIconDefaults())
      }
  Component.displayName = `${toPascalCase(data.name)}Icon`
  return Component
}
