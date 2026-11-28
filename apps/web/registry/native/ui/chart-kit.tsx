import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { G, Line, Text as SvgText } from "react-native-svg"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import { MOTION_SPEED_NAMES, MOTION_SPEEDS } from "@/registry/fabricator/motion"
import { type ChartTick } from "@/registry/fabricator/shared/lib/chart-cartesian-model"
import {
  getCubicBezier,
  getScrubTick,
  getSteadyDrawOrder,
  getSteppedIndex,
  getTooltipPosition,
  parseCubicBezier,
  type ChartConfig,
  type ChartPaint,
  type ChartPoint,
  type ChartSeries,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "@/registry/fabricator/shared/lib/chart-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import { Text } from "@/registry/native/ui/text"

// The parts every chart is drawn with on React Native, under the website's
// names: the measured plot, motion read from the theme, gridlines and axes in
// SVG, the crosshair, dots and tooltip as views animated on the UI thread,
// the legend, and the inspector a finger scrubs and VoiceOver adjusts. The
// geometry comes from the same models the website draws.

// The plot, gridline and axis rules are read as styles and drawn into SVG.
const AnimatedG = Animated.createAnimatedComponent(G)

const chartPlotStyle = cva("cn-chart-plot")
const chartGridStyle = cva("cn-chart-grid")
const chartAxisStyle = cva("cn-chart-axis")

// --- Size ----------------------------------------------------------------------

/**
 * The plot's size, from layout, and the axis font size from the plot's
 * style. Charts draw nothing until the size is known.
 */
function useChartSize() {
  const [size, setSize] = React.useState<ChartSize | null>(null)
  const plot = useResolveClassNames(chartPlotStyle())
  const fontSize = typeof plot.fontSize === "number" ? plot.fontSize : 11
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setSize((current) =>
      current?.width === width && current.height === height
        ? current
        : { width, height }
    )
  }, [])
  return { onLayout, size, fontSize }
}

// --- Motion --------------------------------------------------------------------

type ChartMotionRole = "reveal" | "move"

type ChartTiming = { duration: number; easing: (progress: number) => number }

const EASE_FALLBACK = getCubicBezier([0.23, 1, 0.32, 1])

/**
 * A role's timing from the theme: the same tokens as the website, so a
 * scoped speed retimes the chart, and none under Reduce Motion or when
 * motion is off.
 */
function useChartTiming(role: ChartMotionRole): ChartTiming {
  const motion = useMotion(role)
  const speed = useCSSVariable("--motion-speed")
  const name = MOTION_SPEED_NAMES[Number(speed ?? 1)] ?? MOTION_SPEED_NAMES[1]
  const isStill = motion.isReduced || motion.isOff
  const duration = isStill ? 0 : motion.enterMs
  return React.useMemo(() => {
    const easings = MOTION_SPEEDS[name].easings
    const curve = parseCubicBezier(
      role === "reveal" ? easings.enter : easings.move
    )
    return {
      duration,
      easing: curve ? getCubicBezier(curve) : EASE_FALLBACK,
    }
  }, [duration, name, role])
}

function animateProgress(
  timing: ChartTiming,
  onFrame: (progress: number) => void
) {
  if (timing.duration <= 0) {
    onFrame(1)
    return () => {}
  }
  let frame = 0
  const start = performance.now()
  const tick = (now: number) => {
    const linear = Math.min(1, (now - start) / timing.duration)
    onFrame(timing.easing(linear))
    if (linear < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

/** A host view React Native's IntersectionObserver can watch. */
function isObservable(value: unknown): value is Element {
  return (
    typeof value === "object" &&
    value !== null &&
    "getBoundingClientRect" in value
  )
}

/**
 * Calls `start` once a quarter of `element` is on screen, as the website's
 * draw-in waits, and returns the cleanup. React Native installs
 * IntersectionObserver only where the app enables it; without it, or
 * without a host view, `start` runs at once.
 */
function startWhenVisible(element: unknown, start: () => void) {
  if (typeof IntersectionObserver === "undefined" || !isObservable(element)) {
    start()
    return undefined
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      start()
    },
    { threshold: 0.25 }
  )
  observer.observe(element)
  return () => observer.disconnect()
}

/**
 * The draw-in: 0 until the plot is on screen, then 1 over the reveal role's
 * duration, as on the website. Where the app hasn't enabled React Native's
 * IntersectionObserver, it starts once the plot has a size. Once per mount;
 * 1 straight away when `enabled` is off.
 */
function useChartReveal(
  isReady: boolean,
  enabled: boolean,
  target?: React.RefObject<React.ComponentRef<typeof View> | null>
) {
  const timing = useChartTiming("reveal")
  const [progress, setProgress] = React.useState(enabled ? 0 : 1)
  const hasStarted = React.useRef(!enabled)
  const cancel = React.useRef(() => {})

  // Once started, the draw-in runs to the end whatever changes; only
  // unmounting stops it.
  React.useEffect(() => {
    if (hasStarted.current || !isReady) return
    const start = () => {
      hasStarted.current = true
      cancel.current = animateProgress(timing, setProgress)
    }
    // With no draw-in to watch (Reduce Motion, motion off), the chart is
    // drawn at once, as the website's is, and its fade runs on mount.
    if (timing.duration <= 0) {
      start()
      return
    }
    return startWhenVisible(target?.current, start)
  }, [isReady, target, timing])
  React.useEffect(() => () => cancel.current(), [])

  return progress
}

/**
 * Under Reduce Motion the draw-in's sweeps and growth go, but the plot still
 * fades in once, the first time it has a size, on the tooltip role as the
 * website's plot SVG does, so it doesn't appear in a single frame. Nothing
 * fades with motion off or `animate` off, and nothing changes without
 * Reduce Motion.
 */
function ChartRevealFade({
  isReady,
  enabled,
  children,
}: {
  isReady: boolean
  enabled: boolean
  children: React.ReactNode
}) {
  const tooltip = useMotion("tooltip")
  const isFading = enabled && tooltip.isReduced && !tooltip.isOff
  const opacity = useSharedValue(isFading ? 0 : 1)
  const hasStarted = React.useRef(!isFading)
  React.useEffect(() => {
    if (hasStarted.current || !isReady) return
    hasStarted.current = true
    opacity.set(
      withTiming(1, {
        duration: tooltip.enterMs,
        easing: tooltip.enterEasing,
        reduceMotion: ReduceMotion.Never,
      })
    )
  }, [isReady, tooltip, opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      {children}
    </Animated.View>
  )
}

/**
 * The draw-in as a shared value, for a reveal that only widens a clip: it
 * runs on the UI thread, so the plot doesn't re-render per frame. The same
 * timing and start as useChartReveal.
 */
function useChartRevealValue(
  isReady: boolean,
  enabled: boolean,
  target?: React.RefObject<React.ComponentRef<typeof View> | null>
) {
  const reveal = useMotion("reveal")
  const progress = useSharedValue(enabled ? 0 : 1)
  const hasStarted = React.useRef(!enabled)
  React.useEffect(() => {
    if (hasStarted.current || !isReady) return
    if (reveal.isReduced || reveal.isOff) {
      hasStarted.current = true
      progress.set(1)
      return
    }
    return startWhenVisible(target?.current, () => {
      hasStarted.current = true
      progress.set(
        withTiming(1, {
          duration: reveal.enterMs,
          easing: reveal.enterEasing,
        })
      )
    })
  }, [isReady, progress, reveal, target])
  return progress
}

/**
 * A value that morphs to each new target on the move role, as on the
 * website: `animateKey` changes with the data (morph), not the size (jump).
 */
function useChartTween<TValue>(
  target: TValue,
  interpolate: (from: TValue, to: TValue, progress: number) => TValue | null,
  animateKey: unknown
) {
  const timing = useChartTiming("move")
  const [tween, setTween] = React.useState({
    from: target,
    to: target,
    key: animateKey,
    progress: 1,
    run: 0,
  })

  const blend = (from: TValue, to: TValue, progress: number) =>
    progress >= 1 ? to : (interpolate(from, to, progress) ?? to)

  if (tween.to !== target) {
    const isDataChange = tween.key !== animateKey
    setTween({
      from: isDataChange ? blend(tween.from, tween.to, tween.progress) : target,
      to: target,
      key: animateKey,
      progress: isDataChange ? 0 : 1,
      run: tween.run + (isDataChange ? 1 : 0),
    })
  }

  const { run } = tween
  React.useEffect(() => {
    if (run === 0) return
    return animateProgress(timing, (progress) =>
      setTween((current) =>
        current.run === run ? { ...current, progress } : current
      )
    )
  }, [run, timing])

  return blend(tween.from, target, tween.progress)
}

/**
 * Tweened marks in a steady drawing order: the tweens list leaving marks
 * last, which would lift a leaving mark over the others while it fades, so
 * each keeps its place and keys that left are remembered. Pass a `getKey`
 * defined outside the component, so the result stays memoized.
 */
function useChartDrawOrder<TItem>(
  items: readonly TItem[],
  getKey: (item: TItem) => string
): readonly TItem[] {
  const keys = items.map(getKey)
  const [order, setOrder] = React.useState<readonly string[]>(keys)
  const nextOrder = getSteadyDrawOrder(order, keys)
  if (nextOrder !== order) setOrder(nextOrder)

  return React.useMemo(() => {
    const byKey = new Map(items.map((item) => [getKey(item), item]))
    const ordered = nextOrder.flatMap((key) => {
      const item = byKey.get(key)
      return item === undefined ? [] : [item]
    })
    const isInOrder = ordered.every(
      (item, position) => item === items[position]
    )
    return isInOrder ? items : ordered
  }, [items, nextOrder, getKey])
}

// --- State ---------------------------------------------------------------------

/**
 * Which series the legend has hidden, and the one it spotlights. The last
 * visible series can't be hidden.
 */
function useChartLegendState(config: ChartConfig) {
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(new Set())
  const [spotlight, setSpotlight] = React.useState<string | null>(null)
  const count = Object.keys(config).length

  const toggle = React.useCallback(
    (key: string) => {
      // A press ends the spotlight: a hidden series has nothing to light, and
      // the rest shouldn't stay dimmed until the pointer leaves.
      setSpotlight(null)
      setHidden((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else if (count - next.size > 1) next.add(key)
        return next
      })
    },
    [count]
  )

  return { hidden, toggle, spotlight, setSpotlight }
}

// --- Paint ---------------------------------------------------------------------

/**
 * Every token the paints name, resolved to colours from the theme, so a look
 * applied at runtime repaints the chart.
 */
function useChartColors(paints: readonly ChartPaint[]) {
  const tokens = [
    ...new Set(
      paints.flatMap((paint) => ("token" in paint ? [`--${paint.token}`] : []))
    ),
  ]
  const values = useCSSVariable(tokens)
  return Object.fromEntries(
    tokens.map((token, index) => [token, String(values[index] ?? "")])
  )
}

/** A paint as a colour, from the resolved tokens. */
function getChartColor(paint: ChartPaint, colors: Record<string, string>) {
  return "token" in paint ? (colors[`--${paint.token}`] ?? "") : paint.value
}

function readColor(
  style: ReturnType<typeof useResolveClassNames>,
  key: "color" | "backgroundColor"
) {
  const value = style[key]
  return typeof value === "string" ? value : undefined
}

// --- SVG parts -----------------------------------------------------------------

/**
 * A group of the chart's frame (gridlines, axis labels): it fades in once on
 * the tooltip role when the chart first draws, so the frame doesn't pop
 * while the marks draw in. Never keyed, so it doesn't fade again.
 */
function ChartFrame({ children, ...props }: React.ComponentProps<typeof G>) {
  // Under Reduce Motion the plot's ChartRevealFade fades the whole chart, so
  // the frame doesn't fade a second time inside it.
  const isReduced = useMotion("tooltip").isReduced
  const opacity = useFadeIn(isReduced)
  const fadeProps = useAnimatedProps(() => ({ opacity: opacity.get() }))
  return (
    <AnimatedG {...props} animatedProps={fadeProps}>
      {children}
    </AnimatedG>
  )
}

function ChartGrid({
  ticks,
  orientation = "horizontal",
  start,
  end,
  className,
}: {
  ticks: readonly ChartTick[]
  orientation?: "horizontal" | "vertical"
  start: number
  end: number
  className?: string
}) {
  const style = useResolveClassNames(cn(chartGridStyle(), className))
  const stroke = readColor(style, "color")
  return (
    <ChartFrame data-slot="chart-grid">
      {ticks.map((tick) =>
        orientation === "horizontal" ? (
          <Line
            key={tick.value}
            x1={start}
            x2={end}
            y1={tick.position}
            y2={tick.position}
            stroke={stroke}
            strokeWidth={StyleSheet.hairlineWidth}
          />
        ) : (
          <Line
            key={tick.value}
            y1={start}
            y2={end}
            x1={tick.position}
            x2={tick.position}
            stroke={stroke}
            strokeWidth={StyleSheet.hairlineWidth}
          />
        )
      )}
    </ChartFrame>
  )
}

function ChartAxis({
  ticks,
  side,
  offset,
  className,
}: {
  ticks: readonly { position: number; label: string }[]
  side: "start" | "bottom"
  offset: number
  className?: string
}) {
  const style = useResolveClassNames(cn(chartAxisStyle(), className))
  const fill = readColor(style, "color")
  const fontSize = typeof style.fontSize === "number" ? style.fontSize : 11
  return (
    <ChartFrame data-slot="chart-axis">
      {ticks.map((tick, index) =>
        side === "start" ? (
          <SvgText
            key={`${tick.label}-${index}`}
            x={offset}
            y={tick.position + fontSize * 0.35}
            fill={fill}
            fontSize={fontSize}
            fontFamily="Inter"
            textAnchor="end"
          >
            {tick.label}
          </SvgText>
        ) : (
          <SvgText
            key={`${tick.label}-${index}`}
            x={tick.position}
            y={offset + fontSize * 0.9}
            fill={fill}
            fontSize={fontSize}
            fontFamily="Inter"
            textAnchor="middle"
          >
            {tick.label}
          </SvgText>
        )
      )}
    </ChartFrame>
  )
}

/**
 * A mark that fades back while another is spotlit or inspected, or while it
 * leaves the data, on the feedback timing both ways, as the website's
 * data-dimmed transition. Reduce Motion keeps it: a fade isn't movement.
 */
function ChartDimmable({
  isDimmed,
  dimmedOpacity,
  children,
}: {
  isDimmed: boolean
  dimmedOpacity: number
  children: React.ReactNode
}) {
  const feedback = useMotion("feedback")
  const target = isDimmed ? dimmedOpacity : 1
  const opacity = useSharedValue(target)
  React.useEffect(() => {
    opacity.set(
      feedback.isOff
        ? target
        : withTiming(target, {
            duration: feedback.enterMs,
            easing: feedback.feedbackEasing,
            reduceMotion: ReduceMotion.Never,
          })
    )
  }, [target, opacity, feedback])
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.get() }))
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>
}

/**
 * A mark's labels: they fade in with an arriving mark on the move role, and
 * out to `leavingOpacity` while it leaves, as the website's label presence
 * rule does, instead of popping. Reduce Motion keeps the fade.
 */
function ChartLabelPresence({
  isLeaving,
  leavingOpacity,
  children,
}: {
  isLeaving: boolean
  leavingOpacity: number
  children: React.ReactNode
}) {
  const move = useMotion("move")
  const target = isLeaving ? leavingOpacity : 1
  const opacity = useSharedValue(move.isOff ? target : 0)
  React.useEffect(() => {
    opacity.set(
      move.isOff
        ? target
        : withTiming(target, {
            duration: move.enterMs,
            easing: move.moveEasing,
            reduceMotion: ReduceMotion.Never,
          })
    )
  }, [target, opacity, move])
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.get() }))
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>
}

// --- Overlays ------------------------------------------------------------------
// The crosshair, dots, band and tooltip follow a finger, so they are views
// moved by Reanimated on the UI thread, over the SVG.

/**
 * A position that glides to each new value on the glide role. It lands on
 * its first value once `isReady` (a tooltip once it has been measured) and
 * glides from there.
 */
function useGlide(value: number, isReady = true) {
  const glide = useMotion("glide")
  const shared = useSharedValue(value)
  const hasLanded = React.useRef(false)
  React.useEffect(() => {
    if (!isReady) return
    if (!hasLanded.current || glide.isReduced || glide.isOff) {
      hasLanded.current = true
      shared.set(value)
      return
    }
    shared.set(
      withTiming(value, {
        duration: glide.enterMs,
        easing: glide.enterEasing,
      })
    )
  }, [value, isReady, shared, glide])
  return shared
}

/**
 * An opacity that fades in on the tooltip role when an overlay mounts.
 * Reanimated jumps a timing to its end under Reduce Motion by default; a
 * fade isn't movement, so it stays. `isInstant` skips it for a part whose
 * fade something around it already carries.
 */
function useFadeIn(isInstant = false) {
  const tooltip = useMotion("tooltip")
  const opacity = useSharedValue(0)
  React.useEffect(() => {
    opacity.set(
      isInstant || tooltip.isOff
        ? 1
        : withTiming(1, {
            duration: tooltip.enterMs,
            easing: tooltip.enterEasing,
            reduceMotion: ReduceMotion.Never,
          })
    )
  }, [isInstant, opacity, tooltip])
  return opacity
}

/**
 * An overlay's exit: it fades out on the tooltip role as it unmounts, Reduce
 * Motion included, since a fade moves nothing.
 */
function useFadeOut() {
  const tooltip = useMotion("tooltip")
  return React.useMemo(() => {
    if (tooltip.isOff) return undefined
    const exit = {
      duration: tooltip.exitMs,
      easing: tooltip.exitEasing,
      reduceMotion: ReduceMotion.Never,
    }
    return () => {
      "worklet"
      return {
        initialValues: { opacity: 1 },
        animations: { opacity: withTiming(0, exit) },
      }
    }
  }, [tooltip])
}

/** The vertical hairline that finds the inspected index. */
function ChartCrosshair({
  x,
  top,
  bottom,
  className,
}: {
  x: number
  top: number
  bottom: number
  className?: string
}) {
  const position = useGlide(x)
  const opacity = useFadeIn()
  const exiting = useFadeOut()
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: position.get() }],
  }))
  return (
    <Animated.View
      data-slot="chart-crosshair"
      exiting={exiting}
      pointerEvents="none"
      className={cn("cn-chart-crosshair absolute left-0", className)}
      style={[
        { top, height: bottom - top, width: StyleSheet.hairlineWidth },
        animated,
      ]}
    >
      <View className="cn-chart-crosshair-line flex-1" />
    </Animated.View>
  )
}

/** A series' dot at the inspected index, ringed in the surface. */
function ChartDot({
  point,
  color,
  className,
}: {
  point: ChartPoint
  color: string
  className?: string
}) {
  const x = useGlide(point.x)
  const y = useGlide(point.y)
  const opacity = useFadeIn()
  const exiting = useFadeOut()
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: x.get() - 6 }, { translateY: y.get() - 6 }],
  }))
  return (
    <Animated.View
      data-slot="chart-dot"
      exiting={exiting}
      pointerEvents="none"
      className={cn("cn-chart-dot absolute top-0 left-0", className)}
      style={animated}
    >
      <View
        className="cn-chart-dot-mark size-3 rounded-full"
        style={{ backgroundColor: color }}
      />
    </Animated.View>
  )
}

/** The category under the finger on bar charts: a faint wash that glides. */
function ChartBand({
  rect,
  className,
}: {
  rect: { x: number; y: number; width: number; height: number }
  className?: string
}) {
  const x = useGlide(rect.x)
  const y = useGlide(rect.y)
  const opacity = useFadeIn()
  const exiting = useFadeOut()
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }],
  }))
  return (
    <Animated.View
      data-slot="chart-band"
      exiting={exiting}
      pointerEvents="none"
      className={cn("cn-chart-band absolute top-0 left-0", className)}
      style={[{ width: rect.width, height: rect.height }, animated]}
    >
      <View className="cn-chart-band-mark flex-1" />
    </Animated.View>
  )
}

/**
 * The readout for the inspected mark, above the finger so the finger never
 * covers it: its title, then a row per series with the value first in
 * weight.
 */
function ChartTooltip({
  content,
  anchor,
  frame,
  colors,
  side = "top",
  className,
}: {
  content: ChartTooltipContent
  anchor: ChartPoint
  frame: ChartSize
  colors: Record<string, string>
  side?: "end" | "top"
  className?: string
}) {
  const [size, setSize] = React.useState<ChartSize | null>(null)
  const position = size
    ? getTooltipPosition({ anchor, frame, tooltip: size, side })
    : { x: 0, y: 0 }
  const isPlaced = size !== null
  const x = useGlide(position.x, isPlaced)
  const y = useGlide(position.y, isPlaced)
  const opacity = useFadeIn()
  const exiting = useFadeOut()
  const animated = useAnimatedStyle(() => ({
    opacity: isPlaced ? opacity.get() : 0,
    transform: [{ translateX: x.get() }, { translateY: y.get() }],
  }))

  return (
    <Animated.View
      data-slot="chart-tooltip"
      exiting={exiting}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={cn(
        "cn-chart-tooltip-positioner absolute top-0 left-0",
        className
      )}
      style={animated}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout
        setSize((current) =>
          current?.width === width && current.height === height
            ? current
            : { width, height }
        )
      }}
    >
      <View
        data-slot="chart-tooltip-content"
        className="cn-chart-tooltip-content"
      >
        <Text
          data-slot="chart-tooltip-title"
          className="cn-chart-tooltip-title"
        >
          {content.title}
        </Text>
        {content.rows.map((row) => (
          <View
            key={row.key}
            data-slot="chart-tooltip-row"
            className="cn-chart-tooltip-row flex-row items-center"
          >
            <View
              data-slot="chart-tooltip-key"
              data-dashed={row.dashed}
              className="cn-chart-tooltip-key flex-row justify-between"
              style={
                row.dashed
                  ? undefined
                  : { backgroundColor: getChartColor(row.paint, colors) }
              }
            >
              {row.dashed && (
                <DashedKey color={getChartColor(row.paint, colors)} />
              )}
            </View>
            <Text
              data-slot="chart-tooltip-label"
              numberOfLines={1}
              className="cn-chart-tooltip-label shrink"
            >
              {row.label}
            </Text>
            <Text
              data-slot="chart-tooltip-value"
              className="cn-chart-tooltip-value"
            >
              {row.value}
            </Text>
          </View>
        ))}
        {content.note ? (
          <Text
            data-slot="chart-tooltip-note"
            className="cn-chart-tooltip-note"
          >
            {content.note}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  )
}

/**
 * A dashed series' key: two short strokes, as its line is drawn. React
 * Native has no dashed fill, so the key draws the dashes itself.
 */
function DashedKey({ color }: { color: string }) {
  return (
    <>
      <View
        className="h-full w-1 rounded-full"
        style={{ backgroundColor: color }}
      />
      <View
        className="h-full w-1 rounded-full"
        style={{ backgroundColor: color }}
      />
    </>
  )
}

// --- Legend --------------------------------------------------------------------

/**
 * A toggle per series: a press hides or shows it, a long press spotlights it
 * until the finger lifts.
 */
function ChartLegend({
  series,
  hidden,
  onToggle,
  onSpotlight,
  colors,
  shape = "square",
  className,
}: {
  series: readonly ChartSeries[]
  hidden: ReadonlySet<string>
  onToggle: (key: string) => void
  onSpotlight: (key: string | null) => void
  colors: Record<string, string>
  shape?: "line" | "square"
  className?: string
}) {
  const feedback = useFeedback()
  return (
    <View
      data-slot="chart-legend"
      accessibilityLabel="Series"
      className={cn(
        "cn-chart-legend flex-row flex-wrap items-center",
        className
      )}
    >
      {series.map((item) => {
        const isHidden = hidden.has(item.key)
        return (
          <Pressable
            key={item.key}
            data-slot="chart-legend-item"
            data-hidden={isHidden}
            accessibilityRole="button"
            accessibilityState={{ selected: !isHidden }}
            accessibilityLabel={item.label}
            className="cn-chart-legend-item flex-row items-center"
            onPress={() => {
              feedback(isHidden ? "toggle-on" : "toggle-off")
              onToggle(item.key)
            }}
            onLongPress={() => {
              if (!isHidden) onSpotlight(item.key)
            }}
            onPressOut={() => onSpotlight(null)}
          >
            <View
              data-slot="chart-legend-key"
              data-shape={shape}
              data-hidden={isHidden}
              className="cn-chart-legend-key flex-row justify-between"
              style={
                isHidden
                  ? { borderColor: getChartColor(item.paint, colors) }
                  : item.dashed && shape === "line"
                    ? undefined
                    : { backgroundColor: getChartColor(item.paint, colors) }
              }
            >
              {item.dashed && shape === "line" && !isHidden && (
                <DashedKey color={getChartColor(item.paint, colors)} />
              )}
            </View>
            <Text data-hidden={isHidden} className="cn-chart-legend-label">
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// --- Inspector -----------------------------------------------------------------

const SCRUB_START = 8
const SCRUB_HOLD = 250

/**
 * The finger's and VoiceOver's way into the marks. A sideways drag scrubs
 * (after 8pt, so a vertical scroll still scrolls the page) and a tap picks
 * the nearest mark, each snap with a tick. To VoiceOver it is an adjustable
 * element: swipe up and down to step, its value reads the tooltip.
 * `scrub="hold"` starts the scrub after a press and hold instead, for a
 * chart inside a sideways scroller, whose drags must scroll. `getStep`
 * replaces the steps VoiceOver takes, as the keyboard's on the website.
 */
function ChartInspector({
  label,
  count,
  active,
  onActiveChange,
  getIndexAt,
  getStep = getSteppedIndex,
  scrub = "drag",
  valueText,
  className,
  ...props
}: Omit<ViewProps, "children"> & {
  label: string
  count: number
  active: number | null
  onActiveChange: (index: number | null) => void
  getIndexAt: (point: ChartPoint) => number
  /** Where a step moves the inspected mark, or null when it doesn't. */
  getStep?: (current: number, key: string, count: number) => number | null
  /** What starts a scrub: a sideways drag, or a press and hold. */
  scrub?: "drag" | "hold"
  valueText?: string
  className?: string
}) {
  const feedback = useFeedback()
  const last = React.useRef<number | null>(null)
  const isScrubbing = useSharedValue(false)
  const lastTickAt = React.useRef<number | null>(null)
  const pendingTick = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelPendingTick = React.useCallback(() => {
    if (pendingTick.current === null) return
    clearTimeout(pendingTick.current)
    pendingTick.current = null
  }, [])
  // Snaps closer than CHART_TICK_GAP skip their tick, and the mark the
  // finger comes to rest on gets it once the gap has passed.
  const tick = React.useCallback(
    (index: number) => {
      cancelPendingTick()
      const now = Date.now()
      const decision = getScrubTick(now, lastTickAt.current)
      if (decision.isPlayed) {
        lastTickAt.current = now
        feedback("tick")
        return
      }
      pendingTick.current = setTimeout(() => {
        pendingTick.current = null
        if (last.current !== index) return
        lastTickAt.current = Date.now()
        feedback("tick")
      }, decision.wait)
    },
    [cancelPendingTick, feedback]
  )
  React.useEffect(() => cancelPendingTick, [cancelPendingTick])

  const pick = React.useCallback(
    (x: number, y: number) => {
      const index = getIndexAt({ x, y })
      const next = index < 0 ? null : index
      // Every report re-renders the chart: a finger moving within one mark
      // reports nothing.
      if (next === last.current) return
      // Set first: a held tick checks the finger is still on its mark.
      last.current = next
      if (next !== null) tick(next)
      onActiveChange(next)
    },
    [getIndexAt, onActiveChange, tick]
  )
  // A tap pins the readout to the nearest mark; tapping that mark again lets
  // it go.
  const tapAt = React.useCallback(
    (x: number, y: number) => {
      const index = getIndexAt({ x, y })
      if (index < 0 || index === last.current) {
        last.current = null
        cancelPendingTick()
        lastTickAt.current = null
        onActiveChange(null)
        return
      }
      pick(x, y)
    },
    [cancelPendingTick, getIndexAt, onActiveChange, pick]
  )
  const release = React.useCallback(() => {
    last.current = null
    cancelPendingTick()
    lastTickAt.current = null
    onActiveChange(null)
  }, [cancelPendingTick, onActiveChange])

  const gesture = React.useMemo(() => {
    const start =
      scrub === "hold"
        ? Gesture.Pan().activateAfterLongPress(SCRUB_HOLD)
        : Gesture.Pan()
            .activeOffsetX([-SCRUB_START, SCRUB_START])
            .failOffsetY([-SCRUB_START, SCRUB_START])
    // The chain starts from a variable, which the Reanimated plugin doesn't
    // recognise as a gesture, so the callbacks name themselves worklets.
    const pan = start
      .onStart((event) => {
        "worklet"
        isScrubbing.set(true)
        runOnJS(pick)(event.x, event.y)
      })
      .onUpdate((event) => {
        "worklet"
        runOnJS(pick)(event.x, event.y)
      })
      .onFinalize(() => {
        "worklet"
        // Only a scrub lets go when the finger lifts.
        if (!isScrubbing.get()) return
        isScrubbing.set(false)
        runOnJS(release)()
      })
    const tap = Gesture.Tap().onEnd((event, isSuccess) => {
      if (isSuccess) runOnJS(tapAt)(event.x, event.y)
    })
    return Gesture.Race(pan, tap)
  }, [isScrubbing, pick, release, scrub, tapAt])

  return (
    <GestureDetector gesture={gesture}>
      <View
        data-slot="chart-inspector"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}: inspect values`}
        accessibilityValue={valueText ? { text: valueText } : undefined}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const key =
            event.nativeEvent.actionName === "increment"
              ? "ArrowRight"
              : "ArrowLeft"
          const next = getStep(active ?? -1, key, count)
          if (next === null) return
          // A later scrub compares with the last report, so this step counts.
          last.current = next
          onActiveChange(next)
        }}
        className={cn("cn-chart-inspector absolute inset-0", className)}
        {...props}
      />
    </GestureDetector>
  )
}

// --- Table and empty -------------------------------------------------------------

/**
 * The website's hidden table has no native counterpart: VoiceOver and
 * TalkBack read every value through the inspector instead, one mark at a
 * time. Kept so a chart's parts are the same on both platforms.
 */
function ChartDataTable(_props: { label: string; table: ChartTableData }) {
  return null
}

/**
 * A minimal chart's first and last labels under the plot, in place of an
 * axis: the range the marks cover.
 */
function ChartEnds({
  labels,
  className,
}: {
  labels: readonly string[]
  className?: string
}) {
  if (labels.length === 0) return null
  return (
    <View
      data-slot="chart-ends"
      aria-hidden
      className={cn("cn-chart-ends flex-row justify-between", className)}
    >
      <Text className="cn-chart-ends-text">{labels[0]}</Text>
      {labels.length > 1 && (
        <Text className="cn-chart-ends-text">{labels.at(-1)}</Text>
      )}
    </View>
  )
}

function ChartEmpty({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <View
      data-slot="chart-empty"
      className={cn(
        "cn-chart-empty absolute inset-0 items-center justify-center",
        className
      )}
    >
      {typeof children === "string" || children === undefined ? (
        <Text className="cn-chart-empty-text">{children ?? "No data"}</Text>
      ) : (
        children
      )}
    </View>
  )
}

export type {
  ChartActive,
  ChartColor,
  ChartConfig,
  ChartDatum,
  ChartSeriesConfig,
} from "@/registry/fabricator/shared/lib/chart-model"

export {
  ChartAxis,
  ChartBand,
  ChartCrosshair,
  ChartDataTable,
  ChartDimmable,
  ChartDot,
  ChartEmpty,
  ChartEnds,
  ChartFrame,
  ChartGrid,
  ChartInspector,
  ChartLabelPresence,
  ChartLegend,
  ChartRevealFade,
  ChartTooltip,
  getChartColor,
  useChartColors,
  useChartDrawOrder,
  useChartLegendState,
  useChartReveal,
  useChartRevealValue,
  useChartSize,
  useChartTween,
  useFadeIn,
  useFadeOut,
  useGlide,
}
