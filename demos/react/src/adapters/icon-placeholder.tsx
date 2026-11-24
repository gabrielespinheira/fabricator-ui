import {
  DynamicIcon,
  type DynamicIconProps,
} from "@fabricator-ui/icons/dynamic"

type IconPlaceholderProps = Omit<DynamicIconProps, "name"> & {
  lucide: string
  tabler?: string
  hugeicons?: string
  phosphor?: string
  remixicon?: string
}

function IconPlaceholder({
  lucide,
  tabler: _tabler,
  hugeicons: _hugeicons,
  phosphor: _phosphor,
  remixicon: _remixicon,
  ...props
}: IconPlaceholderProps) {
  return <DynamicIcon name={lucide} {...props} />
}

export { IconPlaceholder }
