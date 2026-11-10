import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import {
  ColorPicker,
  ColorPickerPopover,
  ColorSwatch,
  ColorTile,
} from "@/registry/native/ui/color-picker"

const SWATCHES = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#171717",
]
function ColorPickerExample() {
  return (
    <ExampleWrapper fit>
      <Example title="Color picker">
        <ColorPicker defaultValue="#3b82f6" swatches={SWATCHES} />
      </Example>
      <Example title="Formats">
        <ColorPicker defaultValue="#8b5cf680" defaultFormat="oklch" size="sm" />
      </Example>
      <Example title="Popover and sizes">
        <View className="flex-row flex-wrap gap-3">
          {(["sm", "default", "lg"] as const).map((size) => (
            <ColorPickerPopover
              key={size}
              size={size}
              triggerLabel={size}
              triggerShowValue
              defaultValue="#22c55e"
              swatches={SWATCHES}
            />
          ))}
        </View>
      </Example>
      <Example title="Swatches and tiles">
        <View className="flex-row flex-wrap gap-2">
          {SWATCHES.map((color) => (
            <ColorSwatch key={color} color={color} />
          ))}
          <ColorTile color="#3b82f680" />
        </View>
      </Example>
    </ExampleWrapper>
  )
}
export { ColorPickerExample }
