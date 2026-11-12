export const THEME_TOGGLE_VARIANTS = [
  "rectangle",
  "circle",
  "circle-blur",
  "blinds",
  "square",
  "diamond",
  "hexagon",
  "triangle",
] as const
export const THEME_TOGGLE_STARTS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
  "bottom-up",
  "trigger",
] as const
export type ThemeToggleVariant = (typeof THEME_TOGGLE_VARIANTS)[number]
export type ThemeToggleStart = (typeof THEME_TOGGLE_STARTS)[number]
export type ThemeToggleTheme = "light" | "dark"

export type ThemeToggleRectangle = {
  left: number
  top: number
  width: number
  height: number
}

export function getThemeToggleOrigin(
  start: ThemeToggleStart,
  width: number,
  height: number,
  trigger?: ThemeToggleRectangle
) {
  "worklet"
  if (start === "trigger") {
    return trigger
      ? {
          x: trigger.left + trigger.width / 2,
          y: trigger.top + trigger.height / 2,
        }
      : { x: width / 2, y: height / 2 }
  }
  return {
    x:
      start === "center" || start === "bottom-up"
        ? width / 2
        : start.endsWith("right")
          ? width
          : 0,
    y: start === "center" ? height / 2 : start.startsWith("top") ? 0 : height,
  }
}

export function getThemeToggleReveal(
  variant: ThemeToggleVariant,
  start: ThemeToggleStart,
  width: number,
  height: number,
  trigger?: ThemeToggleRectangle
) {
  const origin = getThemeToggleOrigin(start, width, height, trigger)
  if (variant === "circle-blur") {
    const position = `${(origin.x / width) * 100}% ${(origin.y / height) * 100}%`
    return {
      from: `circle(0% at ${position})`,
      to: `circle(150% at ${position})`,
      hasBlur: true,
    }
  }
  if (variant === "circle") {
    const radius = Math.ceil(
      Math.hypot(
        Math.max(origin.x, width - origin.x),
        Math.max(origin.y, height - origin.y)
      )
    )
    return {
      from: `circle(0px at ${origin.x}px ${origin.y}px)`,
      to: `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
      hasBlur: false,
    }
  }
  if (variant === "blinds") {
    return {
      from: getThemeToggleBlindsClip(origin, width, height, 0),
      to: getThemeToggleBlindsClip(origin, width, height, 1),
      hasBlur: false,
    }
  }

  if (variant !== "rectangle") {
    const shape = getThemeTogglePolygon(variant, origin, width, height, 0)
    const point = `${(origin.x / width) * 100}% ${(origin.y / height) * 100}%`
    return {
      from: `polygon(${shape.vertices.map(() => point).join(", ")})`,
      to: `polygon(${shape.vertices.map(({ x, y }) => `${(x / width) * 100}% ${(y / height) * 100}%`).join(", ")})`,
      hasBlur: false,
    }
  }

  if (start === "trigger") {
    return {
      from: `inset(${origin.y}px ${width - origin.x}px ${height - origin.y}px ${origin.x}px)`,
      to: "inset(0px 0px 0px 0px)",
      hasBlur: false,
    }
  }
  const insets: Record<Exclude<ThemeToggleStart, "trigger">, string> = {
    "top-left": "0% 100% 100% 0%",
    "top-right": "0% 0% 100% 100%",
    "bottom-left": "100% 100% 0% 0%",
    "bottom-right": "100% 0% 0% 100%",
    center: "50% 50% 50% 50%",
    "bottom-up": "100% 0% 0% 0%",
  }
  return {
    from: `inset(${insets[start]})`,
    to: "inset(0% 0% 0% 0%)",
    hasBlur: false,
  }
}

function getThemeToggleBlindsClip(
  origin: { x: number; y: number },
  width: number,
  height: number,
  progress: number
) {
  const strips = Array.from({ length: 12 }, (_, index) => {
    const left = (index * width) / 12
    const right = ((index + 1) * width) / 12
    const anchor = Math.max(left, Math.min(right, origin.x))
    const delay = (Math.abs(anchor - origin.x) / width) * 0.35
    const opening = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    const x = anchor + (left - anchor) * opening
    const end = anchor + (right - anchor) * opening
    const top = origin.y * (1 - opening)
    const bottom = origin.y + (height - origin.y) * opening
    return `M${x} ${top}L${end} ${top}L${end} ${bottom}L${x} ${bottom}Z`
  })
  return `path('${strips.join("")}')`
}

export function getThemeToggleFrames(
  variant: ThemeToggleVariant,
  start: ThemeToggleStart,
  width: number,
  height: number,
  trigger?: ThemeToggleRectangle
) {
  if (variant === "blinds") {
    const origin = getThemeToggleOrigin(start, width, height, trigger)
    return Array.from({ length: 25 }, (_, index) => ({
      clipPath: getThemeToggleBlindsClip(origin, width, height, index / 24),
      offset: index / 24,
    }))
  }
  const reveal = getThemeToggleReveal(variant, start, width, height, trigger)
  if (variant === "circle-blur") {
    return [
      { clipPath: reveal.from, filter: "blur(8px)" },
      { clipPath: reveal.to, filter: "blur(0px)" },
    ]
  }
  return [
    { clipPath: reveal.from, opacity: 0, offset: 0 },
    { opacity: 1, offset: 0.25 },
    { clipPath: reveal.to, opacity: 1, offset: 1 },
  ]
}

/** Custom properties can be serialized as seconds by the CSS compiler. */
export function getThemeToggleDuration(value: string, scale: number) {
  const time = value.trim()
  const unit = time.endsWith("ms") ? 1 : time.endsWith("s") ? 1000 : 1
  return Number.parseFloat(time) * unit * scale
}

export const THEME_TOGGLE_PROGRESS = "--fabricator-theme-progress"

type ThemeTogglePoint = { x: number; y: number }
type ThemeTogglePolygonVariant = Exclude<
  ThemeToggleVariant,
  "circle" | "circle-blur" | "blinds"
>

function getThemeTogglePolygon(
  variant: ThemeTogglePolygonVariant,
  origin: ThemeTogglePoint,
  width: number,
  height: number,
  feather: number
) {
  const aspect = variant === "rectangle" ? width / height : 1
  const count = variant === "triangle" ? 3 : 6
  const vertices =
    variant === "square" || variant === "rectangle"
      ? [
          { x: -aspect, y: -1 },
          { x: aspect, y: -1 },
          { x: aspect, y: 1 },
          { x: -aspect, y: 1 },
        ]
      : variant === "diamond"
        ? [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
          ]
        : Array.from({ length: count }, (_, index) => {
            const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
            return { x: Math.cos(angle), y: Math.sin(angle) }
          })
  const planes = vertices.map((point, index) => {
    const next = vertices[(index + 1) % vertices.length]
    const length = Math.hypot(next.x - point.x, next.y - point.y)
    const x = (next.y - point.y) / length
    const y = (point.x - next.x) / length
    return { x, y, extent: x * point.x + y * point.y }
  })
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  const scale = Math.max(
    ...planes.flatMap((plane) =>
      corners.map(
        (point) =>
          (plane.x * (point.x - origin.x) +
            plane.y * (point.y - origin.y) +
            feather +
            1) /
          plane.extent
      )
    )
  )
  return {
    kind: "polygon" as const,
    origin,
    feather,
    vertices: vertices.map((point) => ({
      x: origin.x + point.x * scale,
      y: origin.y + point.y * scale,
    })),
    planes: planes.map((plane) => ({ ...plane, extent: plane.extent * scale })),
  }
}

/** Convex geometry shared by the sharp fallback and the feathered masks. */
export function getThemeToggleShape(
  variant: ThemeToggleVariant,
  start: ThemeToggleStart,
  width: number,
  height: number,
  trigger?: ThemeToggleRectangle
) {
  if (variant === "blinds") return null
  const origin = getThemeToggleOrigin(start, width, height, trigger)
  const feather =
    variant === "circle"
      ? 0
      : Math.max(16, Math.min(32, Math.min(width, height) * 0.035))
  if (variant === "circle" || variant === "circle-blur")
    return {
      kind: "circle" as const,
      origin,
      feather,
      radius: Math.hypot(
        Math.max(origin.x, width - origin.x),
        Math.max(origin.y, height - origin.y)
      ),
    }
  return getThemeTogglePolygon(variant, origin, width, height, feather)
}

function getThemeToggleFadeStops(
  base: number,
  extent: number,
  feather: number
) {
  const round = (value: number) => Number(value.toFixed(6))
  const edge = `${round(base)}% + var(${THEME_TOGGLE_PROGRESS}, 0) * ${round(extent)}%`
  return [
    `#000 calc(${edge} - ${round(feather)}%)`,
    `#000e calc(${edge} - ${round(feather * 0.75)}%)`,
    `#0008 calc(${edge} - ${round(feather * 0.5)}%)`,
    `#0002 calc(${edge} - ${round(feather * 0.25)}%)`,
    `#0000 calc(${edge})`,
  ].join(", ")
}

/** Fade alpha at the moving boundary; never filter the page's text. */
export function getThemeToggleMask(
  variant: ThemeToggleVariant,
  start: ThemeToggleStart,
  width: number,
  height: number,
  trigger?: ThemeToggleRectangle
) {
  if (variant === "circle-blur") return null
  const shape = getThemeToggleShape(variant, start, width, height, trigger)
  if (!shape) return null
  if (shape.kind === "circle") {
    const stops = getThemeToggleFadeStops(
      0,
      ((shape.radius + shape.feather + 1) / shape.radius) * 100,
      (shape.feather / shape.radius) * 100
    )
    return {
      shape,
      composite: "add",
      image: `radial-gradient(circle farthest-corner at ${(shape.origin.x / width) * 100}% ${(shape.origin.y / height) * 100}%, ${stops})`,
    }
  }
  const gradients = shape.planes.map((plane) => {
    const length = Math.abs(plane.x) * width + Math.abs(plane.y) * height
    const base =
      length / 2 +
      plane.x * (shape.origin.x - width / 2) +
      plane.y * (shape.origin.y - height / 2)
    const stops = getThemeToggleFadeStops(
      (base / length) * 100,
      (plane.extent / length) * 100,
      (shape.feather / length) * 100
    )
    const angle = (Math.atan2(plane.x, -plane.y) * 180) / Math.PI
    return `linear-gradient(${angle}deg, ${stops})`
  })
  return { shape, composite: "intersect", image: gradients.join(", ") }
}
