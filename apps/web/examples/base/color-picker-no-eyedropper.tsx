import { ColorPicker } from "@/styles/base-fabricator/ui/color-picker"

export function ColorPickerNoEyedropper() {
  return (
    <ColorPicker defaultValue="#f97316" defaultFormat="hsl" hideEyedropper />
  )
}
