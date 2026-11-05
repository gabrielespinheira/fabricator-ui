// Fluid hover on touch: one highlight that glides to the row under the finger,
// and a selection background that slides between selected rows.
//
// The website finds rows by selector and follows a pointer. React Native has
// neither: each row registers through `useFluidRow`, and a finger takes the
// pointer's place. A press fades the highlight in where it lands; another press
// before it has faded glides there; and where `track` is set, dragging moves it
// from row to row with a tick on each, and letting go activates the lit row.
import * as React from "react"
import { useEffectEvent as useLatestCallback } from "@rn-primitives/hooks"
import { cn } from "cn"
import { ScrollView, View, type LayoutChangeEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

import { useFeedback } from "@/registry/native/lib/feedback"
import {
  getFadeOutDelay,
  isNearRows,
  pickNearestRow,
  sameRect,
  shouldGlide,
  type FluidAxis,
  type FluidRow,
  type Rect,
} from "@/registry/native/lib/fluid-hover-model"
import { useMotion } from "@/registry/native/lib/motion"

// A drag this far along the row's axis starts tracking, and across it gives way
// to whatever is underneath, so a strip inside a list still scrolls.
const TRACK_SLOP = 6
const CROSS_SLOP = 12
// Holding this long starts tracking in a list that also scrolls: a flick scrolls,
// and a slow tap stays a tap, since tracking taking over cancels the press.
const HOLD_TO_TRACK = 400
// Beyond this far from the rows, nothing is lit and letting go does nothing.
const RELEASE_SLOP = 32
// Rows in a list that scrolls wait this long to light, as iOS tables do: a finger
// that's starting a scroll doesn't flash the row it landed on. A tap still shows.
const SCROLL_PRESS_DELAY = 90
// The selection steps back while another row is lit: "current", against "next".
const DIMMED_SELECTION = 0.85

type OverlayValues = {
  x: SharedValue<number>
  y: SharedValue<number>
  width: SharedValue<number>
  height: SharedValue<number>
  opacity: SharedValue<number>
}

type MeasurableView = {
  measureLayout: (
    relativeTo: MeasurableView,
    onSuccess: (x: number, y: number, width: number, height: number) => void,
    onFail?: () => void
  ) => void
}

function isMeasurable(target: unknown): target is MeasurableView {
  return (
    typeof target === "object" && target !== null && "measureLayout" in target
  )
}

function useOverlayValues(): OverlayValues {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const width = useSharedValue(0)
  const height = useSharedValue(0)
  const opacity = useSharedValue(0)
  return { x, y, width, height, opacity }
}

function placeOverlay(
  overlay: OverlayValues,
  rect: Rect,
  travel: WithTimingConfig | null
) {
  "worklet"
  if (travel) {
    overlay.x.value = withTiming(rect.left, travel)
    overlay.y.value = withTiming(rect.top, travel)
    overlay.width.value = withTiming(rect.width, travel)
    overlay.height.value = withTiming(rect.height, travel)
    return
  }
  overlay.x.value = rect.left
  overlay.y.value = rect.top
  overlay.width.value = rect.width
  overlay.height.value = rect.height
}

export type FluidHoverOptions = {
  /** The key of the row that gets the sliding selection background. */
  selected?: string
  /** Which way the rows run: y for lists, x for strips, xy for grids. */
  axis?: FluidAxis
  /**
   * What a drag does. `drag` follows the finger at once, for strips and lists
   * that don't scroll. `hold` follows it after a short hold, so a list that
   * scrolls still scrolls. `none` leaves a drag to whatever is underneath.
   */
  track?: "none" | "drag" | "hold"
  /**
   * The highlight previews the next selection, as tabs' does: the selection dims
   * while another row is lit, and the highlight hides over the selected row.
   */
  previewsSelection?: boolean
}

type RowOptions = { disabled?: boolean; onActivate?: () => void }

export function useFluidHover({
  selected,
  axis = "y",
  track = "none",
  previewsSelection = false,
}: FluidHoverOptions = {}) {
  const glide = useMotion("glide")
  const move = useMotion("move")
  const feedback = useFeedback()
  const container = React.useRef<MeasurableView | null>(null)
  const rects = React.useRef(new Map<string, Rect>())
  const hosts = React.useRef(new Map<string, MeasurableView>())
  const remeasureFrame = React.useRef<number | null>(null)
  const rowOptions = React.useRef(new Map<string, RowOptions>())
  const selectionRect = React.useRef<Rect | null>(null)
  const pressedAt = React.useRef(0)
  const rows = useSharedValue<FluidRow[]>([])
  const litKey = useSharedValue<string | null>(null)
  const isTracking = useSharedValue(false)
  const hover = useOverlayValues()
  const selection = useOverlayValues()
  const [lit, setLit] = React.useState<string | null>(null)

  const glideTravel = React.useMemo(
    () =>
      glide.isReduced
        ? null
        : { duration: glide.enterMs, easing: glide.enterEasing },
    [glide.enterEasing, glide.enterMs, glide.isReduced]
  )
  // Reduce Motion drops the travel and keeps the fade, which Reanimated would
  // otherwise jump to its end.
  const fadeIn = React.useMemo(
    () => ({
      duration: glide.enterMs,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    }),
    [glide.enterMs]
  )
  const fadeOut = React.useMemo(
    () => ({
      duration: glide.exitMs,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    }),
    [glide.exitMs]
  )

  const syncRows = React.useCallback(() => {
    rows.value = Array.from(rects.current, ([key, rect]) => ({
      key,
      rect,
      disabled: rowOptions.current.get(key)?.disabled,
    }))
  }, [rows])

  // The selection appears at once, so a page never opens with its pill fading in,
  // and slides between rows on the move timing.
  const syncSelection = useLatestCallback(() => {
    const rect = selected ? (rects.current.get(selected) ?? null) : null
    const previous = selectionRect.current
    if (sameRect(previous, rect)) return
    selectionRect.current = rect
    if (!rect) {
      selection.opacity.value = withTiming(0, fadeOut)
      return
    }
    placeOverlay(
      selection,
      rect,
      shouldGlide(previous, rect) && !move.isReduced
        ? { duration: move.enterMs, easing: move.moveEasing }
        : null
    )
    selection.opacity.value = 1
  })

  React.useEffect(syncSelection, [selected, syncSelection])

  const storeRect = React.useCallback(
    (key: string, rect: Rect) => {
      if (sameRect(rects.current.get(key) ?? null, rect)) return
      rects.current.set(key, rect)
      syncRows()
      syncSelection()
    },
    [syncRows, syncSelection]
  )

  const measureRow = React.useCallback(
    (key: string, host: MeasurableView, onDone?: () => void) => {
      const root = container.current
      if (!root) {
        onDone?.()
        return
      }
      host.measureLayout(
        root,
        (left, top, width, height) => {
          storeRect(key, { top, left, width, height })
          onDone?.()
        },
        () => onDone?.()
      )
    },
    [storeRect]
  )

  // A row's own layout doesn't change when one above it hides or grows, so a
  // change to any row measures them all, once per frame.
  const remeasureRows = React.useCallback(() => {
    if (remeasureFrame.current !== null) return
    remeasureFrame.current = requestAnimationFrame(() => {
      remeasureFrame.current = null
      for (const [key, host] of hosts.current) measureRow(key, host)
    })
  }, [measureRow])

  React.useEffect(
    () => () => {
      if (remeasureFrame.current !== null) {
        cancelAnimationFrame(remeasureFrame.current)
      }
    },
    []
  )

  const register = React.useCallback(
    (key: string, options: RowOptions) => {
      rowOptions.current.set(key, options)
      syncRows()
    },
    [syncRows]
  )

  const unregister = React.useCallback(
    (key: string) => {
      rowOptions.current.delete(key)
      rects.current.delete(key)
      hosts.current.delete(key)
      syncRows()
      syncSelection()
      remeasureRows()
    },
    [remeasureRows, syncRows, syncSelection]
  )

  React.useEffect(() => {
    if (!previewsSelection || !selectionRect.current) return
    selection.opacity.value = withTiming(
      lit !== null && lit !== selected ? DIMMED_SELECTION : 1,
      fadeIn
    )
  }, [fadeIn, lit, previewsSelection, selected, selection])

  const light = React.useCallback(
    (key: string) => {
      if (rowOptions.current.get(key)?.disabled) return
      const rect = rects.current.get(key)
      if (!rect) return
      pressedAt.current = Date.now()
      setLit(key)
      // Still fading from the last press: glide from there. Otherwise appear.
      placeOverlay(hover, rect, hover.opacity.value > 0.01 ? glideTravel : null)
      hover.opacity.value = withTiming(
        previewsSelection && key === selected ? 0 : 1,
        fadeIn
      )
    },
    [fadeIn, glideTravel, hover, previewsSelection, selected]
  )

  const release = React.useCallback(() => {
    setLit(null)
    const delay = getFadeOutDelay(Date.now() - pressedAt.current, glide.enterMs)
    hover.opacity.value = withDelay(delay, withTiming(0, fadeOut))
  }, [fadeOut, glide.enterMs, hover])

  const getItemProps = React.useCallback(
    (key: string) => ({
      onLayout: (event: LayoutChangeEvent) => {
        const { x, y, width, height } = event.nativeEvent.layout
        const target = event.target
        if (!container.current || !isMeasurable(target)) {
          storeRect(key, { top: y, left: x, width, height })
          return
        }
        hosts.current.set(key, target)
        remeasureRows()
      },
      onPressIn: () => {
        // Fresh: the row may have moved since it was last measured.
        const host = hosts.current.get(key)
        if (!host) {
          light(key)
          return
        }
        measureRow(key, host, () => light(key))
      },
      onPressOut: () => {
        // The gesture took over this touch, and owns the highlight until it ends.
        if (!isTracking.value) release()
      },
      onHoverIn: () => light(key),
      onHoverOut: () => release(),
    }),
    [isTracking, light, measureRow, release, remeasureRows, storeRect]
  )

  const activate = useLatestCallback((key: string) => {
    rowOptions.current.get(key)?.onActivate?.()
  })

  const handleTrackChange = useLatestCallback((key: string | null) => {
    setLit(key)
    if (key) feedback("tick")
  })

  const gesture = React.useMemo(() => {
    const trackTo = (point: { x: number; y: number }) => {
      "worklet"
      const list = rows.value
      const next = isNearRows(list, point, RELEASE_SLOP)
        ? pickNearestRow(list, point, axis)
        : null
      if (next === litKey.value) return
      litKey.value = next
      scheduleOnRN(handleTrackChange, next)
      const rect = next ? list.find((row) => row.key === next)?.rect : null
      if (!rect) {
        hover.opacity.value = withTiming(0, fadeOut)
        return
      }
      placeOverlay(hover, rect, hover.opacity.value > 0.01 ? glideTravel : null)
      hover.opacity.value = withTiming(
        previewsSelection && next === selected ? 0 : 1,
        fadeIn
      )
    }
    const slop: [number, number] = [-TRACK_SLOP, TRACK_SLOP]
    const crossSlop: [number, number] = [-CROSS_SLOP, CROSS_SLOP]
    const base = Gesture.Pan()
      .enabled(track !== "none")
      .shouldCancelWhenOutside(false)
    const configured =
      track === "hold"
        ? base.activateAfterLongPress(HOLD_TO_TRACK)
        : axis === "x"
          ? base.activeOffsetX(slop).failOffsetY(crossSlop)
          : axis === "y"
            ? base.activeOffsetY(slop).failOffsetX(crossSlop)
            : base.minDistance(TRACK_SLOP)
    return configured
      .onStart((event) => {
        "worklet"
        isTracking.value = true
        trackTo({ x: event.x, y: event.y })
      })
      .onUpdate((event) => {
        "worklet"
        trackTo({ x: event.x, y: event.y })
      })
      .onEnd((_event, success) => {
        "worklet"
        const key = litKey.value
        if (success && key) scheduleOnRN(activate, key)
      })
      .onFinalize(() => {
        "worklet"
        if (!isTracking.value) return
        isTracking.value = false
        litKey.value = null
        scheduleOnRN(handleTrackChange, null)
        hover.opacity.value = withTiming(0, fadeOut)
      })
  }, [
    activate,
    axis,
    fadeIn,
    fadeOut,
    glideTravel,
    handleTrackChange,
    hover,
    isTracking,
    litKey,
    previewsSelection,
    rows,
    selected,
    track,
  ])

  const attach = React.useCallback((node: unknown) => {
    container.current = isMeasurable(node) ? node : null
  }, [])

  return React.useMemo(
    () => ({
      /** Ref callback for the container that holds the rows. */
      attach,
      /** Wraps the container through FluidHoverArea. */
      gesture,
      isTrackable: track !== "none",
      pressDelay: track === "drag" ? 0 : SCROLL_PRESS_DELAY,
      getItemProps,
      register,
      unregister,
      /** Measures every row again, for when something moved them. */
      remeasure: remeasureRows,
      /** The lit row's key, for what styles a lit row. */
      lit,
      hover,
      selection,
    }),
    [
      attach,
      gesture,
      getItemProps,
      hover,
      lit,
      register,
      remeasureRows,
      selection,
      track,
      unregister,
    ]
  )
}

type FluidHover = ReturnType<typeof useFluidHover>

const FluidHoverContext = React.createContext<FluidHover | null>(null)

/** Lets the rows inside find their container. */
function FluidHoverProvider({
  fluid,
  children,
}: {
  fluid: FluidHover
  children?: React.ReactNode
}) {
  return <FluidHoverContext value={fluid}>{children}</FluidHoverContext>
}

/**
 * A row in the nearest container. Spread `rowProps` on its Pressable. Outside a
 * container it passes the handlers through, so the row still works alone.
 */
function useFluidRow<
  TLayout extends LayoutChangeEvent = LayoutChangeEvent,
  TPress = unknown,
  THover = unknown,
>({
  itemKey,
  disabled,
  onActivate,
  onLayout,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
}: {
  /** A stable key, when the row has one. Otherwise it gets its own. */
  itemKey?: string
  disabled?: boolean | null
  /** What letting go over this row does, after a drag. */
  onActivate?: () => void
  onLayout?: ((event: TLayout) => void) | null
  onPressIn?: ((event: TPress) => void) | null
  onPressOut?: ((event: TPress) => void) | null
  onHoverIn?: ((event: THover) => void) | null
  onHoverOut?: ((event: THover) => void) | null
} = {}) {
  const fluid = React.use(FluidHoverContext)
  const id = React.useId()
  const key = itemKey ?? id
  const activate = useLatestCallback(() => onActivate?.())
  const isDisabled = Boolean(disabled)
  const register = fluid?.register
  const unregister = fluid?.unregister
  React.useEffect(() => {
    register?.(key, { disabled: isDisabled, onActivate: activate })
  }, [activate, isDisabled, key, register])
  React.useEffect(() => () => unregister?.(key), [key, unregister])
  const item = fluid?.getItemProps(key)
  return {
    key,
    isLit: fluid?.lit === key,
    /** Measures the rows again, when this one moved without its layout changing. */
    remeasure: fluid?.remeasure,
    rowProps: {
      unstable_pressDelay: fluid?.pressDelay,
      onLayout: (event: TLayout) => {
        item?.onLayout(event)
        onLayout?.(event)
      },
      onPressIn: (event: TPress) => {
        item?.onPressIn()
        onPressIn?.(event)
      },
      onPressOut: (event: TPress) => {
        item?.onPressOut()
        onPressOut?.(event)
      },
      onHoverIn: (event: THover) => {
        item?.onHoverIn()
        onHoverIn?.(event)
      },
      onHoverOut: (event: THover) => {
        item?.onHoverOut()
        onHoverOut?.(event)
      },
    },
  }
}

/** Measures the nearest container's rows again, for what moves them all. */
function useFluidRemeasure() {
  return React.use(FluidHoverContext)?.remeasure
}

/** Follows the finger, where the container's `track` asks for it. */
function FluidHoverArea({
  fluid,
  children,
}: {
  fluid: FluidHover
  children: React.ReactElement
}) {
  if (!fluid.isTrackable) return children
  return <GestureDetector gesture={fluid.gesture}>{children}</GestureDetector>
}

function FluidHoverOverlay({
  overlay,
  className,
  style,
  ...props
}: {
  overlay: OverlayValues
} & React.ComponentProps<typeof Animated.View>) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: overlay.opacity.value,
    width: overlay.width.value,
    height: overlay.height.value,
    transform: [
      { translateX: overlay.x.value },
      { translateY: overlay.y.value },
    ],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={cn("absolute top-0 left-0", className)}
      style={[animatedStyle, style]}
      {...props}
    />
  )
}

/** The hover highlight. Render it as the first child of the container. */
function FluidHoverHighlight({
  hover,
  className,
  ...props
}: { hover: OverlayValues } & React.ComponentProps<typeof Animated.View>) {
  return (
    <FluidHoverOverlay
      overlay={hover}
      data-slot="fluid-hover-highlight"
      className={cn("cn-fluid-hover-highlight", className)}
      {...props}
    />
  )
}

/** The selection background. Render it before the highlight. */
function FluidHoverSelection({
  selection,
  className,
  ...props
}: { selection: OverlayValues } & React.ComponentProps<typeof Animated.View>) {
  return (
    <FluidHoverOverlay
      overlay={selection}
      data-slot="fluid-hover-selection"
      className={cn("cn-fluid-hover-selection", className)}
      {...props}
    />
  )
}

/**
 * The usual container: a view that holds the rows, its highlight and its finger.
 * Rows inside use `useFluidRow`.
 */
function FluidHoverList({
  axis,
  track,
  selected,
  highlightClassName,
  selectionClassName,
  className,
  children,
  ...props
}: FluidHoverOptions & {
  highlightClassName?: string
  selectionClassName?: string
} & React.ComponentProps<typeof View>) {
  const fluid = useFluidHover({ axis, track, selected })
  const { attach } = fluid
  const attachContainer = React.useCallback(
    (node: unknown) => attach(node),
    [attach]
  )
  return (
    <FluidHoverProvider fluid={fluid}>
      <FluidHoverArea fluid={fluid}>
        <View
          ref={attachContainer}
          data-slot="fluid-hover-list"
          className={cn("relative", className)}
          {...props}
        >
          {selected === undefined ? null : (
            <FluidHoverSelection
              selection={fluid.selection}
              className={selectionClassName}
            />
          )}
          <FluidHoverHighlight
            hover={fluid.hover}
            className={highlightClassName}
          />
          {children}
        </View>
      </FluidHoverArea>
    </FluidHoverProvider>
  )
}

/**
 * A list in a scroll view, for a menu or a picker: a drag follows the finger while
 * everything fits, and takes a short hold once it scrolls, so a flick still does.
 * `ScrollComponent` takes a sheet's own scroll view.
 */
function FluidHoverScrollList({
  ScrollComponent = ScrollView,
  selected,
  listClassName,
  highlightClassName,
  selectionClassName,
  onLayout,
  onContentSizeChange,
  children,
  ...props
}: Pick<FluidHoverOptions, "selected"> & {
  ScrollComponent?: React.ComponentType<React.ComponentProps<typeof ScrollView>>
  listClassName?: string
  highlightClassName?: string
  selectionClassName?: string
} & React.ComponentProps<typeof ScrollView>) {
  const [viewport, setViewport] = React.useState(0)
  const [content, setContent] = React.useState(0)
  return (
    <ScrollComponent
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
      onLayout={(event) => {
        setViewport(event.nativeEvent.layout.height)
        onLayout?.(event)
      }}
      onContentSizeChange={(width, height) => {
        setContent(height)
        onContentSizeChange?.(width, height)
      }}
      {...props}
    >
      <FluidHoverList
        axis="y"
        track={content > viewport + 1 ? "hold" : "drag"}
        selected={selected}
        className={listClassName}
        highlightClassName={highlightClassName}
        selectionClassName={selectionClassName}
      >
        {children}
      </FluidHoverList>
    </ScrollComponent>
  )
}

export {
  FluidHoverArea,
  FluidHoverHighlight,
  FluidHoverList,
  FluidHoverProvider,
  FluidHoverScrollList,
  FluidHoverSelection,
  useFluidRemeasure,
  useFluidRow,
}
