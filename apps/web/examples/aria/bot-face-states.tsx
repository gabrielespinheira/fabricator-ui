"use client"

import * as React from "react"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import {
  BotFace,
  type BotFaceColor,
  type BotFaceEyes,
  type BotFaceShape,
  type BotFaceState,
} from "@/styles/aria-fabricator/ui/bot-face"
import { Button } from "@/styles/aria-fabricator/ui/button"
import { ColorPickerPopover } from "@/styles/aria-fabricator/ui/color-picker"

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

const states: { value: BotFaceState; label: string }[] = [
  { value: "idle", label: "Idle" },
  { value: "listening", label: "Listening" },
  { value: "thinking", label: "Thinking" },
  { value: "working", label: "Working" },
  { value: "speaking", label: "Speaking" },
  { value: "happy", label: "Happy" },
  { value: "sad", label: "Sad" },
  { value: "questioning", label: "Questioning" },
  { value: "awaiting-permission", label: "Permission" },
  { value: "error", label: "Error" },
]
export function BotFaceStates() {
  const [shape, setShape] = React.useState<BotFaceShape>("squircle")
  const [color, setColor] = React.useState<BotFaceColor>("violet")
  const [customColor, setCustomColor] = React.useState<`#${string}`>("#8b5cf6")
  const [state, setState] = React.useState<BotFaceState>("idle")
  const [eyes, setEyes] = React.useState<BotFaceEyes>("slant")
  const label = states.find((item) => item.value === state)?.label
  const configuration = [
    'import { BotFace } from "@/components/ui/bot-face"',
    "",
    "<BotFace",
    `  shape="${shape}"`,
    `  color="${color}"`,
    `  eyes="${eyes}"`,
    `  state="${state}"`,
    '  size="lg"',
    "/>",
  ].join("\n")
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const configurationLabel = React.useId()

  return (
    <div
      data-testid="bot-face-playground"
      className="flex w-full max-w-3xl flex-col items-center gap-8 p-4 sm:p-6"
    >
      <div className="flex flex-col items-center gap-4">
        <BotFace
          data-testid="bot-face-preview"
          state={state}
          eyes={eyes}
          shape={shape}
          size="lg"
          color={color}
        />
        <p role="status" className="text-sm text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="grid w-full gap-8 sm:grid-cols-2">
        <section
          aria-label="Appearance"
          data-testid="bot-face-appearance-controls"
          className="flex min-w-0 flex-col gap-5"
        >
          <p className="text-sm font-medium">Appearance</p>
          <div className="flex w-full flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Shape
            </span>
            <div
              role="group"
              aria-label="Face shape"
              className="grid grid-cols-7 gap-1"
            >
              {shapes.map((value) => (
                <Button
                  key={value}
                  size="icon"
                  className="w-full"
                  variant={shape === value ? "secondary" : "ghost"}
                  aria-label={`Use ${value} shape`}
                  aria-pressed={shape === value}
                  onClick={() => setShape(value)}
                >
                  <BotFace
                    shape={value}
                    color={color}
                    eyes={eyes}
                    state={state}
                    style={{ width: 24, height: 24 }}
                    animated={false}
                  />
                </Button>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Color
            </span>
            <div
              role="group"
              aria-label="Face color"
              className="grid grid-cols-6 gap-1"
            >
              {paletteColors.map((value) => (
                <Button
                  key={value}
                  size="icon"
                  className="w-full"
                  variant={color === value ? "secondary" : "ghost"}
                  aria-label={`Use ${value} color`}
                  aria-pressed={color === value}
                  onClick={() => setColor(value)}
                >
                  <BotFace
                    shape="circle"
                    color={value}
                    eyes="dots"
                    style={{ width: 24, height: 24 }}
                    animated={false}
                  />
                </Button>
              ))}
            </div>
            <ColorPickerPopover
              triggerLabel="Custom"
              triggerClassName="w-full justify-between"
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
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Eyes
            </span>
            <div
              role="group"
              aria-label="Eye style"
              className="grid grid-cols-3 gap-2"
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
            </div>
          </div>
        </section>
        <section
          aria-label="Agent state"
          data-testid="bot-face-state-controls"
          className="flex min-w-0 flex-col gap-5 border-t pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"
        >
          <p className="text-sm font-medium">Agent state</p>
          <div
            role="group"
            aria-label="Assistant state"
            className="grid grid-cols-2 gap-1"
          >
            {states.map((item) => (
              <Button
                key={item.value}
                variant={state === item.value ? "secondary" : "ghost"}
                aria-pressed={state === item.value}
                onClick={() => setState(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </section>
      </div>
      <div className="w-full overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-2">
          <p
            id={configurationLabel}
            className="text-xs font-medium text-muted-foreground"
          >
            Configuration
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(configuration)}
          >
            {isCopied ? "Copied" : "Copy code"}
          </Button>
        </div>
        <pre
          aria-labelledby={configurationLabel}
          tabIndex={0}
          className="overflow-x-auto bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground"
        >
          <code data-testid="bot-face-configuration">{configuration}</code>
        </pre>
        <span role="status" className="sr-only">
          {isCopied ? "Configuration copied" : ""}
        </span>
      </div>
    </div>
  )
}
