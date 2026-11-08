import { ColorPickerPopover } from "@/styles/radix-fabricator/ui/color-picker"

export function ColorPickerSizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ColorPickerPopover size="sm" defaultValue="#22c55e" />
      <ColorPickerPopover defaultValue="#6b97ff" />
      <ColorPickerPopover size="lg" defaultValue="#ec4899" />
    </div>
  )
}
