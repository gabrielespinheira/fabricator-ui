"use client"

// Time Wheel: hours, minutes, optional seconds and AM/PM as scroll wheels, as
// in the iOS Clock app. Each column is a drum the rows sit round: drag, flick,
// scroll or tap it, and it comes to rest with a row on the band across the
// middle, which is the value. Hours, minutes and seconds loop, so 59 runs on
// into 00; AM/PM stops at its ends. The drum is drawn twice, muted and in the
// foreground clipped to the band, so a row changes colour exactly as it
// crosses the band's edge. Under reduced motion the rows lie flat and jump.
// Each column is a spinbutton: arrow keys step it, Page Up and Page Down jump,
// Home and End go to the ends. Values are "HH:mm" or "HH:mm:ss"; the rules
// are in lib/time-input-model, the drum's in lib/time-wheel-model.
import * as React from "react"
import { cn } from "cn"

import {
  getCriticalSpring,
  isSpringAtRest,
  resolveSpring,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from "@/registry/bases/__base__/lib/spring-model"
import {
  clampTime,
  fromHour12,
  getHourValues,
  getMinuteValues,
  getTimeOfDay,
  joinTime,
  splitTime,
  toHour12,
  type HourCycle,
  type TimeParts,
} from "@/registry/bases/__base__/lib/time-input-model"
import {
  clampWheelPosition,
  getCoastPosition,
  getDrumTransform,
  getFlickTarget,
  getKeyTarget,
  getLoopedIndex,
  getNearestTurn,
  getRowTransform,
  getTapRows,
  getVisibleRows,
  getWheelGeometry,
  getWheelIndex,
  getWheelOverscroll,
  type WheelGeometry,
} from "@/registry/bases/__base__/lib/time-wheel-model"

type WheelItem = { value: number; text: string }

type WheelMotion =
  | { kind: "spring"; state: SpringState; target: number; spring: SpringConfig }
  | {
      kind: "coast"
      from: number
      target: number
      velocity: number
      startedAt: number
    }

type WheelDrag = {
  pointerId: number
  startY: number
  startPosition: number
  hasMoved: boolean
  samples: { time: number; position: number }[]
}

// Pointer travel before a press becomes a drag, in pixels.
const TAP_SLOP = 4
// Release speed is measured over the drag's last moments.
const VELOCITY_WINDOW = 80
// Slower than this, in rows a second, a release places rather than flicks.
const MIN_FLICK_SPEED = 2
// Pixels of mouse wheel or trackpad travel per row.
const WHEEL_PIXELS_PER_ROW = 60
const WHEEL_SETTLE_DELAY = 120

const pad = (value: number) => String(value).padStart(2, "0")

function getIsFlat() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "off"
  )
}

/** The settle spring from the motion tokens; null when motion is off. */
function readSettleSpring(element: HTMLElement) {
  if (getIsFlat()) return null
  const style = getComputedStyle(element)
  return resolveSpring(
    style.getPropertyValue("--motion-spring-settle"),
    style.getPropertyValue("--motion-scale")
  )
}

function TimeWheelDrum({
  rows,
  items,
  geometry,
  isFlat,
  isSelected,
  drumRef,
}: {
  rows: number[]
  items: WheelItem[]
  geometry: WheelGeometry
  isFlat: boolean
  isSelected?: boolean
  drumRef: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      data-slot="time-wheel-layer"
      data-selected={isSelected || undefined}
      className="cn-time-wheel-layer pointer-events-none absolute inset-0"
    >
      <div
        ref={drumRef}
        className="absolute inset-x-0 top-1/2 [transform-style:preserve-3d]"
      >
        {rows.map((row) => (
          <div
            key={row}
            data-slot="time-wheel-item"
            className="cn-time-wheel-item absolute inset-x-0 flex items-center justify-center"
            style={{ transform: getRowTransform(row, geometry, isFlat) }}
          >
            {items[getLoopedIndex(row, items.length)]?.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimeWheelColumn({
  label,
  items,
  value,
  isLooping = true,
  pageSize = 5,
  onValueChange,
}: {
  label: string
  items: WheelItem[]
  value: number
  isLooping?: boolean
  pageSize?: number
  onValueChange: (value: number) => void
}) {
  const count = items.length
  const index = getWheelIndex(
    items.map((item) => item.value),
    value
  )
  const item = items[index]

  const columnRef = React.useRef<HTMLDivElement>(null)
  const sizerRef = React.useRef<HTMLDivElement>(null)
  const mutedDrumRef = React.useRef<HTMLDivElement>(null)
  const selectedDrumRef = React.useRef<HTMLDivElement>(null)
  const position = React.useRef(index)
  const motion = React.useRef<WheelMotion | null>(null)
  const frame = React.useRef<number>(undefined)
  const drag = React.useRef<WheelDrag | null>(null)
  const [center, setCenter] = React.useState(index)
  const [geometry, setGeometry] = React.useState<WheelGeometry | null>(null)
  const [isFlat, setIsFlat] = React.useState(false)

  // The drum's size follows the column's: a parent can make the wheel as
  // tall as it likes, and density changes the rows.
  React.useLayoutEffect(() => {
    const column = columnRef.current
    const sizer = sizerRef.current
    if (!column || !sizer) return
    const measure = () => {
      setIsFlat(getIsFlat())
      setGeometry(getWheelGeometry(column.clientHeight, sizer.offsetHeight))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(column)
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMotion.addEventListener("change", measure)
    return () => {
      observer.disconnect()
      reducedMotion.removeEventListener("change", measure)
    }
  }, [])

  // One style write per layer a frame: the whole drum turns.
  const paint = React.useCallback(
    (next: number) => {
      position.current = next
      if (geometry) {
        const transform = getDrumTransform(next, geometry, isFlat)
        if (mutedDrumRef.current)
          mutedDrumRef.current.style.transform = transform
        if (selectedDrumRef.current)
          selectedDrumRef.current.style.transform = transform
      }
      setCenter(Math.round(next))
    },
    [geometry, isFlat]
  )

  React.useLayoutEffect(() => paint(position.current), [paint])

  const latest = React.useRef({ items, value, onValueChange })
  React.useLayoutEffect(() => {
    latest.current = { items, value, onValueChange }
  })

  // The row on the band becomes the value.
  const commit = React.useCallback((target: number) => {
    const { items, value, onValueChange } = latest.current
    const next = items[getLoopedIndex(target, items.length)]
    if (next && next.value !== value) onValueChange(next.value)
  }, [])

  const stop = React.useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = undefined
    motion.current = null
  }, [])

  // Plays a spring or a coast a frame at a time until it arrives.
  const start = React.useCallback(
    (next: WheelMotion) => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      motion.current = next
      let lastFrameAt = performance.now()
      const step = (time: number) => {
        const current = motion.current
        if (!current) return
        const elapsed = (time - lastFrameAt) / 1000
        lastFrameAt = time
        if (current.kind === "coast") {
          const coast = getCoastPosition(
            current.from,
            current.target,
            current.velocity,
            (time - current.startedAt) / 1000
          )
          paint(coast.position)
          if (coast.isDone) return stop()
        } else {
          current.state = stepSpring(
            current.state,
            current.target,
            current.spring,
            elapsed
          )
          if (isSpringAtRest(current.state, current.target)) {
            paint(current.target)
            return stop()
          }
          paint(current.state.value)
        }
        frame.current = requestAnimationFrame(step)
      }
      frame.current = requestAnimationFrame(step)
    },
    [paint, stop]
  )

  /**
   * Turns the drum to `target` on the settle spring, keeping the speed it
   * already has; at once when motion is off.
   */
  const turnTo = React.useCallback(
    (target: number, { velocity = 0, canOvershoot = false } = {}) => {
      const column = columnRef.current
      const spring = column && readSettleSpring(column)
      if (!spring) {
        stop()
        return paint(target)
      }
      const current = motion.current
      start({
        kind: "spring",
        target,
        spring: canOvershoot ? spring : getCriticalSpring(spring),
        state: {
          value: position.current,
          velocity:
            current?.kind === "spring" ? current.state.velocity : velocity,
        },
      })
    },
    [paint, start, stop]
  )

  React.useEffect(() => stop, [stop])

  // A value from outside (typed, clamped to a range, another column) turns
  // the drum, the short way round. A turn already heading there carries on.
  React.useEffect(() => {
    if (drag.current) return
    const heading = motion.current?.target ?? position.current
    if (getLoopedIndex(heading, count) === index) return
    turnTo(getNearestTurn(heading, index, count, isLooping))
  }, [index, count, isLooping, turnTo])

  // Mouse wheels and trackpads turn the drum, which settles on a row once
  // they stop. React's wheel listener is passive, so this one is attached here.
  const wheel = React.useRef({ count, isLooping, turnTo, commit, stop, paint })
  React.useLayoutEffect(() => {
    wheel.current = { count, isLooping, turnTo, commit, stop, paint }
  })
  React.useEffect(() => {
    const column = columnRef.current
    if (!column) return
    let timer: number | undefined
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const { count, isLooping, stop, paint } = wheel.current
      const rows =
        event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
          ? event.deltaY / WHEEL_PIXELS_PER_ROW
          : Math.sign(event.deltaY)
      const from = position.current
      stop()
      paint(
        isLooping
          ? from + rows
          : Math.min(Math.max(from + rows, -0.4), count - 1 + 0.4)
      )
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const { count, isLooping, turnTo, commit } = wheel.current
        const target = clampWheelPosition(
          Math.round(position.current),
          count,
          isLooping
        )
        turnTo(target)
        commit(target)
      }, WHEEL_SETTLE_DELAY)
    }
    column.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      column.removeEventListener("wheel", onWheel)
      window.clearTimeout(timer)
    }
  }, [])

  function release(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId || !geometry) return
    drag.current = null
    // A press that didn't move: turn to the row under it.
    if (!current.hasMoved) {
      if (event.type !== "pointerup") return
      const bounds = event.currentTarget.getBoundingClientRect()
      const offsetY = event.clientY - (bounds.top + bounds.height / 2)
      const target = clampWheelPosition(
        Math.round(position.current) + getTapRows(offsetY, geometry, isFlat),
        count,
        isLooping
      )
      turnTo(target)
      return commit(target)
    }
    const first = current.samples[0]
    const last = current.samples.at(-1) ?? first
    const seconds = first && last ? (last.time - first.time) / 1000 : 0
    // Holding still before letting go places the row rather than flicks it.
    const isHeld = !last || event.timeStamp - last.time > VELOCITY_WINDOW
    const velocity =
      first && last && seconds > 0 && !isHeld
        ? (last.position - first.position) / seconds
        : 0
    const from = position.current
    const isPastEnd = !isLooping && (from < 0 || from > count - 1)
    if (Math.abs(velocity) < MIN_FLICK_SPEED || isPastEnd || isFlat) {
      const target = clampWheelPosition(Math.round(from), count, isLooping)
      turnTo(target, { velocity })
      return commit(target)
    }
    const target = getFlickTarget(from, velocity, count, isLooping)
    // Running out of rows, the flick bounces off the end instead.
    const runsOut = !isLooping && Math.round(from + velocity * 0.3) !== target
    if (runsOut || !readSettleSpring(event.currentTarget)) {
      turnTo(target, { velocity, canOvershoot: true })
    } else {
      start({
        kind: "coast",
        from,
        target,
        velocity,
        startedAt: performance.now(),
      })
    }
    commit(target)
  }

  const rows = geometry
    ? getVisibleRows(center, geometry.reach, count, isLooping)
    : []

  return (
    <div
      ref={columnRef}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={item?.value}
      aria-valuemin={items[0]?.value}
      aria-valuemax={items.at(-1)?.value}
      aria-valuetext={item?.text}
      data-slot="time-wheel-column"
      className="cn-time-wheel-column relative touch-none outline-none select-none"
      onPointerDown={(event) => {
        if (drag.current) return
        if (event.pointerType === "mouse" && event.button !== 0) return
        stop()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startPosition: position.current,
          hasMoved: false,
          samples: [{ time: event.timeStamp, position: position.current }],
        }
      }}
      onPointerMove={(event) => {
        const current = drag.current
        if (!current || current.pointerId !== event.pointerId || !geometry)
          return
        const distance = event.clientY - current.startY
        if (!current.hasMoved && Math.abs(distance) < TAP_SLOP) return
        current.hasMoved = true
        const next = current.startPosition - distance / geometry.rowHeight
        paint(getWheelOverscroll(next, count, isLooping))
        current.samples.push({ time: event.timeStamp, position: next })
        while (
          current.samples.length > 2 &&
          event.timeStamp - (current.samples[0]?.time ?? 0) > VELOCITY_WINDOW
        ) {
          current.samples.shift()
        }
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(event) => {
        const from = motion.current?.target ?? position.current
        const target = getKeyTarget(event.key, from, count, isLooping, pageSize)
        if (target === null) return
        event.preventDefault()
        turnTo(target)
        commit(target)
      }}
    >
      <div
        ref={sizerRef}
        aria-hidden
        className="cn-time-wheel-item invisible absolute"
      />
      {geometry && (
        <div aria-hidden className="cn-time-wheel-drum absolute inset-0">
          <TimeWheelDrum
            rows={rows}
            items={items}
            geometry={geometry}
            isFlat={isFlat}
            drumRef={mutedDrumRef}
          />
          <TimeWheelDrum
            rows={rows}
            items={items}
            geometry={geometry}
            isFlat={isFlat}
            isSelected
            drumRef={selectedDrumRef}
          />
        </div>
      )}
    </div>
  )
}

function TimeWheel({
  value,
  onValueChange,
  hourCycle,
  hasSeconds = false,
  step = 1,
  minTime,
  maxTime,
  label = "Time",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue"> & {
  /** "HH:mm" or "HH:mm:ss". Without one, the wheel shows now. */
  value: string | undefined
  onValueChange: (value: string) => void
  hourCycle: HourCycle
  hasSeconds?: boolean
  /** Minutes between the minute wheel's rows. */
  step?: number
  minTime?: string
  maxTime?: string
  label?: string
}) {
  const [now] = React.useState(() => getTimeOfDay(new Date()))
  const parts = splitTime(value ?? now)
  const { hour, meridiem } = toHour12(parts.hours)

  const hourItems = React.useMemo(
    () =>
      getHourValues(hourCycle).map((hours) => ({
        value: hours,
        text: hourCycle === 12 ? String(hours) : pad(hours),
      })),
    [hourCycle]
  )
  const minuteItems = React.useMemo(
    () =>
      getMinuteValues(step).map((minutes) => ({
        value: minutes,
        text: pad(minutes),
      })),
    [step]
  )
  const secondItems = React.useMemo(
    () =>
      getMinuteValues(1).map((seconds) => ({
        value: seconds,
        text: pad(seconds),
      })),
    []
  )
  const meridiemItems = React.useMemo(
    () => [
      { value: 0, text: "AM" },
      { value: 1, text: "PM" },
    ],
    []
  )

  // Columns settle one at a time, each from the value it last saw: merge into
  // the newest time so one column's change doesn't undo another's.
  const latestParts = React.useRef(parts)
  React.useLayoutEffect(() => {
    latestParts.current = parts
  })

  function change(next: Partial<TimeParts>) {
    const merged = { ...latestParts.current, ...next }
    latestParts.current = merged
    const time = joinTime(merged, { hasSeconds })
    onValueChange(clampTime(time, { minTime, maxTime }))
  }

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="time-wheel"
      className={cn("cn-time-wheel relative flex justify-center", className)}
      {...props}
    >
      <div
        aria-hidden
        data-slot="time-wheel-band"
        className="cn-time-wheel-band pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
      />
      <TimeWheelColumn
        label="Hours"
        items={hourItems}
        value={hourCycle === 12 ? hour : parts.hours}
        onValueChange={(next) =>
          change({
            hours:
              hourCycle === 12
                ? fromHour12(next, toHour12(latestParts.current.hours).meridiem)
                : next,
          })
        }
      />
      <TimeWheelColumn
        label="Minutes"
        items={minuteItems}
        value={parts.minutes}
        onValueChange={(minutes) => change({ minutes })}
      />
      {hasSeconds && (
        <TimeWheelColumn
          label="Seconds"
          items={secondItems}
          value={parts.seconds}
          onValueChange={(seconds) => change({ seconds })}
        />
      )}
      {hourCycle === 12 && (
        <TimeWheelColumn
          label="AM or PM"
          items={meridiemItems}
          value={meridiem === "AM" ? 0 : 1}
          isLooping={false}
          pageSize={1}
          onValueChange={(next) =>
            change({
              hours: fromHour12(
                toHour12(latestParts.current.hours).hour,
                next === 0 ? "AM" : "PM"
              ),
            })
          }
        />
      )}
    </div>
  )
}

export { TimeWheel }
