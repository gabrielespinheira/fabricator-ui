"use client"

// Color Picker: a saturation and brightness area, hue and alpha sliders, a
// format menu (HEX, RGB, HSL, OKLCH) with its channel fields, optional
// swatches and the browser's eyedropper. ColorPickerPopover puts the same
// panel behind a tile and hex trigger. Adapted from Fluid Functionalism's
// Color Picker (MIT, Micka Touillaud), drawn with Fabricator's own Slider,
// Select, Input Group, Popover and Tooltip. The color rules are pure functions
// in lib/color-model.
import * as React from "react"
import { cn } from "cn"

import {
  buildParsedColor,
  COLOR_FORMAT_LABELS,
  COLOR_FORMATS,
  formatColor,
  formatHex,
  getAreaValueFromPoint,
  getChannelFields,
  getHexText,
  getInitialColorState,
  getOpaqueColor,
  getScrubbedValue,
  getSwatchKey,
  isColorFormat,
  nudgeArea,
  parseChannelText,
  parseColor,
  setColorChannel,
  setColorFromRgba,
  setColorHsva,
  stepChannelValue,
  type ChannelField,
  type ColorFormat,
  type ColorState,
  type Hsva,
  type ParsedColor,
  type Rgba,
} from "@/registry/base-fabricator/lib/color-model"
import {
  FluidHoverHighlight,
  useFluidHover,
} from "@/registry/base-fabricator/lib/fluid-hover"
import { Button } from "@/registry/base-fabricator/ui/button"
import { ButtonGroup } from "@/registry/base-fabricator/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/base-fabricator/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/base-fabricator/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/base-fabricator/ui/select"
import { Slider } from "@/registry/base-fabricator/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/base-fabricator/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const DEFAULT_COLOR = "#6b97ff"

const FORMAT_ITEMS = COLOR_FORMATS.map((format) => ({
  value: format,
  label: COLOR_FORMAT_LABELS[format],
}))

/** A swatch: a CSS color, or one with a name for its tooltip. */
type ColorSwatchItem = string | { color: string; label?: string }

type CssVariables = React.CSSProperties & Record<`--${string}`, string>

type ColorPickerProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> & {
  /** Hex, rgb(), hsl() or oklch(). A value that doesn't parse is ignored. */
  value?: string
  defaultValue?: string
  /** Fires with the color in the current format and in every format. */
  onValueChange?: (value: string, color: ParsedColor) => void
  format?: ColorFormat
  defaultFormat?: ColorFormat
  onFormatChange?: (format: ColorFormat) => void
  /** Preset colors below the fields. Any CSS color, named ones included. */
  swatches?: ColorSwatchItem[]
  /** The eyedropper already hides where `window.EyeDropper` is missing. */
  hideEyedropper?: boolean
  size?: "sm" | "default" | "lg"
}

type ColorPickerPopoverProps = ColorPickerProps & {
  /** A label beside the tile in the trigger. */
  triggerLabel?: string
  triggerLabelPosition?: "left" | "right"
  /** Shows the color as six hex digits next to the tile. */
  triggerShowValue?: boolean
  /** Adds a remove button beside the trigger. */
  triggerShowRemove?: boolean
  onTriggerRemove?: () => void
  triggerClassName?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

// The browser normalises any CSS color (named ones too) through a canvas's
// fillStyle. Event handlers and client-only effects only: never on the server.
let colorCanvas: CanvasRenderingContext2D | null = null

function resolveCssColor(text: string): Rgba | null {
  const parsed = parseColor(text)
  if (parsed) return parsed
  if (typeof document === "undefined" || !text.trim()) return null
  colorCanvas ??= document.createElement("canvas").getContext("2d")
  if (!colorCanvas) return null
  // An invalid color leaves fillStyle as it was, so try two starting values.
  colorCanvas.fillStyle = "#000000"
  colorCanvas.fillStyle = text
  const first = String(colorCanvas.fillStyle)
  colorCanvas.fillStyle = "#ffffff"
  colorCanvas.fillStyle = text
  return first === String(colorCanvas.fillStyle) ? parseColor(first) : null
}

const subscribeNever = () => () => {}

function useIsClient() {
  return React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )
}

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>
}

// TypeScript's DOM library doesn't ship EyeDropper (Chromium only).
function isEyeDropper(value: unknown): value is EyeDropperConstructor {
  return typeof value === "function"
}

function getEyeDropper() {
  const constructor: unknown = Reflect.get(window, "EyeDropper")
  return isEyeDropper(constructor) ? constructor : null
}

function getSwatchItems(swatches: ColorSwatchItem[]) {
  return swatches.map((swatch) =>
    typeof swatch === "string" ? { color: swatch, label: undefined } : swatch
  )
}

function ColorTile({
  color,
  className,
  style,
  ...props
}: React.ComponentProps<"span"> & { color: string }) {
  const tileStyle: CssVariables = { "--color-tile": color, ...style }
  return (
    <span
      data-slot="color-tile"
      className={cn(
        "relative inline-block size-(--density-icon-16) shrink-0 rounded-[calc(var(--radius-sm)+1px)] bg-[linear-gradient(var(--color-tile),var(--color-tile)),conic-gradient(var(--color-picker-checker)_0_25%,transparent_0_50%,var(--color-picker-checker)_0_75%,transparent_0)] bg-size-[100%_100%,8px_8px] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_15%,transparent)] [--color-picker-checker:color-mix(in_oklab,var(--foreground)_14%,transparent)]",
        className
      )}
      style={tileStyle}
      {...props}
    />
  )
}

function ColorSwatch({
  color,
  selected = false,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"button">, "color"> & {
  color: string
  selected?: boolean
}) {
  const swatchStyle: CssVariables = { "--color-tile": color, ...style }
  return (
    <button
      type="button"
      data-slot="color-picker-swatch"
      aria-label={`Select color ${color}`}
      aria-pressed={selected}
      className={cn(
        "relative size-(--density-32) shrink-0 cursor-pointer rounded-lg p-(--density-4) outline-none [--color-picker-checker:color-mix(in_oklab,var(--foreground)_14%,transparent)] before:absolute before:inset-0.5 before:rounded-[calc(var(--radius-lg)-2px)] before:bg-foreground before:opacity-0 before:transition-opacity before:duration-feedback before:ease-feedback focus-visible:ring-1 focus-visible:ring-focus-ring aria-pressed:before:opacity-100",
        className
      )}
      style={swatchStyle}
      {...props}
    >
      <span className="relative block size-full rounded-[calc(var(--radius-lg)-4px)] bg-[linear-gradient(var(--color-tile),var(--color-tile)),conic-gradient(var(--color-picker-checker)_0_25%,transparent_0_50%,var(--color-picker-checker)_0_75%,transparent_0)] bg-size-[100%_100%,8px_8px] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_15%,transparent)]" />
    </button>
  )
}

function ColorPickerArea({
  hsva,
  onChange,
}: {
  hsva: Hsva
  onChange: (next: { s: number; v: number }) => void
}) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [cursor, setCursor] = React.useState<{ x: number; y: number } | null>(
    null
  )
  const saturation = Math.round(hsva.s * 100)
  const brightness = Math.round(hsva.v * 100)
  const areaStyle: CssVariables = {
    "--color-picker-hue": `hsl(${hsva.h} 100% 50%)`,
    "--color-picker-color": getOpaqueColor(hsva),
  }

  const readPoint = (event: React.PointerEvent<HTMLDivElement>) =>
    getAreaValueFromPoint(event.currentTarget.getBoundingClientRect(), {
      x: event.clientX,
      y: event.clientY,
    })

  return (
    <div
      data-slot="color-picker-area"
      role="slider"
      tabIndex={0}
      aria-label="Color"
      aria-roledescription="2D slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={saturation}
      aria-valuetext={`Saturation ${saturation}%, brightness ${brightness}%`}
      data-dragging={isDragging ? "" : undefined}
      className="relative aspect-[8/5] w-full cursor-none touch-none rounded-[max(0px,calc(var(--radius-xl)-var(--density-12)))] bg-[linear-gradient(to_top,#000,transparent),linear-gradient(to_right,#fff,var(--color-picker-hue))] outline-none select-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      style={areaStyle}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus({ preventScroll: true })
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsDragging(true)
        onChange(readPoint(event))
      }}
      onPointerMove={(event) => {
        const { s, v } = readPoint(event)
        setCursor({ x: s * 100, y: (1 - v) * 100 })
        if (isDragging) onChange({ s, v })
      }}
      onPointerUp={() => setIsDragging(false)}
      onPointerCancel={() => setIsDragging(false)}
      onPointerLeave={() => setCursor(null)}
      onKeyDown={(event) => {
        const next = nudgeArea(
          { s: hsva.s, v: hsva.v },
          event.key,
          event.shiftKey
        )
        if (!next) return
        event.preventDefault()
        onChange(next)
      }}
    >
      <span
        data-slot="color-picker-area-thumb"
        className="pointer-events-none absolute size-[calc(var(--density-icon-16)+2px)] -translate-1/2 rounded-full border-2 border-white bg-(--color-picker-color) shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_1px_3px_rgb(0_0_0/0.3)]"
        style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%` }}
      />
      {cursor && !isDragging && (
        <span
          aria-hidden
          data-slot="color-picker-area-cursor"
          className="pointer-events-none absolute size-[calc(var(--density-icon-16)+2px)] -translate-1/2 rounded-full border-2 border-white/60 shadow-[0_0_0_1px_rgb(0_0_0/0.2)]"
          style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
        />
      )}
    </div>
  )
}

function readSliderValue(value: number | readonly number[]) {
  return typeof value === "number" ? value : (value[0] ?? 0)
}

function ColorPickerSliders({
  hsva,
  onChange,
}: {
  hsva: Hsva
  onChange: (next: Partial<Hsva>) => void
}) {
  const hueLabelId = React.useId()
  const alphaLabelId = React.useId()
  const opaque = getOpaqueColor(hsva)
  const hueStyle: CssVariables = {
    "--color-picker-thumb": `hsl(${hsva.h} 100% 50%)`,
  }
  const alphaStyle: CssVariables = {
    "--color-picker-thumb": opaque,
    "--color-picker-opaque": opaque,
  }
  return (
    <div
      data-slot="color-picker-sliders"
      className="flex flex-col gap-(--density-6)"
    >
      <span id={hueLabelId} className="sr-only">
        Hue
      </span>
      <Slider
        data-slot="color-picker-hue"
        aria-labelledby={hueLabelId}
        className="[&_[data-slot=slider-range]]:hidden [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-(--color-picker-thumb) [&_[data-slot=slider-thumb]]:shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_1px_2px_rgb(0_0_0/0.2)] [&_[data-slot=slider-track]]:border-0 [&_[data-slot=slider-track]]:bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]"
        style={hueStyle}
        value={[hsva.h]}
        min={0}
        max={360}
        step={1}
        onValueChange={(value) => onChange({ h: readSliderValue(value) })}
      />
      <span id={alphaLabelId} className="sr-only">
        Alpha
      </span>
      <Slider
        data-slot="color-picker-alpha"
        aria-labelledby={alphaLabelId}
        className="[&_[data-slot=slider-range]]:hidden [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-(--color-picker-thumb) [&_[data-slot=slider-thumb]]:shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_1px_2px_rgb(0_0_0/0.2)] [&_[data-slot=slider-track]]:border-0 [&_[data-slot=slider-track]]:bg-[linear-gradient(to_right,transparent,var(--color-picker-opaque)),conic-gradient(var(--color-picker-checker)_0_25%,transparent_0_50%,var(--color-picker-checker)_0_75%,transparent_0)] [&_[data-slot=slider-track]]:bg-size-[100%_100%,8px_8px]"
        style={alphaStyle}
        value={[Math.round(hsva.a * 100)]}
        min={0}
        max={100}
        step={1}
        onValueChange={(value) => onChange({ a: readSliderValue(value) / 100 })}
      />
    </div>
  )
}

function ColorPickerFormatSelect({
  format,
  onFormatChange,
}: {
  format: ColorFormat
  onFormatChange: (format: ColorFormat) => void
}) {
  return (
    <Select
      items={FORMAT_ITEMS}
      value={format}
      onValueChange={(value) => {
        if (isColorFormat(value)) onFormatChange(value)
      }}
    >
      <SelectTrigger
        data-slot="color-picker-format"
        aria-label="Color format"
        className="flex-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {FORMAT_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function ColorPickerEyedropper({ onPick }: { onPick: (rgba: Rgba) => void }) {
  const isClient = useIsClient()
  const EyeDropper = isClient ? getEyeDropper() : null
  if (!EyeDropper) return null
  return (
    <Button
      data-slot="color-picker-eyedropper"
      type="button"
      variant="outline"
      size="icon"
      aria-label="Pick a color from the screen"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => {
        new EyeDropper()
          .open()
          .then((result) => {
            const rgba = parseColor(result.sRGBHex)
            if (rgba) onPick(rgba)
          })
          .catch((error: unknown) => {
            // Escape cancels the pick; the color stays as it was.
            if (error instanceof DOMException && error.name === "AbortError") {
              return
            }
            throw error
          })
      }}
    >
      <IconPlaceholder
        lucide="PipetteIcon"
        tabler="IconColorPicker"
        hugeicons="ColorPickerIcon"
        phosphor="EyedropperIcon"
        remixicon="RiSipLine"
      />
    </Button>
  )
}

type ColorPickerFieldProps = {
  label: string
  shortLabel: string
  text: string
  onCommitText: (text: string) => void
  /** Arrow keys step the value; Shift steps ten times further. */
  onStep?: (direction: 1 | -1, isShift: boolean) => void
  /** Dragging the letter sideways scrubs the value. */
  scrub?: { field: ChannelField; onScrub: (value: number) => void }
  inputMode?: "numeric" | "decimal" | "text"
  className?: string
}

// A channel field: the letter names it and scrubs it, the input takes typed
// text and commits on Enter or blur. Escape puts the last value back.
function ColorPickerField({
  label,
  shortLabel,
  text,
  onCommitText,
  onStep,
  scrub,
  inputMode = "numeric",
  className,
}: ColorPickerFieldProps) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const [isScrubbing, setIsScrubbing] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrubStart = React.useRef<{ x: number; value: number } | null>(null)
  const hasScrubbed = React.useRef(false)

  const commitDraft = () => {
    if (draft !== null && draft !== text) onCommitText(draft)
    setDraft(null)
  }

  return (
    <InputGroup
      data-slot="color-picker-field"
      data-scrubbing={isScrubbing ? "" : undefined}
      className={cn("min-w-0 data-scrubbing:bg-muted/50", className)}
    >
      <InputGroupAddon
        aria-hidden
        data-slot="color-picker-field-label"
        data-scrubbable={scrub ? "" : undefined}
        className="font-medium data-scrubbable:cursor-ew-resize"
        onPointerDown={(event) => {
          if (!scrub || event.pointerType === "touch" || event.button !== 0) {
            return
          }
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          scrubStart.current = { x: event.clientX, value: scrub.field.value }
          hasScrubbed.current = false
        }}
        onPointerMove={(event) => {
          const start = scrubStart.current
          if (!scrub || !start) return
          const delta = event.clientX - start.x
          if (!hasScrubbed.current && Math.abs(delta) < 3) return
          hasScrubbed.current = true
          setIsScrubbing(true)
          scrub.onScrub(
            getScrubbedValue(scrub.field, start.value, delta, event.shiftKey)
          )
        }}
        onPointerUp={() => {
          scrubStart.current = null
          setIsScrubbing(false)
        }}
        onPointerCancel={() => {
          scrubStart.current = null
          setIsScrubbing(false)
        }}
        onClick={() => {
          // A press without a drag goes to the input, as on any addon.
          if (hasScrubbed.current) {
            hasScrubbed.current = false
            return
          }
          inputRef.current?.focus()
        }}
      >
        {shortLabel}
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        data-slot="color-picker-field-input"
        aria-label={label}
        className="min-w-0 pr-(--density-6) tabular-nums"
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        value={draft ?? text}
        onFocus={(event) => {
          setDraft(text)
          event.currentTarget.select()
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commitDraft()
          } else if (
            event.key === "Escape" &&
            draft !== null &&
            draft !== text
          ) {
            // The first Escape reverts; the next closes a popover.
            event.preventDefault()
            event.stopPropagation()
            setDraft(text)
          } else if (
            onStep &&
            (event.key === "ArrowUp" || event.key === "ArrowDown")
          ) {
            event.preventDefault()
            onStep(event.key === "ArrowUp" ? 1 : -1, event.shiftKey)
            setDraft(null)
          }
        }}
      />
    </InputGroup>
  )
}

function ColorPickerFields({
  state,
  format,
  onStateChange,
  onColorText,
}: {
  state: ColorState
  format: ColorFormat
  onStateChange: (state: ColorState) => void
  onColorText: (text: string) => void
}) {
  const fields = getChannelFields(state, format)
  const parsed = buildParsedColor(state.hsva)
  const setChannel = (field: ChannelField, value: number) =>
    onStateChange(setColorChannel(state, field.channel, value))

  return (
    <div
      data-slot="color-picker-fields"
      data-format={format}
      className="grid grid-cols-4 gap-(--density-4)"
    >
      {format === "hex" && (
        <ColorPickerField
          label="Hex"
          shortLabel="#"
          text={getHexText(parsed)}
          inputMode="text"
          className="col-span-3"
          onCommitText={(text) => {
            const trimmed = text.trim()
            onColorText(/^[0-9a-f]+$/i.test(trimmed) ? `#${trimmed}` : trimmed)
          }}
        />
      )}
      {fields.map((field) => (
        <ColorPickerField
          key={field.channel}
          label={field.label}
          shortLabel={field.shortLabel}
          text={`${field.value}${field.suffix ?? ""}`}
          inputMode={field.decimals > 0 ? "decimal" : "numeric"}
          onCommitText={(text) => {
            const value = parseChannelText(field, text)
            if (value !== null) setChannel(field, value)
          }}
          onStep={(direction, isShift) =>
            setChannel(
              field,
              stepChannelValue(
                field,
                field.value,
                direction * (isShift ? field.shiftStep : field.step)
              )
            )
          }
          scrub={{ field, onScrub: (value) => setChannel(field, value) }}
        />
      ))}
    </div>
  )
}

function ColorPickerSwatches({
  swatches,
  current,
  onPick,
}: {
  swatches: ColorSwatchItem[]
  current: string
  onPick: (color: string) => void
}) {
  const items = React.useMemo(() => getSwatchItems(swatches), [swatches])
  const isClient = useIsClient()
  const fluid = useFluidHover<HTMLDivElement>({
    items: "[data-slot=color-picker-swatch]",
    axis: "xy",
    gapClick: false,
  })
  // Named colors ("tomato") need the browser to match the current color, so
  // they resolve on the client only.
  const keys = React.useMemo(
    () =>
      items.map(({ color }) => {
        const key = getSwatchKey(color)
        if (key || !isClient) return key
        const resolved = resolveCssColor(color)
        return resolved ? formatHex(resolved) : null
      }),
    [items, isClient]
  )
  const selectedIndex = keys.indexOf(getSwatchKey(current))

  return (
    <div
      ref={fluid.attach}
      data-slot="color-picker-swatches"
      className="relative -m-(--density-4) flex flex-wrap"
      {...fluid.props}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {items.map(({ color, label }, index) => {
        const swatch = (
          <ColorSwatch
            color={color}
            selected={index === selectedIndex}
            aria-label={label ?? `Select color ${color}`}
            onClick={() => onPick(color)}
          />
        )
        return label ? (
          <Tooltip key={`${color}-${index}`}>
            <TooltipTrigger render={swatch} />
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ) : (
          <React.Fragment key={`${color}-${index}`}>{swatch}</React.Fragment>
        )
      })}
    </div>
  )
}

function ColorPicker({
  value,
  defaultValue = DEFAULT_COLOR,
  onValueChange,
  format: formatProp,
  defaultFormat = "hex",
  onFormatChange,
  swatches,
  hideEyedropper = false,
  size = "default",
  className,
  ...props
}: ColorPickerProps) {
  const [state, setState] = React.useState(() =>
    getInitialColorState(value ?? defaultValue)
  )
  const [internalFormat, setInternalFormat] = React.useState(defaultFormat)
  const format = formatProp ?? internalFormat

  // A controlled value from outside resets the color during the render that
  // brings it. The string this panel emitted last coming back is skipped, so
  // re-reading a rounded string never moves the area or drops a held hue.
  const [syncedValue, setSyncedValue] = React.useState(value)
  const [lastEmitted, setLastEmitted] = React.useState<string | null>(null)
  if (value !== undefined && value !== syncedValue) {
    setSyncedValue(value)
    const rgba = value === lastEmitted ? null : parseColor(value)
    if (rgba) setState((current) => setColorFromRgba(current, rgba))
  }

  const parsed = React.useMemo(() => buildParsedColor(state.hsva), [state.hsva])

  const commit = (next: ColorState, nextFormat: ColorFormat = format) => {
    setState(next)
    const color = buildParsedColor(next.hsva)
    const formatted = formatColor(color, nextFormat)
    setLastEmitted(formatted)
    onValueChange?.(formatted, color)
  }

  const commitText = (text: string) => {
    const rgba = resolveCssColor(text)
    if (rgba) commit(setColorFromRgba(state, rgba))
  }

  return (
    <div
      data-slot="color-picker"
      data-size={size}
      className={cn(
        "flex w-70 flex-col gap-(--density-8) rounded-xl bg-card p-(--density-12) text-(length:--density-text-13) text-card-foreground shadow-surface-2 [--color-picker-checker:color-mix(in_oklab,var(--foreground)_14%,transparent)] in-data-[slot=popover-content]:bg-transparent in-data-[slot=popover-content]:p-0 in-data-[slot=popover-content]:shadow-none data-[size=lg]:density-spacious data-[size=sm]:density-compact",
        className
      )}
      {...props}
    >
      <ColorPickerArea
        hsva={state.hsva}
        onChange={(next) => commit(setColorHsva(state, next))}
      />
      <ColorPickerSliders
        hsva={state.hsva}
        onChange={(next) => commit(setColorHsva(state, next))}
      />
      <div data-slot="color-picker-controls" className="flex gap-(--density-8)">
        <ColorPickerFormatSelect
          format={format}
          onFormatChange={(next) => {
            setInternalFormat(next)
            onFormatChange?.(next)
            // The same color again, written in the new format.
            commit(state, next)
          }}
        />
        {!hideEyedropper && (
          <ColorPickerEyedropper
            onPick={(rgba) => commit(setColorFromRgba(state, rgba))}
          />
        )}
      </div>
      <ColorPickerFields
        state={state}
        format={format}
        onStateChange={commit}
        onColorText={commitText}
      />
      {swatches && swatches.length > 0 && (
        <ColorPickerSwatches
          swatches={swatches}
          current={parsed.hex}
          onPick={commitText}
        />
      )}
    </div>
  )
}

function ColorPickerPopover({
  triggerLabel,
  triggerLabelPosition = "left",
  triggerShowValue = true,
  triggerShowRemove = false,
  onTriggerRemove,
  triggerClassName,
  open,
  defaultOpen,
  onOpenChange,
  value,
  defaultValue = DEFAULT_COLOR,
  onValueChange,
  format,
  defaultFormat = "hex",
  onFormatChange,
  size = "default",
  className,
  ...props
}: ColorPickerPopoverProps) {
  // The popover holds the value and format too (unless they're controlled):
  // the trigger shows the value, and both outlive the panel, which unmounts
  // on close.
  const [internalValue, setInternalValue] = React.useState(
    value ?? defaultValue
  )
  const currentValue = value ?? internalValue
  const [internalFormat, setInternalFormat] = React.useState(defaultFormat)
  const groupRef = React.useRef<HTMLDivElement>(null)
  const rgba = parseColor(currentValue)
  const tileColor = rgba ? formatHex(rgba) : currentValue
  const hexText = rgba
    ? formatHex({ ...rgba, a: 1 })
        .slice(1)
        .toUpperCase()
    : currentValue
  const label = triggerLabel && (
    <span
      data-slot="color-picker-trigger-label"
      className="text-muted-foreground"
    >
      {triggerLabel}
    </span>
  )

  const trigger = (
    <PopoverTrigger
      render={
        <Button
          variant="outline"
          size={size}
          data-slot="color-picker-trigger"
          className={cn("font-normal", triggerClassName)}
        />
      }
    >
      {triggerLabelPosition === "left" && label}
      <ColorTile color={tileColor} />
      {triggerShowValue && (
        <span data-slot="color-picker-trigger-value" className="tabular-nums">
          {hexText}
        </span>
      )}
      {triggerLabelPosition === "right" && label}
    </PopoverTrigger>
  )

  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {triggerShowRemove ? (
        <ButtonGroup ref={groupRef}>
          {trigger}
          <Button
            type="button"
            variant="outline"
            size={size === "default" ? "icon" : `icon-${size}`}
            aria-label="Remove color"
            data-slot="color-picker-remove"
            className="text-muted-foreground hover:text-foreground"
            onClick={onTriggerRemove}
          >
            <IconPlaceholder
              lucide="XIcon"
              tabler="IconX"
              hugeicons="Cancel01Icon"
              phosphor="XIcon"
              remixicon="RiCloseLine"
            />
          </Button>
        </ButtonGroup>
      ) : (
        trigger
      )}
      <PopoverContent
        align="start"
        anchor={triggerShowRemove ? groupRef : undefined}
        aria-label="Color picker"
        className="w-auto gap-0"
      >
        <ColorPicker
          value={currentValue}
          onValueChange={(next, color) => {
            setInternalValue(next)
            onValueChange?.(next, color)
          }}
          format={format ?? internalFormat}
          onFormatChange={(next) => {
            setInternalFormat(next)
            onFormatChange?.(next)
          }}
          size={size}
          className={className}
          {...props}
        />
      </PopoverContent>
    </Popover>
  )
}

export {
  ColorPicker,
  ColorPickerPopover,
  ColorSwatch,
  ColorTile,
  type ColorPickerPopoverProps,
  type ColorPickerProps,
  type ColorSwatchItem,
}
