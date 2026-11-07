const COLOR_FORMATS = ["hex", "rgb", "hsl", "oklch"] as const

type ColorFormat = (typeof COLOR_FORMATS)[number]

function isColorFormat(value: unknown): value is ColorFormat {
  return COLOR_FORMATS.some((format) => format === value)
}

const COLOR_FORMAT_LABELS: Record<ColorFormat, string> = {
  hex: "HEX",
  rgb: "RGB",
  hsl: "HSL",
  oklch: "OKLCH",
}

/** sRGB channels 0 to 255 (unrounded), alpha 0 to 1. */
type Rgba = { r: number; g: number; b: number; a: number }

/** Hue 0 to 360, saturation, value and alpha 0 to 1. */
type Hsva = { h: number; s: number; v: number; a: number }

/** One color in every format: what the picker hands to `onValueChange`. */
type ParsedColor = Hsva & {
  /** Rounded sRGB channels, 0 to 255. */
  r: number
  g: number
  b: number
  hex: string
  rgb: string
  hsl: string
  oklch: string
}

type ColorState = {
  hsva: Hsva
  /** An OKLCH hue the user typed, held while OKLCH edits go on. */
  oklchHue: number | null
}

type ColorChannel =
  | "red"
  | "green"
  | "blue"
  | "hslHue"
  | "hslSaturation"
  | "hslLightness"
  | "oklchLightness"
  | "oklchChroma"
  | "oklchHue"
  | "alpha"

type ChannelRange = {
  min: number
  max: number
  /** Angles wrap (361 is 1) instead of stopping at the ends. */
  wrap: boolean
  decimals: number
}

type ChannelField = ChannelRange & {
  channel: ColorChannel
  label: string
  /** One letter, shown in the field. */
  shortLabel: string
  value: number
  step: number
  /** The step with Shift held. */
  shiftStep: number
  /** Shown after the value, as in "100%". */
  suffix?: string
}

const DEFAULT_HSVA: Hsva = { h: 0, s: 1, v: 1, a: 1 }

// Below this, an OKLCH chroma is noise from rounding and its angle means
// nothing: the color is written with chroma and hue 0.
const ACHROMATIC_CHROMA = 0.0005

// One scrub step for every two pixels the pointer moves.
const SCRUB_PIXELS_PER_STEP = 2

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function wrapHue(hue: number) {
  return ((hue % 360) + 360) % 360
}

function hsvToRgb(h: number, s: number, v: number) {
  const chroma = v * s
  const sector = wrapHue(h) / 60
  const second = chroma * (1 - Math.abs((sector % 2) - 1))
  const [r, g, b] =
    sector < 1
      ? [chroma, second, 0]
      : sector < 2
        ? [second, chroma, 0]
        : sector < 3
          ? [0, chroma, second]
          : sector < 4
            ? [0, second, chroma]
            : sector < 5
              ? [second, 0, chroma]
              : [chroma, 0, second]
  const match = v - chroma
  return {
    r: (r + match) * 255,
    g: (g + match) * 255,
    b: (b + match) * 255,
  }
}

// A color without chroma (gray, white, black) has no hue: h comes back 0 and
// s 0, and callers keep the hue they already hold.
function rgbToHsv(r: number, g: number, b: number) {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const delta = max - Math.min(red, green, blue)
  let hue = 0
  if (delta > 0) {
    if (max === red) hue = ((green - blue) / delta) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
  }
  return { h: wrapHue(hue * 60), s: max === 0 ? 0 : delta / max, v: max }
}

function hslToRgb(h: number, s: number, l: number) {
  const { s: saturation, v } = hslToHsv(s, l)
  return hsvToRgb(h, saturation, v)
}

// HSL and HSV share their hue, so these convert only saturation and
// lightness/value, and a hue never passes through RGB.
function hsvToHsl(s: number, v: number) {
  const l = v * (1 - s / 2)
  const saturation = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l)
  return { s: saturation, l }
}

function hslToHsv(s: number, l: number) {
  const v = l + s * Math.min(l, 1 - l)
  return { s: v === 0 ? 0 : 2 * (1 - l / v), v }
}

function srgbToLinear(channel: number) {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(channel: number) {
  const value =
    channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * channel ** (1 / 2.4) - 0.055
  return clamp01(value) * 255
}

// Björn Ottosson's OKLab matrices: linear sRGB to LMS, cube root, Lab.
function rgbToOklch(r: number, g: number, b: number) {
  const red = srgbToLinear(r)
  const green = srgbToLinear(g)
  const blue = srgbToLinear(b)
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue
  )
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue
  )
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue
  )
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const chroma = Math.sqrt(a * a + bAxis * bAxis)
  if (chroma < ACHROMATIC_CHROMA) return { L: lightness, C: 0, H: 0 }
  return {
    L: lightness,
    C: chroma,
    H: wrapHue((Math.atan2(bAxis, a) * 180) / Math.PI),
  }
}

// A chroma past the sRGB edge clips per channel to the nearest displayable
// color.
function oklchToRgb(lightness: number, chroma: number, hue: number) {
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
}

function toHexByte(value: number) {
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, "0")
}

/** Lowercase "#rrggbb", or "#rrggbbaa" below full opacity. */
function formatHex({ r, g, b, a }: Rgba) {
  const hex = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
  return a >= 1 ? hex : `${hex}${toHexByte(a * 255)}`
}

function parseHex(text: string): Rgba | null {
  const digits = /^#?([0-9a-f]{3,8})$/i.exec(text)?.[1]
  if (!digits) return null
  const full =
    digits.length === 3 || digits.length === 4
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits
  if (full.length !== 6 && full.length !== 8) return null
  const byte = (index: number) => parseInt(full.slice(index, index + 2), 16)
  return {
    r: byte(0),
    g: byte(2),
    b: byte(4),
    a: full.length === 8 ? byte(6) / 255 : 1,
  }
}

function readNumber(part: string, percentScale: number) {
  return part.endsWith("%")
    ? (parseFloat(part) / 100) * percentScale
    : parseFloat(part)
}

/** The parts inside `name(...)`, split on commas, spaces and "/". */
function readFunction(text: string, names: string[]) {
  const match = /^([a-z]+)\(\s*([^)]+)\)$/i.exec(text)
  if (!match?.[1] || !match[2]) return null
  if (!names.includes(match[1].toLowerCase())) return null
  const parts = match[2].split(/[\s,/]+/).filter(Boolean)
  return parts.length >= 3 ? parts : null
}

function readAlpha(part: string | undefined) {
  return part === undefined ? 1 : clamp01(readNumber(part, 1))
}

/**
 * Reads hex (3, 4, 6 or 8 digits), rgb(), rgba(), hsl(), hsla() and oklch().
 * Null for anything else, named colors included: those need the browser.
 */
function parseColor(input: string): Rgba | null {
  const text = input.trim()
  if (!text) return null
  if (text.startsWith("#") || /^[0-9a-f]+$/i.test(text)) return parseHex(text)

  const rgb = readFunction(text, ["rgb", "rgba"])
  if (rgb) {
    const [r, g, b] = rgb.slice(0, 3).map((part) => readNumber(part, 255))
    const a = readAlpha(rgb[3])
    if ([r, g, b, a].some((value) => value === undefined || isNaN(value))) {
      return null
    }
    return {
      r: clamp(r ?? 0, 0, 255),
      g: clamp(g ?? 0, 0, 255),
      b: clamp(b ?? 0, 0, 255),
      a,
    }
  }

  const hsl = readFunction(text, ["hsl", "hsla"])
  if (hsl) {
    const h = parseFloat(hsl[0] ?? "")
    const s = readNumber(hsl[1] ?? "", 1)
    const l = readNumber(hsl[2] ?? "", 1)
    const a = readAlpha(hsl[3])
    if ([h, s, l, a].some(isNaN)) return null
    return { ...hslToRgb(h, clamp01(s), clamp01(l)), a }
  }

  const oklch = readFunction(text, ["oklch"])
  if (oklch) {
    const lightness = readNumber(oklch[0] ?? "", 1)
    const chroma = parseFloat(oklch[1] ?? "")
    const hue = parseFloat(oklch[2] ?? "")
    const a = readAlpha(oklch[3])
    if ([lightness, chroma, hue, a].some(isNaN)) return null
    return { ...oklchToRgb(clamp01(lightness), Math.max(0, chroma), hue), a }
  }

  return null
}

function formatAlpha(a: number) {
  return Number(a.toFixed(3))
}

/** The color in every format, all built from one HSV tuple. */
function buildParsedColor(hsva: Hsva): ParsedColor {
  const { h, s, v, a } = hsva
  const rgb = hsvToRgb(h, s, v)
  const hsl = hsvToHsl(s, v)
  const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b)
  const r = Math.round(rgb.r)
  const g = Math.round(rgb.g)
  const b = Math.round(rgb.b)
  const hslHue = Math.round(wrapHue(h))
  const hslParts = `${hslHue}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%`
  const oklchParts = `${(oklch.L * 100).toFixed(1)}% ${oklch.C.toFixed(3)} ${oklch.H.toFixed(1)}`
  const isOpaque = a >= 1
  return {
    ...hsva,
    r,
    g,
    b,
    hex: formatHex({ ...rgb, a }),
    rgb: isOpaque
      ? `rgb(${r}, ${g}, ${b})`
      : `rgba(${r}, ${g}, ${b}, ${formatAlpha(a)})`,
    hsl: isOpaque ? `hsl(${hslParts})` : `hsla(${hslParts}, ${formatAlpha(a)})`,
    oklch: isOpaque
      ? `oklch(${oklchParts})`
      : `oklch(${oklchParts} / ${formatAlpha(a)})`,
  }
}

function formatColor(parsed: ParsedColor, format: ColorFormat) {
  return parsed[format]
}

/** Six uppercase hex digits, without "#" or alpha: what the hex field shows. */
function getHexText(parsed: ParsedColor) {
  return parsed.hex.slice(1, 7).toUpperCase()
}

/** An opaque `rgb()` of the color, for thumbs and gradients. */
function getOpaqueColor({ h, s, v }: Hsva) {
  const { r, g, b } = hsvToRgb(h, s, v)
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`
}

function toHsva(rgba: Rgba, fallbackHue: number): Hsva {
  const { h, s, v } = rgbToHsv(rgba.r, rgba.g, rgba.b)
  return { h: s === 0 ? fallbackHue : h, s, v, a: clamp01(rgba.a) }
}

/** The state for a starting value. An unreadable value starts at pure red. */
function getInitialColorState(value: string): ColorState {
  const rgba = parseColor(value)
  return {
    hsva: rgba ? toHsva(rgba, 0) : DEFAULT_HSVA,
    oklchHue: null,
  }
}

/** A whole new color (a value, swatch, hex or eyedropper). */
function setColorFromRgba(state: ColorState, rgba: Rgba): ColorState {
  return { hsva: toHsva(rgba, state.hsva.h), oklchHue: null }
}

/**
 * The area, the hue slider and the alpha slider edit HSV directly. A new hue
 * drops the held OKLCH hue; saturation, value and alpha keep it.
 */
function setColorHsva(state: ColorState, next: Partial<Hsva>): ColorState {
  return {
    hsva: { ...state.hsva, ...next },
    oklchHue: next.h === undefined ? state.oklchHue : null,
  }
}

const CHANNEL_RANGES: Record<ColorChannel, ChannelRange> = {
  red: { min: 0, max: 255, wrap: false, decimals: 0 },
  green: { min: 0, max: 255, wrap: false, decimals: 0 },
  blue: { min: 0, max: 255, wrap: false, decimals: 0 },
  hslHue: { min: 0, max: 360, wrap: true, decimals: 0 },
  hslSaturation: { min: 0, max: 100, wrap: false, decimals: 0 },
  hslLightness: { min: 0, max: 100, wrap: false, decimals: 0 },
  oklchLightness: { min: 0, max: 100, wrap: false, decimals: 0 },
  // Above the sRGB peak (about 0.32, magenta), so every displayable chroma
  // is reachable; anything past the gamut clips.
  oklchChroma: { min: 0, max: 0.4, wrap: false, decimals: 2 },
  oklchHue: { min: 0, max: 360, wrap: true, decimals: 0 },
  alpha: { min: 0, max: 100, wrap: false, decimals: 0 },
}

const CHANNEL_LABELS: Record<ColorChannel, [string, string]> = {
  red: ["Red", "R"],
  green: ["Green", "G"],
  blue: ["Blue", "B"],
  hslHue: ["Hue", "H"],
  hslSaturation: ["Saturation", "S"],
  hslLightness: ["Lightness", "L"],
  oklchLightness: ["Lightness", "L"],
  oklchChroma: ["Chroma", "C"],
  oklchHue: ["Hue", "H"],
  alpha: ["Alpha", "A"],
}

const FORMAT_CHANNELS: Record<ColorFormat, ColorChannel[]> = {
  hex: ["alpha"],
  rgb: ["red", "green", "blue", "alpha"],
  hsl: ["hslHue", "hslSaturation", "hslLightness", "alpha"],
  oklch: ["oklchLightness", "oklchChroma", "oklchHue", "alpha"],
}

function getChannelValue(state: ColorState, channel: ColorChannel) {
  const { h, s, v, a } = state.hsva
  const rgb = hsvToRgb(h, s, v)
  switch (channel) {
    case "red":
      return rgb.r
    case "green":
      return rgb.g
    case "blue":
      return rgb.b
    case "hslHue":
      return wrapHue(h)
    case "hslSaturation":
      return hsvToHsl(s, v).s * 100
    case "hslLightness":
      return hsvToHsl(s, v).l * 100
    case "oklchLightness":
      return rgbToOklch(rgb.r, rgb.g, rgb.b).L * 100
    case "oklchChroma":
      return rgbToOklch(rgb.r, rgb.g, rgb.b).C
    case "oklchHue":
      return state.oklchHue ?? rgbToOklch(rgb.r, rgb.g, rgb.b).H
    case "alpha":
      return a * 100
  }
}

/** The fields a format shows beside the area. Hex lists only alpha. */
function getChannelFields(
  state: ColorState,
  format: ColorFormat
): ChannelField[] {
  return FORMAT_CHANNELS[format].map((channel) => {
    const range = CHANNEL_RANGES[channel]
    const [label, shortLabel] = CHANNEL_LABELS[channel]
    const step = 10 ** -range.decimals
    return {
      ...range,
      channel,
      label,
      shortLabel,
      value: roundTo(getChannelValue(state, channel), range.decimals),
      step,
      shiftStep: step * 10,
      suffix: channel === "alpha" ? "%" : undefined,
    }
  })
}

/** Sets one channel, keeping the others and, where it has none, the hue. */
function setColorChannel(
  state: ColorState,
  channel: ColorChannel,
  input: number
): ColorState {
  const value = normalizeChannelValue(CHANNEL_RANGES[channel], input)
  const { h, s, v, a } = state.hsva
  const rgb = hsvToRgb(h, s, v)

  switch (channel) {
    case "red":
    case "green":
    case "blue": {
      const next = {
        r: channel === "red" ? value : rgb.r,
        g: channel === "green" ? value : rgb.g,
        b: channel === "blue" ? value : rgb.b,
        a,
      }
      return { hsva: toHsva(next, h), oklchHue: null }
    }
    case "hslHue":
      return { hsva: { ...state.hsva, h: value }, oklchHue: null }
    case "hslSaturation":
    case "hslLightness": {
      const hsl = hsvToHsl(s, v)
      const next = hslToHsv(
        channel === "hslSaturation" ? value / 100 : hsl.s,
        channel === "hslLightness" ? value / 100 : hsl.l
      )
      return { hsva: { h, s: next.s, v: next.v, a }, oklchHue: state.oklchHue }
    }
    case "oklchLightness":
    case "oklchChroma":
    case "oklchHue": {
      const current = rgbToOklch(rgb.r, rgb.g, rgb.b)
      // L and C edits keep the stated hue, so the hue doesn't drift as chroma
      // passes through 0. Any OKLCH edit makes the hue sticky.
      const hue = channel === "oklchHue" ? value : (state.oklchHue ?? current.H)
      const next = oklchToRgb(
        channel === "oklchLightness" ? value / 100 : current.L,
        channel === "oklchChroma" ? value : current.C,
        hue
      )
      return { hsva: toHsva({ ...next, a }, h), oklchHue: hue }
    }
    case "alpha":
      return {
        hsva: { ...state.hsva, a: value / 100 },
        oklchHue: state.oklchHue,
      }
  }
}

function normalizeChannelValue(range: ChannelRange, value: number) {
  const { min, max, wrap, decimals } = range
  const span = max - min
  const next =
    wrap && (value > max || value < min)
      ? ((((value - min) % span) + span) % span) + min
      : clamp(value, min, max)
  return roundTo(next, decimals)
}

/** A keyboard step: clamped, or wrapped for angles, and rounded. */
function stepChannelValue(range: ChannelRange, value: number, delta: number) {
  return normalizeChannelValue(range, value + delta)
}

/** Typed text as a channel value, or null when it isn't a number. */
function parseChannelText(range: ChannelRange, text: string) {
  const cleaned = text.trim().replace(/%$/, "").trim()
  if (!cleaned) return null
  const value = Number(cleaned)
  return isNaN(value) ? null : normalizeChannelValue(range, value)
}

/** The value after dragging a field's label sideways by `deltaPixels`. */
function getScrubbedValue(
  field: ChannelRange & { step: number },
  startValue: number,
  deltaPixels: number,
  isShift: boolean
) {
  const steps = Math.trunc(deltaPixels / SCRUB_PIXELS_PER_STEP)
  const step = isShift ? field.step * 10 : field.step
  return normalizeChannelValue(field, startValue + steps * step)
}

type AreaRect = { left: number; top: number; width: number; height: number }

/** Saturation runs left to right, brightness bottom to top. */
function getAreaValueFromPoint(
  rect: AreaRect,
  point: { x: number; y: number }
) {
  return {
    s: clamp01((point.x - rect.left) / rect.width),
    v: 1 - clamp01((point.y - rect.top) / rect.height),
  }
}

/** The area's keyboard: arrows step 1% (10% with Shift). Null for other keys. */
function nudgeArea(
  { s, v }: { s: number; v: number },
  key: string,
  isShift: boolean
) {
  const step = isShift ? 0.1 : 0.01
  const move = (value: number, delta: number) =>
    roundTo(clamp01(value + delta), 4)
  switch (key) {
    case "ArrowLeft":
      return { s: move(s, -step), v }
    case "ArrowRight":
      return { s: move(s, step), v }
    case "ArrowUp":
      return { s, v: move(v, step) }
    case "ArrowDown":
      return { s, v: move(v, -step) }
    case "Home":
      return { s: 0, v }
    case "End":
      return { s: 1, v }
    case "PageUp":
      return { s, v: 1 }
    case "PageDown":
      return { s, v: 0 }
    default:
      return null
  }
}

/** A color as lowercase hex, so swatches match however they're written. */
function getSwatchKey(color: string) {
  const rgba = parseColor(color)
  return rgba ? formatHex(rgba) : null
}

export {
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
  type ChannelRange,
  type ColorChannel,
  type ColorFormat,
  type ColorState,
  type Hsva,
  type ParsedColor,
  type Rgba,
}
