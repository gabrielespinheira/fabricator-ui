import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type LayoutChangeEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from "react-native-reanimated"

import {
  canGoNext,
  canGoPrevious,
  getMaxScroll,
  getNearestSnap,
  getNextIndex,
  getPreviousIndex,
  getReleaseIndex,
  getScrollSnaps,
  getSlidesInView,
  type CarouselSnapOptions,
} from "@/registry/native/lib/carousel-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import { Button } from "@/registry/native/ui/button"
import { renderTextChildren } from "@/registry/native/ui/text"

// Embla's options and API on a pan gesture. The slides stay in a normal flex row
// that moves as one, so `basis-1/2` means half the viewport, as on the website.

type CarouselOptions = CarouselSnapOptions & {
  /** Wraps at the ends, rewinding to the other end. */
  loop?: boolean
  startIndex?: number
  dragFree?: boolean
  skipSnaps?: boolean
  /** Turns dragging off; the buttons and the API still work. */
  watchDrag?: boolean
}

type CarouselEvent =
  | "init"
  | "reInit"
  | "select"
  | "settle"
  | "pointerDown"
  | "pointerUp"

type CarouselCallback = (api: CarouselEngine, event: CarouselEvent) => void

type CarouselEngine = {
  scrollPrev: (jump?: boolean) => void
  scrollNext: (jump?: boolean) => void
  scrollTo: (index: number, jump?: boolean) => void
  canScrollPrev: () => boolean
  canScrollNext: () => boolean
  selectedScrollSnap: () => number
  previousScrollSnap: () => number
  /** Each snap as progress through the content, from 0 to 1. */
  scrollSnapList: () => number[]
  slidesInView: () => number[]
  on: (event: CarouselEvent, callback: CarouselCallback) => CarouselEngine
  off: (event: CarouselEvent, callback: CarouselCallback) => CarouselEngine
  reInit: (options?: CarouselOptions) => void
}

type CarouselApi = CarouselEngine | undefined

type CarouselPlugin = {
  name: string
  init: (api: CarouselEngine) => void
  destroy: () => void
}

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin[]
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: React.RefObject<React.ComponentRef<typeof View> | null>
  api: CarouselApi
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

// What the slides need from the engine, apart from the public API.
const CarouselLayoutContext = React.createContext<{
  pan: ReturnType<typeof Gesture.Pan>
  contentStyle: ReturnType<typeof useAnimatedStyle>
  slidesInView: readonly number[]
  setItemCount: (count: number) => void
  onViewportLayout: (event: LayoutChangeEvent) => void
  onContentLayout: (event: LayoutChangeEvent) => void
  onItemLayout: (index: number, event: LayoutChangeEvent) => void
} | null>(null)

const CarouselItemIndexContext = React.createContext(0)

function useCarousel() {
  const context = React.use(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function useCarouselLayout() {
  const context = React.use(CarouselLayoutContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<typeof View> & CarouselProps) {
  const isHorizontal = orientation === "horizontal"
  const motion = useMotion("move")
  const carouselRef = React.useRef<React.ComponentRef<typeof View>>(null)
  const position = useSharedValue(0)
  const start = useSharedValue(0)
  const maxScroll = useSharedValue(0)

  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)
  const [slidesInView, setSlidesInView] = React.useState<readonly number[]>([0])

  // Read from callbacks the API holds on to, so it stays one stable object.
  const latest = React.useRef({ opts, motion, isHorizontal })
  latest.current = { opts, motion, isHorizontal }

  const engine = React.useRef({
    index: opts?.startIndex ?? 0,
    previous: opts?.startIndex ?? 0,
    snaps: [0],
    itemCount: 0,
    viewport: 0,
    contentStart: 0,
    items: new Map<number, { offset: number; size: number }>(),
    isReady: false,
    listeners: new Map<CarouselEvent, Set<CarouselCallback>>(),
  })

  const { api, measure, release, emitPointer } = React.useMemo(() => {
    const state = engine.current

    const getLayout = () => {
      const offsets: number[] = []
      const sizes: number[] = []
      for (let index = 0; index < state.itemCount; index += 1) {
        const item = state.items.get(index)
        offsets.push(item?.offset ?? 0)
        // A slide's padding is cancelled by the content's negative margin, so
        // the slide's visible size is what's left of the margin.
        sizes.push((item?.size ?? 0) + state.contentStart)
      }
      return { offsets, sizes, viewport: state.viewport }
    }

    const sync = () => {
      const count = state.snaps.length
      const loop = latest.current.opts?.loop
      setCanScrollPrev(canGoPrevious(state.index, count, loop))
      setCanScrollNext(canGoNext(state.index, count, loop))
      setSlidesInView(
        getSlidesInView(getLayout(), state.snaps[state.index] ?? 0)
      )
    }

    const emit = (event: CarouselEvent) => {
      state.listeners.get(event)?.forEach((callback) => callback(result, event))
    }

    const goTo = (index: number, jump = false) => {
      const target = state.snaps[index]
      if (target === undefined) return
      if (index !== state.index) {
        state.previous = state.index
        state.index = index
        sync()
        emit("select")
      }
      const { motion: currentMotion } = latest.current
      if (jump || currentMotion.isOff) {
        position.value = target
        emit("settle")
        return
      }
      position.value = withTiming(
        target,
        {
          duration: currentMotion.enterMs,
          easing: currentMotion.moveEasing,
        },
        (isFinished) => {
          "worklet"
          if (isFinished) runOnJS(emit)("settle")
        }
      )
    }

    const measure = () => {
      if (state.itemCount === 0 || state.viewport === 0) return
      if (state.items.size < state.itemCount) return
      const layout = getLayout()
      const snaps = getScrollSnaps(layout, latest.current.opts)
      const isSame =
        snaps.length === state.snaps.length &&
        snaps.every((snap, index) => snap === state.snaps[index])
      if (isSame && state.isReady) return
      state.snaps = snaps
      state.index = Math.min(state.index, snaps.length - 1)
      maxScroll.value = getMaxScroll(layout)
      cancelAnimation(position)
      position.value = snaps[state.index] ?? 0
      sync()
      emit(state.isReady ? "reInit" : "init")
      state.isReady = true
    }

    const result: CarouselEngine = {
      scrollTo: goTo,
      scrollPrev(jump) {
        const loop = latest.current.opts?.loop
        goTo(getPreviousIndex(state.index, state.snaps.length, loop), jump)
      },
      scrollNext(jump) {
        const loop = latest.current.opts?.loop
        goTo(getNextIndex(state.index, state.snaps.length, loop), jump)
      },
      canScrollPrev: () =>
        canGoPrevious(
          state.index,
          state.snaps.length,
          latest.current.opts?.loop
        ),
      canScrollNext: () =>
        canGoNext(state.index, state.snaps.length, latest.current.opts?.loop),
      selectedScrollSnap: () => state.index,
      previousScrollSnap: () => state.previous,
      scrollSnapList() {
        const max = getMaxScroll(getLayout())
        return state.snaps.map((snap) => (max > 0 ? snap / max : 0))
      },
      slidesInView: () =>
        getSlidesInView(getLayout(), state.snaps[state.index] ?? 0),
      on(event, callback) {
        const callbacks = state.listeners.get(event) ?? new Set()
        callbacks.add(callback)
        state.listeners.set(event, callbacks)
        return result
      },
      off(event, callback) {
        state.listeners.get(event)?.delete(callback)
        return result
      },
      reInit() {
        state.isReady = false
        measure()
      },
    }

    return {
      api: result,
      measure,
      emitPointer: emit,
      release(at: number, velocity: number) {
        const { opts: currentOpts, motion: currentMotion } = latest.current
        if (currentOpts?.dragFree && !currentMotion.isOff) {
          const settle = () => {
            const nearest = getNearestSnap(state.snaps, position.value)
            if (nearest !== state.index) {
              state.previous = state.index
              state.index = nearest
              sync()
              emit("select")
            }
            emit("settle")
          }
          position.value = withDecay(
            { velocity, clamp: [0, maxScroll.value] },
            (isFinished) => {
              "worklet"
              if (isFinished) runOnJS(settle)()
            }
          )
          return
        }
        goTo(
          getReleaseIndex({
            snaps: state.snaps,
            index: state.index,
            position: at,
            velocity,
            loop: currentOpts?.loop,
            skipSnaps: currentOpts?.skipSnaps,
          })
        )
      },
    }
  }, [maxScroll, position])

  const internals = React.useMemo(() => {
    const state = engine.current
    return {
      setItemCount(count: number) {
        state.itemCount = count
        for (const index of state.items.keys()) {
          if (index >= count) state.items.delete(index)
        }
        measure()
      },
      onViewportLayout(event: LayoutChangeEvent) {
        const { width, height } = event.nativeEvent.layout
        state.viewport = latest.current.isHorizontal ? width : height
        measure()
      },
      onContentLayout(event: LayoutChangeEvent) {
        const { x, y } = event.nativeEvent.layout
        state.contentStart = latest.current.isHorizontal ? x : y
        measure()
      },
      onItemLayout(index: number, event: LayoutChangeEvent) {
        const { x, y, width, height } = event.nativeEvent.layout
        state.items.set(
          index,
          latest.current.isHorizontal
            ? { offset: x, size: width }
            : { offset: y, size: height }
        )
        measure()
      },
    }
  }, [measure])

  const canDrag = opts?.watchDrag !== false
  const pan = React.useMemo(() => {
    const gesture = Gesture.Pan().enabled(canDrag)
    const axis = isHorizontal
      ? gesture.activeOffsetX([-10, 10]).failOffsetY([-10, 10])
      : gesture.activeOffsetY([-10, 10]).failOffsetX([-10, 10])
    return axis
      .onBegin(() => {
        "worklet"
        cancelAnimation(position)
        start.value = position.value
        runOnJS(emitPointer)("pointerDown")
      })
      .onUpdate((event) => {
        "worklet"
        const next =
          start.value - (isHorizontal ? event.translationX : event.translationY)
        const max = maxScroll.value
        // Past an end it gives, at less than the finger's speed.
        const over = next < 0 ? next : next > max ? next - max : 0
        position.value = next - over * 0.6
      })
      .onEnd((event) => {
        "worklet"
        const velocity = isHorizontal ? event.velocityX : event.velocityY
        runOnJS(release)(position.value, -velocity)
      })
      .onFinalize((_event, isSuccess) => {
        "worklet"
        runOnJS(emitPointer)("pointerUp")
        // A touch that stopped a moving carousel still has to land on a snap.
        if (!isSuccess) runOnJS(release)(position.value, 0)
      })
  }, [canDrag, emitPointer, isHorizontal, maxScroll, position, release, start])

  const contentStyle = useAnimatedStyle(() => ({
    transform: isHorizontal
      ? [{ translateX: -position.value }]
      : [{ translateY: -position.value }],
  }))

  React.useEffect(() => {
    if (!setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    plugins?.forEach((plugin) => plugin.init(api))
    return () => plugins?.forEach((plugin) => plugin.destroy())
  }, [api, plugins])

  const context = React.useMemo(
    () => ({
      carouselRef,
      api,
      opts,
      orientation,
      scrollPrev: () => api.scrollPrev(),
      scrollNext: () => api.scrollNext(),
      canScrollPrev,
      canScrollNext,
    }),
    [api, canScrollNext, canScrollPrev, opts, orientation]
  )
  const layoutContext = React.useMemo(
    () => ({
      pan,
      contentStyle,
      slidesInView,
      setItemCount: internals.setItemCount,
      onViewportLayout: internals.onViewportLayout,
      onContentLayout: internals.onContentLayout,
      onItemLayout: internals.onItemLayout,
    }),
    [contentStyle, internals, pan, slidesInView]
  )

  return (
    <CarouselContext value={context}>
      <CarouselLayoutContext value={layoutContext}>
        <View
          data-slot="carousel"
          data-orientation={orientation}
          role="region"
          className={cn("relative", className)}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </CarouselLayoutContext>
    </CarouselContext>
  )
}

function CarouselContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { carouselRef, orientation } = useCarousel()
  const { pan, contentStyle, setItemCount, onViewportLayout, onContentLayout } =
    useCarouselLayout()
  const items = React.Children.toArray(children)
  const itemCount = items.length

  React.useLayoutEffect(() => {
    setItemCount(itemCount)
  }, [itemCount, setItemCount])

  return (
    <GestureDetector gesture={pan}>
      <View
        ref={carouselRef}
        data-slot="carousel-content"
        collapsable={false}
        onLayout={onViewportLayout}
        className="overflow-hidden"
      >
        <Animated.View
          onLayout={onContentLayout}
          className={cn(
            orientation === "horizontal" ? "-ml-4 flex-row" : "-mt-4 flex-col",
            className
          )}
          style={contentStyle}
          {...props}
        >
          {items.map((item, index) => (
            <CarouselItemIndexContext
              key={React.isValidElement(item) ? item.key : index}
              value={index}
            >
              {item}
            </CarouselItemIndexContext>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  )
}

function CarouselItem({
  className,
  children,
  onLayout,
  ...props
}: React.ComponentProps<typeof View>) {
  const { orientation } = useCarousel()
  const { slidesInView, onItemLayout } = useCarouselLayout()
  const index = React.use(CarouselItemIndexContext)

  return (
    <View
      role="group"
      data-slot="carousel-item"
      // Off-screen slides stay out of a screen reader's way.
      aria-hidden={!slidesInView.includes(index)}
      onLayout={(event) => {
        onItemLayout(index, event)
        onLayout?.(event)
      }}
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

const carouselPreviousWashVariants = cva("cn-carousel-previous-wash")
const carouselNextWashVariants = cva("cn-carousel-next-wash")

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon-sm",
  onPress,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()
  const feedback = useFeedback()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      accessibilityLabel="Previous slide"
      className={cn(
        "cn-carousel-previous absolute",
        orientation === "horizontal"
          ? "top-1/2 -left-12 mt-[calc(var(--density-36)/-2)]"
          : "-top-12 left-1/2 ml-[calc(var(--density-36)/-2)]",
        className
      )}
      washClassName={carouselPreviousWashVariants()}
      disabled={!canScrollPrev}
      onPress={(event) => {
        // Button's own sound waits a frame, so this one takes its place.
        feedback("whisk", { pitch: 0.92 })
        if (onPress) onPress(event)
        else scrollPrev()
      }}
      {...props}
    >
      {orientation === "horizontal" ? (
        <ChevronLeftIcon aria-hidden />
      ) : (
        <ChevronUpIcon aria-hidden />
      )}
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon-sm",
  onPress,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()
  const feedback = useFeedback()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      accessibilityLabel="Next slide"
      className={cn(
        "cn-carousel-next absolute",
        orientation === "horizontal"
          ? "top-1/2 -right-12 mt-[calc(var(--density-36)/-2)]"
          : "-bottom-12 left-1/2 ml-[calc(var(--density-36)/-2)]",
        className
      )}
      washClassName={carouselNextWashVariants()}
      disabled={!canScrollNext}
      onPress={(event) => {
        // Button's own sound waits a frame, so this one takes its place.
        feedback("whisk", { pitch: 1.08 })
        if (onPress) onPress(event)
        else scrollNext()
      }}
      {...props}
    >
      {orientation === "horizontal" ? (
        <ChevronRightIcon aria-hidden />
      ) : (
        <ChevronDownIcon aria-hidden />
      )}
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
}
