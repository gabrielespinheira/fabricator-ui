"use client"

import * as React from "react"

import {
  BotFace,
  type BotFaceColor,
  type BotFaceEyes,
  type BotFaceShape,
} from "@/styles/radix-fabricator/ui/bot-face"
import { Button } from "@/styles/radix-fabricator/ui/button"

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

export function BotFaceDemo() {
  const [shape, setShape] = React.useState<BotFaceShape>("squircle")
  const [color, setColor] = React.useState<BotFaceColor>("violet")
  const [eyes, setEyes] = React.useState<BotFaceEyes>("slant")
  const [animated, setAnimated] = React.useState(true)
  const isThemeColor = themeColors.some((value) => value === color)
  const colors = isThemeColor ? themeColors : paletteColors
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 p-4">
      <BotFace
        shape={shape}
        color={color}
        eyes={eyes}
        size="lg"
        animated={animated}
        aria-label="Assistant preview"
      />
      <div
        role="group"
        aria-label="Face shape"
        className="grid w-full grid-cols-5 justify-items-center gap-2"
      >
        {shapes.map((value) => (
          <Button
            key={value}
            variant={shape === value ? "secondary" : "ghost"}
            className="size-14 p-1"
            aria-label={`Use ${value} shape`}
            aria-pressed={shape === value}
            onClick={() => setShape(value)}
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
      </div>
      <div className="flex w-full flex-col items-center gap-3">
        <div role="group" aria-label="Color source" className="flex gap-2">
          <Button
            variant={isThemeColor ? "ghost" : "secondary"}
            aria-label="Use palette colors"
            aria-pressed={!isThemeColor}
            onClick={() => setColor("violet")}
          >
            Palette
          </Button>
          <Button
            variant={isThemeColor ? "secondary" : "ghost"}
            aria-label="Use theme colors"
            aria-pressed={isThemeColor}
            onClick={() => setColor("primary")}
          >
            Theme
          </Button>
        </div>
        <div
          role="group"
          aria-label="Face color"
          className="flex flex-wrap justify-center gap-2"
        >
          {colors.map((value) => (
            <Button
              key={value}
              variant={color === value ? "secondary" : "ghost"}
              className={isThemeColor ? "gap-2" : "size-10 p-2"}
              aria-label={`Use ${value} color`}
              aria-pressed={color === value}
              onClick={() => setColor(value)}
            >
              <BotFace
                shape="circle"
                color={value}
                eyes="dots"
                size="sm"
                className="size-6"
                style={{ width: 24, height: 24 }}
                animated={false}
              />
              {isThemeColor
                ? value.charAt(0).toUpperCase() + value.slice(1)
                : null}
            </Button>
          ))}
        </div>
      </div>
      <div
        role="group"
        aria-label="Eye style"
        className="flex flex-wrap justify-center gap-2"
      >
        {(["slant", "dots", "square"] as const).map((value) => (
          <Button
            key={value}
            variant={eyes === value ? "secondary" : "outline"}
            aria-pressed={eyes === value}
            onClick={() => setEyes(value)}
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
          onClick={() => setAnimated(!animated)}
        >
          {animated ? "Pause" : "Resume"}
        </Button>
      </div>
    </div>
  )
}
