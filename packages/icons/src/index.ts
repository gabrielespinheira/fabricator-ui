export * from "./generated/outline.js"
export { createIcon } from "./create-icon.js"
export { Icon, renderIcon, type IconComponent, type IconProps } from "./icon.js"
// Lucide's type names, so moving from lucide-react stays an import change.
export type {
  IconComponent as LucideIcon,
  IconProps as LucideProps,
} from "./icon.js"
export type { IconData, IconElement } from "./generated/runtime/types.js"
