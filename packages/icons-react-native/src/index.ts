export * from "./generated/outline.js"
export {
  IconProvider,
  FOREGROUND,
  type ColorScheme,
  type IconDefaults,
} from "./context.js"
export { createIcon } from "./create-icon.js"
export { Icon, renderIcon, type IconComponent, type IconProps } from "./icon.js"
export type { IconData, IconElement } from "./generated/runtime/types.js"
// The stroke an icon picks for its size when none is given.
export { getAutoStrokeWidth } from "./generated/runtime/attributes.js"
