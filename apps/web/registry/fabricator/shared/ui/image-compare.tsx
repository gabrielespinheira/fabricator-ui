"use client"

import * as React from "react"
import { cn } from "cn"

import {
  createImageCompareMotion,
  getImageCompareCurve,
  getImageCompareKeyValue,
  getImageCompareLabelOpacity,
  getImageCompareMaxBend,
  getImageComparePosition,
  getImageCompareReleaseValue,
  getImageCompareValueAtPoint,
  getImageCompareValueText,
  getImageCompareVelocity,
  isImageCompareSettled,
  stepImageCompareMotion,
  type ImageCompareMotion,
  type ImageCompareMotionMode,
  type ImageComparePointerSample,
} from "@/registry/bases/__base__/lib/image-compare-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Two pictures of the same scene in one frame, split by a line you drag. The
// line is jelly: its ends chase the knob on a soft spring and the "before"
// picture is cut along the same curve. A click or a key glides the knob there;
// a flick sends it to that edge. It's a slider (WAI-ARIA), 0 to 100, the share
// of the frame the "before" picture holds.

/** Movement, in px, that turns a press into a drag. */
const DRAG_THRESHOLD = 3

type ImageCompareProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange" | "children"
> & {
  beforeSrc: string
  afterSrc: string
  beforeAlt?: string
  afterAlt?: string
  /** Names the "before" picture on its label and for screen readers. */
  beforeLabel?: string
  afterLabel?: string
  /** Show the labels over the pictures. */
  hasLabels?: boolean
  /** The share of the frame the "before" picture holds, from 0 to 100. */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** When a drag, a click or a key ends, with the value it landed on. */
  onValueCommitted?: (value: number) => void
  /** How far the arrow keys move the line. */
  step?: number
  disabled?: boolean
}

type ImageCompareGesture = {
  pointerId: number
  startX: number
  isDragging: boolean
  samples: ImageComparePointerSample[]
}

function isMotionStill(element: Element) {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    getComputedStyle(element).getPropertyValue("--motion-scale").trim() === "0"
  )
}

function getMotionScale(element: Element) {
  const scale = Number.parseFloat(
    getComputedStyle(element).getPropertyValue("--motion-scale")
  )
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

/**
 * Draws the line, the clip, the knob and the labels straight to the DOM on
 * animation frames, so a drag never waits for React. It owns the refs of the
 * parts it draws. `moveTo` sets where the knob is heading and how: a glide, or
 * a drag that follows the pointer.
 */
function useImageCompareDrawing(initialValue: number) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const beforeRef = React.useRef<HTMLDivElement>(null)
  const lineRef = React.useRef<SVGPathElement>(null)
  const handleRef = React.useRef<HTMLSpanElement>(null)
  const beforeLabelRef = React.useRef<HTMLSpanElement>(null)
  const afterLabelRef = React.useRef<HTMLSpanElement>(null)
  const state = React.useRef({
    width: 0,
    height: 0,
    labelCenters: { before: 0, after: 0 },
    target: initialValue,
    mode: "glide" as ImageCompareMotionMode,
    motion: null as ImageCompareMotion | null,
    frame: 0,
    last: 0,
  })

  const draw = React.useCallback(() => {
    const { motion, height, labelCenters } = state.current
    const before = beforeRef.current
    const line = lineRef.current
    const handle = handleRef.current
    if (!motion || !before || !line || !handle) return
    const curve = getImageCompareCurve(motion.knob, motion.ends, height)
    before.style.clipPath = `path("${curve.clip}")`
    line.setAttribute("d", curve.line)
    handle.style.left = `${motion.knob}px`
    const sides = [
      ["before", beforeLabelRef.current],
      ["after", afterLabelRef.current],
    ] as const
    for (const [side, label] of sides) {
      if (!label) continue
      label.style.opacity = String(
        getImageCompareLabelOpacity(side, motion.knob, labelCenters[side])
      )
    }
  }, [])

  const tick = React.useCallback(
    function tick(now: number) {
      const current = state.current
      const root = rootRef.current
      if (!root || !current.motion) return
      const delta = current.last ? (now - current.last) / 1000 : 1 / 60
      current.last = now
      const position = getImageComparePosition(current.target, current.width)
      current.motion = stepImageCompareMotion(current.motion, {
        target: position,
        mode: current.mode,
        delta: delta / getMotionScale(root),
        maxBend: getImageCompareMaxBend(current.width, current.height),
      })
      draw()
      current.frame = isImageCompareSettled(current.motion, position)
        ? 0
        : requestAnimationFrame(tick)
    },
    [draw]
  )

  const measure = React.useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const bounds = root.getBoundingClientRect()
    const current = state.current
    const getCenter = (label: HTMLSpanElement | null) =>
      label ? label.offsetLeft + label.offsetWidth / 2 : 0
    current.width = bounds.width
    current.height = bounds.height
    current.labelCenters = {
      before: getCenter(beforeLabelRef.current),
      after: getCenter(afterLabelRef.current),
    }
    const position = getImageComparePosition(current.target, bounds.width)
    // A resize jumps: there's no motion to show between two sizes.
    if (!current.frame) current.motion = createImageCompareMotion(position)
    draw()
  }, [draw])

  const moveTo = React.useCallback(
    (value: number, mode: ImageCompareMotionMode) => {
      const current = state.current
      const root = rootRef.current
      current.target = value
      current.mode = mode
      if (!root || !current.motion) return
      if (isMotionStill(root)) {
        cancelAnimationFrame(current.frame)
        current.frame = 0
        current.motion = createImageCompareMotion(
          getImageComparePosition(value, current.width)
        )
        draw()
        return
      }
      if (current.frame) return
      current.last = 0
      current.frame = requestAnimationFrame(tick)
    },
    [draw, tick]
  )

  React.useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    const current = state.current
    return () => {
      observer.disconnect()
      cancelAnimationFrame(current.frame)
      current.frame = 0
    }
  }, [measure])

  return {
    rootRef,
    beforeRef,
    lineRef,
    handleRef,
    beforeLabelRef,
    afterLabelRef,
    moveTo,
    measure,
  }
}

function ImageCompare({
  beforeSrc,
  afterSrc,
  beforeAlt = "",
  afterAlt = "",
  beforeLabel = "Before",
  afterLabel = "After",
  hasLabels = true,
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  onValueCommitted,
  step = 10,
  disabled = false,
  className,
  style,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  "aria-label": ariaLabel = "Compare images",
  ...props
}: ImageCompareProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const value = valueProp ?? uncontrolled
  // What the handlers read: a drag can change the value twice between renders.
  const latest = React.useRef(value)
  // The first paint, before the frame is measured; the drawing owns it after.
  const [initialValue] = React.useState(value)
  const [isDragging, setIsDragging] = React.useState(false)
  const gesture = React.useRef<ImageCompareGesture | null>(null)

  const {
    rootRef,
    beforeRef,
    lineRef,
    handleRef,
    beforeLabelRef,
    afterLabelRef,
    moveTo,
    measure,
  } = useImageCompareDrawing(value)
  React.useLayoutEffect(measure, [measure, hasLabels, beforeLabel, afterLabel])

  // A new value from the app, or from a key or a click, glides there. A drag
  // moves the knob itself, on the pointer's frames.
  React.useEffect(() => {
    latest.current = value
    if (!gesture.current?.isDragging) moveTo(value, "glide")
  }, [moveTo, value])

  const change = (next: number) => {
    const previous = latest.current
    latest.current = next
    if (valueProp === undefined) setUncontrolled(next)
    if (next !== previous) onValueChange?.(next)
  }

  const readValue = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return getImageCompareValueAtPoint(
      event.clientX - bounds.left,
      bounds.width
    )
  }

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return null
    gesture.current = null
    setIsDragging(false)
    return current
  }

  return (
    <div
      ref={(element) => {
        rootRef.current = element
        if (typeof ref === "function") return ref(element)
        if (ref) ref.current = element
      }}
      data-slot="image-compare"
      data-dragging={isDragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={getImageCompareValueText(value, beforeLabel, afterLabel)}
      aria-disabled={disabled || undefined}
      className={cn(
        "cn-image-compare group/image-compare relative isolate touch-pan-y overflow-hidden outline-none select-none",
        className
      )}
      style={style}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        if (event.defaultPrevented || disabled) return
        if (event.pointerType === "mouse" && event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        gesture.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          isDragging: false,
          samples: [{ x: event.clientX, time: event.timeStamp }],
        }
        const next = readValue(event)
        change(next)
        moveTo(next, "glide")
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event)
        const current = gesture.current
        if (!current || current.pointerId !== event.pointerId) return
        current.samples = [
          ...current.samples.slice(-7),
          { x: event.clientX, time: event.timeStamp },
        ]
        if (
          !current.isDragging &&
          Math.abs(event.clientX - current.startX) < DRAG_THRESHOLD
        )
          return
        if (!current.isDragging) {
          current.isDragging = true
          setIsDragging(true)
        }
        const next = readValue(event)
        change(next)
        moveTo(next, "drag")
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event)
        const current = endGesture(event)
        if (!current) return
        const velocity = current.isDragging
          ? getImageCompareVelocity(current.samples, event.timeStamp)
          : 0
        const next = getImageCompareReleaseValue(latest.current, velocity)
        change(next)
        moveTo(next, "glide")
        onValueCommitted?.(next)
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event)
        if (!endGesture(event)) return
        moveTo(latest.current, "glide")
        onValueCommitted?.(latest.current)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || disabled) return
        const next = getImageCompareKeyValue(event.key, latest.current, step)
        if (next === null) return
        event.preventDefault()
        change(next)
        moveTo(next, "glide")
        onValueCommitted?.(next)
      }}
      {...props}
    >
      <img
        data-slot="image-compare-image"
        data-side="after"
        src={afterSrc}
        alt={afterAlt}
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div
        ref={beforeRef}
        data-slot="image-compare-before"
        className="pointer-events-none absolute inset-0"
        // Until the frame is measured: a straight cut where the value is.
        style={{ clipPath: `inset(0 ${100 - initialValue}% 0 0)` }}
      >
        <img
          data-slot="image-compare-image"
          data-side="before"
          src={beforeSrc}
          alt={beforeAlt}
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      {hasLabels && (
        <>
          <span
            ref={beforeLabelRef}
            data-slot="image-compare-label"
            data-side="before"
            aria-hidden
            className="cn-image-compare-label pointer-events-none absolute"
          >
            {beforeLabel}
          </span>
          <span
            ref={afterLabelRef}
            data-slot="image-compare-label"
            data-side="after"
            aria-hidden
            className="cn-image-compare-label pointer-events-none absolute"
          >
            {afterLabel}
          </span>
        </>
      )}
      <svg
        aria-hidden
        className="cn-image-compare-line pointer-events-none absolute inset-0 size-full overflow-visible"
      >
        <path ref={lineRef} data-slot="image-compare-line" fill="none" />
      </svg>
      <span
        ref={handleRef}
        data-slot="image-compare-handle"
        aria-hidden
        className="cn-image-compare-handle pointer-events-none absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: `${initialValue}%` }}
      >
        <IconPlaceholder
          lucide="ChevronLeftIcon"
          tabler="IconChevronLeft"
          hugeicons="ArrowLeft01Icon"
          phosphor="CaretLeftIcon"
          remixicon="RiArrowLeftSLine"
        />
        <IconPlaceholder
          lucide="ChevronRightIcon"
          tabler="IconChevronRight"
          hugeicons="ArrowRight01Icon"
          phosphor="CaretRightIcon"
          remixicon="RiArrowRightSLine"
        />
      </span>
    </div>
  )
}

export { ImageCompare, type ImageCompareProps }
