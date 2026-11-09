import { ColorPicker } from "@/styles/base-fabricator/ui/color-picker"

const swatches = [
  { color: "#ef4444", label: "Red" },
  { color: "#f97316", label: "Orange" },
  { color: "#eab308", label: "Yellow" },
  { color: "#22c55e", label: "Green" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#6b97ff", label: "Blue" },
  { color: "#a855f7", label: "Purple" },
  { color: "#ec4899", label: "Pink" },
  { color: "#0a0a0a", label: "Black" },
  { color: "#737373", label: "Gray" },
  { color: "#ffffff", label: "White" },
  { color: "#6b97ff80", label: "Blue, half opacity" },
]

export function ColorPickerSwatches() {
  return <ColorPicker defaultValue="#22c55e" swatches={swatches} />
}
