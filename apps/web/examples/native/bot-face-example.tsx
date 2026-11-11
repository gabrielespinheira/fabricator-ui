import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import {
  BotFace,
  type BotFaceColor,
  type BotFaceEyes,
  type BotFaceShape,
} from "@/registry/native/ui/bot-face"
import { Button } from "@/registry/native/ui/button"

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
const themeColors = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "destructive",
] as const
const paletteColors = [
  "neutral",
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
  const [eyes, setEyes] = React.useState<BotFaceEyes>("slant")
  const [animated, setAnimated] = React.useState(true)
  const isThemeColor = themeColors.some((value) => value === color)
  const colors = isThemeColor ? themeColors : paletteColors
  return (
    <ExampleWrapper>
      <Example title="Face" className="items-center">
        <BotFace
          shape={shape}
          color={color}
          eyes={eyes}
          size="lg"
          animated={animated}
          aria-label="Assistant preview"
        />
        <View className="flex-row flex-wrap justify-center gap-2">
          {shapes.map((value) => (
            <Button
              key={value}
              variant={shape === value ? "secondary" : "ghost"}
              aria-label={`Use ${value} shape`}
              aria-pressed={shape === value}
              onPress={() => setShape(value)}
            >
              <BotFace
                shape={value}
                color={color}
                eyes={eyes}
                size="sm"
                animated={animated}
              />
            </Button>
          ))}
        </View>
        <View className="flex-row justify-center gap-2">
          <Button
            variant={isThemeColor ? "ghost" : "secondary"}
            aria-label="Use palette colors"
            aria-pressed={!isThemeColor}
            onPress={() => setColor("violet")}
          >
            Palette
          </Button>
          <Button
            variant={isThemeColor ? "secondary" : "ghost"}
            aria-label="Use theme colors"
            aria-pressed={isThemeColor}
            onPress={() => setColor("primary")}
          >
            Theme
          </Button>
        </View>
        <View className="flex-row flex-wrap justify-center gap-2">
          {colors.map((value) => (
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
              {isThemeColor
                ? value.charAt(0).toUpperCase() + value.slice(1)
                : null}
            </Button>
          ))}
        </View>
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
          <Button
            variant="outline"
            aria-pressed={!animated}
            onPress={() => setAnimated(!animated)}
          >
            {animated ? "Pause" : "Resume"}
          </Button>
        </View>
      </Example>
      <Example title="Sizes" className="flex-row items-center">
        <BotFace size="sm" color="violet" />
        <BotFace color="info" shape="circle" />
        <BotFace size="lg" color="success" shape="flower" />
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
