import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import {
  BotFace,
  type BotFaceColor,
  type BotFaceEyes,
  type BotFaceShape,
  type BotFaceState,
} from "@/registry/native/ui/bot-face"
import { Button } from "@/registry/native/ui/button"
import { ColorPickerPopover } from "@/registry/native/ui/color-picker"

const shapes = [
  "circle",
  "blob",
  "square",
  "star",
  "clover",
  "heart",
  "flower",
  "droplet",
  "pill",
  "triangle",
  "pentagon",
  "burst",
  "hexagon",
  "squircle",
] as const
const paletteColors = [
  "neutral",
  "gray",
  "blue",
  "indigo",
  "violet",
  "pink",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
] as const

function BotFaceExample() {
  const [shape, setShape] = React.useState<BotFaceShape>("squircle")
  const [color, setColor] = React.useState<BotFaceColor>("violet")
  const [customColor, setCustomColor] = React.useState<`#${string}`>("#8b5cf6")
  const [eyes, setEyes] = React.useState<BotFaceEyes>("slant")
  const [state, setState] = React.useState<BotFaceState>("idle")
  return (
    <ExampleWrapper>
      <Example title="Agent states" className="items-center">
        <BotFace
          state={state}
          shape={shape}
          size="lg"
          eyes={eyes}
          color={color}
          aria-label={`Assistant ${state.replaceAll("-", " ")}`}
        />
        <View className="flex-row flex-wrap justify-center gap-2">
          {(
            [
              "idle",
              "listening",
              "thinking",
              "working",
              "speaking",
              "happy",
              "sad",
              "questioning",
              "awaiting-permission",
              "error",
            ] as const
          ).map((value) => (
            <Button
              key={value}
              variant={state === value ? "secondary" : "ghost"}
              aria-pressed={state === value}
              onPress={() => setState(value)}
            >
              <BotFace
                state={value}
                color={color}
                eyes={eyes}
                size="sm"
                animated={false}
              />
              {value === "awaiting-permission"
                ? "Permission"
                : value.charAt(0).toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </View>
        <View className="flex-row flex-wrap justify-center gap-2">
          {shapes.map((value) => (
            <Button
              key={value}
              variant={shape === value ? "secondary" : "ghost"}
              aria-label={`Use ${value} shape`}
              aria-pressed={shape === value}
              onPress={() => setShape(value)}
            >
              <BotFace shape={value} color={color} eyes={eyes} size="sm" />
            </Button>
          ))}
        </View>
        <View className="flex-row flex-wrap justify-center gap-2">
          {paletteColors.map((value) => (
            <Button
              key={value}
              variant={color === value ? "secondary" : "ghost"}
              aria-label={`Use ${value} color`}
              aria-pressed={color === value}
              onPress={() => setColor(value)}
            >
              <BotFace
                shape="circle"
                color={value}
                eyes="dots"
                size="sm"
                animated={false}
                style={{ width: 24, height: 24 }}
              />
            </Button>
          ))}
        </View>
        <ColorPickerPopover
          triggerLabel="Custom"
          value={customColor}
          onOpenChange={(isOpen) => {
            if (isOpen) setColor(customColor)
          }}
          onValueChange={(_, parsed) => {
            const next = `#${parsed.hex.slice(1)}` as const
            setCustomColor(next)
            setColor(next)
          }}
        />
        <View className="flex-row flex-wrap justify-center gap-2">
          {(["slant", "dots", "square"] as const).map((value) => (
            <Button
              key={value}
              variant={eyes === value ? "secondary" : "outline"}
              aria-pressed={eyes === value}
              onPress={() => setEyes(value)}
            >
              {value === "slant"
                ? "Slanted"
                : value === "dots"
                  ? "Dots"
                  : "Squares"}
            </Button>
          ))}
        </View>
      </Example>
      <Example title="Sizes" className="flex-row items-center">
        <BotFace size="sm" color="violet" />
        <BotFace color="info" shape="circle" />
        <BotFace size="lg" color="success" shape="flower" />
      </Example>
      <Example
        title="Status colors"
        className="flex-row flex-wrap items-center"
      >
        <BotFace color="primary" aria-label="Assistant ready" />
        <BotFace
          color="warning"
          state="awaiting-permission"
          aria-label="Waiting for permission"
        />
        <BotFace
          color="destructive"
          state="error"
          aria-label="Assistant error"
        />
      </Example>
      <Example title="Eye styles" className="flex-row flex-wrap">
        <BotFace eyes="slant" color="violet" />
        <BotFace eyes="dots" color="teal" shape="pill" />
        <BotFace eyes="square" color="orange" shape="hexagon" />
      </Example>
    </ExampleWrapper>
  )
}
export { BotFaceExample }
