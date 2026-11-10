import * as React from "react"
import { XIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { LinearGradient } from "expo-linear-gradient"
import { Pressable, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"

import {
  buildParsedColor,
  COLOR_FORMAT_LABELS,
  COLOR_FORMATS,
  formatColor,
  getAreaValueFromPoint,
  getChannelFields,
  getInitialColorState,
  nudgeArea,
  parseChannelText,
  parseColor,
  setColorChannel,
  setColorFromRgba,
  setColorHsva,
  type ChannelField,
  type ColorFormat,
  type ColorState,
  type ParsedColor,
} from "@/registry/fabricator/shared/lib/color-model"
import { Button } from "@/registry/native/ui/button"
import { DensityScope, useControlSize } from "@/registry/native/ui/density"
import { Input } from "@/registry/native/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/native/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/native/ui/select"
import { Slider } from "@/registry/native/ui/slider"
import { Text } from "@/registry/native/ui/text"

type ColorSwatchItem = string | { color: string; label?: string }
type ColorPickerProps = React.ComponentProps<typeof View> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, color: ParsedColor) => void
  format?: ColorFormat
  defaultFormat?: ColorFormat
  onFormatChange?: (format: ColorFormat) => void
  swatches?: ColorSwatchItem[]
  hideEyedropper?: boolean
  size?: "sm" | "default" | "lg"
}
type ColorPickerPopoverProps = ColorPickerProps & {
  triggerLabel?: string
  triggerLabelPosition?: "left" | "right"
  triggerShowValue?: boolean
  triggerShowRemove?: boolean
  onTriggerRemove?: () => void
  triggerClassName?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}
function ColorTile({
  color,
  className,
  style,
  ...props
}: React.ComponentProps<typeof View> & { color: string }) {
  return (
    <View
      data-slot="color-tile"
      className={cn("cn-color-tile size-6 rounded-md", className)}
      style={[
        {
          backgroundColor: buildParsedColor(getInitialColorState(color).hsva)
            .hex,
        },
        style,
      ]}
      {...props}
    />
  )
}
function ColorSwatch({
  color,
  selected = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  color: string
  selected?: boolean
  children?: React.ReactNode
}) {
  return (
    <Pressable
      data-slot="color-picker-swatch"
      accessibilityRole="button"
      accessibilityLabel={`Select color ${color}`}
      accessibilityState={{ selected }}
      className={cn(
        "cn-color-picker-swatch min-h-11 min-w-11 items-center justify-center rounded-lg",
        selected && "bg-active",
        className
      )}
      {...props}
    >
      <ColorTile color={color} className="cn-color-picker-swatch-color" />
      {children}
    </Pressable>
  )
}
function ColorArea({
  state,
  onChange,
}: {
  state: ColorState
  onChange: (state: ColorState) => void
}) {
  const [area, setArea] = React.useState({ width: 1, height: 1 })
  const parsed = buildParsedColor(state.hsva)
  const hue = buildParsedColor({ h: state.hsva.h, s: 1, v: 1, a: 1 }).hex
  const change = (x: number, y: number) =>
    onChange(
      setColorHsva(
        state,
        getAreaValueFromPoint({ left: 0, top: 0, ...area }, { x, y })
      )
    )
  const gesture = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((event) => change(event.x, event.y))
    .onUpdate((event) => change(event.x, event.y))
  return (
    <GestureDetector gesture={gesture}>
      <View
        data-slot="color-picker-area"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Saturation and brightness"
        accessibilityValue={{
          text: `Saturation ${Math.round(state.hsva.s * 100)}%, brightness ${Math.round(state.hsva.v * 100)}%`,
        }}
        accessibilityActions={[
          { name: "increment", label: "Increase saturation" },
          { name: "decrement", label: "Decrease saturation" },
          { name: "increase-brightness", label: "Increase brightness" },
          { name: "decrease-brightness", label: "Decrease brightness" },
        ]}
        onAccessibilityAction={(event) => {
          const keys: Record<string, string> = {
            increment: "ArrowRight",
            decrement: "ArrowLeft",
            "increase-brightness": "ArrowUp",
            "decrease-brightness": "ArrowDown",
          }
          const key = keys[event.nativeEvent.actionName]
          if (key) {
            const next = nudgeArea(state.hsva, key, false)
            if (next) onChange(setColorHsva(state, next))
          }
        }}
        className="cn-color-picker-area h-40 w-full overflow-hidden rounded-lg"
        onLayout={(event) => setArea(event.nativeEvent.layout)}
        style={{ backgroundColor: hue }}
      >
        <LinearGradient
          colors={["#ffffff", "#ffffff00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", inset: 0 }}
        />
        <LinearGradient
          colors={["#00000000", "#000000"]}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          pointerEvents="none"
          data-slot="color-picker-area-thumb"
          className="cn-color-picker-area-thumb absolute size-4 rounded-full border-2 border-white"
          style={{
            left: area.width * state.hsva.s - 8,
            top: area.height * (1 - state.hsva.v) - 8,
            backgroundColor: parsed.hex,
          }}
        />
      </View>
    </GestureDetector>
  )
}
function ColorChannelField({
  state,
  field,
  onChange,
}: {
  state: ColorState
  field: ChannelField
  onChange: (state: ColorState) => void
}) {
  const [draft, setDraft] = React.useState<string | null>(null)
  function commit() {
    if (draft === null) return
    const value = parseChannelText(field, draft)
    if (value !== null) onChange(setColorChannel(state, field.channel, value))
    setDraft(null)
  }
  return (
    <View
      data-slot="color-picker-field"
      className="cn-color-picker-field flex-1 gap-1"
    >
      <Text
        data-slot="color-picker-field-label"
        className="cn-color-picker-field-label text-xs text-muted-foreground"
      >
        {field.shortLabel}
      </Text>
      <Input
        data-slot="color-picker-field-input"
        accessibilityLabel={field.label}
        keyboardType="decimal-pad"
        value={draft ?? String(field.value)}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        className="cn-color-picker-field-input"
      />
    </View>
  )
}
function ColorPicker({
  value,
  defaultValue = "#6b97ff",
  onValueChange,
  format: formatProp,
  defaultFormat = "hex",
  onFormatChange,
  swatches = [],
  hideEyedropper: _hideEyedropper,
  size = "default",
  className,
  ...props
}: ColorPickerProps) {
  const { density } = useControlSize(size)
  const [state, setState] = React.useState(() =>
    getInitialColorState(value ?? defaultValue)
  )
  const [previous, setPrevious] = React.useState(value)
  if (value !== previous) {
    setPrevious(value)
    if (value && parseColor(value)) setState(getInitialColorState(value))
  }
  const [formatValue, setFormat] = useControllableState<ColorFormat>({
    prop: formatProp,
    defaultProp: defaultFormat,
    onChange: onFormatChange,
  })
  const format = formatValue ?? defaultFormat
  const parsed = buildParsedColor(state.hsva)
  const [draft, setDraft] = React.useState<string | null>(null)
  function change(next: ColorState) {
    setState(next)
    const color = buildParsedColor(next.hsva)
    onValueChange?.(formatColor(color, format), color)
  }
  function commit() {
    if (draft === null) return
    const rgba = parseColor(draft)
    if (rgba) {
      change(setColorFromRgba(state, rgba))
      setDraft(null)
    }
  }
  const fields = getChannelFields(state, format)
  return (
    <DensityScope density={density}>
      <View
        data-slot="color-picker"
        data-size={size}
        className={cn("cn-color-picker w-full gap-3", className)}
        {...props}
      >
        <ColorArea state={state} onChange={change} />
        <View
          data-slot="color-picker-sliders"
          className="cn-color-picker-sliders gap-3"
        >
          <View
            data-slot="color-picker-hue"
            className="cn-color-picker-slider-row gap-1"
          >
            <Text className="text-xs text-muted-foreground">Hue</Text>
            <Slider
              accessibilityLabel="Hue"
              className="cn-color-picker-hue"
              min={0}
              max={360}
              step={1}
              value={[state.hsva.h]}
              onValueChange={(values) => {
                const next = typeof values === "number" ? values : values[0]
                if (next !== undefined) change(setColorHsva(state, { h: next }))
              }}
            />
            <Text
              data-slot="color-picker-hue-value"
              className="cn-color-picker-slider-value"
            >
              {Math.round(state.hsva.h)}°
            </Text>
          </View>
          <View
            data-slot="color-picker-alpha"
            className="cn-color-picker-slider-row gap-1"
          >
            <Text className="text-xs text-muted-foreground">Opacity</Text>
            <Slider
              accessibilityLabel="Opacity"
              className="cn-color-picker-alpha"
              min={0}
              max={1}
              step={0.01}
              value={[state.hsva.a]}
              onValueChange={(values) => {
                const next = typeof values === "number" ? values : values[0]
                if (next !== undefined) change(setColorHsva(state, { a: next }))
              }}
            />
            <Text
              data-slot="color-picker-alpha-value"
              className="cn-color-picker-slider-value"
            >
              {Math.round(state.hsva.a * 100)}%
            </Text>
          </View>
        </View>
        <View
          data-slot="color-picker-controls"
          className="cn-color-picker-controls gap-2"
        >
          <Select
            items={COLOR_FORMATS.map((value) => ({
              value,
              label: COLOR_FORMAT_LABELS[value],
            }))}
            value={format}
            onValueChange={(value) => {
              const next = COLOR_FORMATS.find((format) => format === value)
              if (next) {
                setFormat(next)
                setDraft(null)
              }
            }}
          >
            <SelectTrigger
              data-slot="color-picker-format"
              accessibilityLabel="Color format"
              className="cn-color-picker-format"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {COLOR_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {COLOR_FORMAT_LABELS[format]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            accessibilityLabel="Color value"
            value={draft ?? formatColor(parsed, format)}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {fields.length > 0 && (
          <View
            data-slot="color-picker-fields"
            className="cn-color-picker-fields flex-row gap-2"
          >
            {fields.map((field) => (
              <ColorChannelField
                key={field.channel}
                state={state}
                field={field}
                onChange={change}
              />
            ))}
          </View>
        )}
        {swatches.length > 0 && (
          <View
            data-slot="color-picker-swatches"
            className="cn-color-picker-swatches flex-row flex-wrap"
          >
            {swatches.map((item) => {
              const swatch = typeof item === "string" ? { color: item } : item
              return (
                <ColorSwatch
                  key={swatch.color}
                  color={swatch.color}
                  accessibilityLabel={
                    swatch.label ?? `Select color ${swatch.color}`
                  }
                  selected={
                    buildParsedColor(getInitialColorState(swatch.color).hsva)
                      .hex === parsed.hex
                  }
                  onPress={() => {
                    const rgba = parseColor(swatch.color)
                    if (rgba) change(setColorFromRgba(state, rgba))
                  }}
                />
              )
            })}
          </View>
        )}
      </View>
    </DensityScope>
  )
}
function ColorPickerPopover({
  triggerLabel,
  triggerLabelPosition = "right",
  triggerShowValue = false,
  triggerShowRemove = false,
  onTriggerRemove,
  triggerClassName,
  open: prop,
  defaultOpen = false,
  onOpenChange,
  value,
  defaultValue = "#6b97ff",
  onValueChange,
  ...props
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useControllableState({
    prop,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const [colorValue, setColor] = useControllableState<string>({
    prop: value,
    defaultProp: defaultValue,
  })
  const color = colorValue ?? defaultValue
  const label = triggerLabel && (
    <Text
      data-slot="color-picker-trigger-label"
      className="cn-color-picker-trigger-label"
    >
      {triggerLabel}
    </Text>
  )
  return (
    <View className="flex-row items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              data-slot="color-picker-trigger"
              size={props.size}
              variant="outline"
              accessibilityLabel={triggerLabel ?? "Choose color"}
              className={cn("cn-color-picker-trigger", triggerClassName)}
            />
          }
        >
          {triggerLabelPosition === "left" && label}
          <ColorTile color={color} />
          {triggerLabelPosition === "right" && label}
          {triggerShowValue && (
            <Text
              data-slot="color-picker-trigger-value"
              className="cn-color-picker-trigger-value"
            >
              {color}
            </Text>
          )}
        </PopoverTrigger>
        <PopoverContent className="cn-color-picker-content">
          <ColorPicker
            value={color}
            onValueChange={(next, parsed) => {
              setColor(next)
              onValueChange?.(next, parsed)
            }}
            {...props}
          />
        </PopoverContent>
      </Popover>
      {triggerShowRemove && (
        <Button
          data-slot="color-picker-remove"
          className="cn-color-picker-remove"
          variant="ghost"
          size="icon"
          accessibilityLabel="Remove color"
          onPress={onTriggerRemove}
        >
          <XIcon />
        </Button>
      )}
    </View>
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
