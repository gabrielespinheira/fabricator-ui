import { ColorPicker } from "@/styles/radix-fabricator/ui/color-picker"

export function ColorPickerNoEyedropper() {
  return (
    <ColorPicker defaultValue="#f97316" defaultFormat="hsl" hideEyedropper />
  )
}
