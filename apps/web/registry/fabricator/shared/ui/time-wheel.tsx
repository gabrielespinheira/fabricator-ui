"use client"

// Time Wheel: hours, minutes, optional seconds and AM/PM as scroll wheels, as
// in the iOS Clock app. Each column scrolls and snaps to a row; the row on the
// band across the middle is the value. Rows fade towards the edges and tilt
// away from the band like a drum (flat under reduced motion). Each column is a
// spinbutton: arrow keys step it, Page Up and Page Down jump, Home and End go
// to the ends. Values are "HH:mm" or "HH:mm:ss"; the rules are in
// lib/time-input-model.
import * as React from "react"
import { cn } from "cn"

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

type WheelItem = { value: number; text: string }

// How far round the drum the wheel's ends sit, out of a quarter turn.
const TILT_DEPTH = 0.9
const SETTLE_DELAY = 120

const pad = (value: number) => String(value).padStart(2, "0")

function isFlat() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "off"
  )
}

/** The item nearest a value: a time off the step lands on the closest row. */
function getNearestIndex(items: WheelItem[], value: number) {
  let nearest = 0
  items.forEach((item, index) => {
    const best = items[nearest]
    if (best && Math.abs(item.value - value) < Math.abs(best.value - value)) {
      nearest = index
    }
  })
  return nearest
}

function TimeWheelColumn({
  label,
  items,
  value,
  pageSize = 5,
  onValueChange,
}: {
  label: string
  items: WheelItem[]
  value: number
  pageSize?: number
  onValueChange: (value: number) => void
}) {
  const columnRef = React.useRef<HTMLDivElement>(null)
  const settleTimer = React.useRef<number>(undefined)
  const frame = React.useRef<number>(undefined)
  const hasScrolled = React.useRef(false)
  const index = getNearestIndex(items, value)
  const item = items[index]

  const getRowHeight = React.useCallback(
    () =>
      columnRef.current?.querySelector<HTMLElement>(
        "[data-slot=time-wheel-item]"
      )?.offsetHeight ?? 0,
    []
  )

  // Tilt each row by its distance from the band.
  const paint = React.useCallback(() => {
    frame.current = undefined
    const column = columnRef.current
    if (!column) return
    const flat = isFlat()
    const centre = column.scrollTop + column.clientHeight / 2
    const radius = column.clientHeight / 2
    for (const row of column.querySelectorAll<HTMLElement>(
      "[data-slot=time-wheel-item]"
    )) {
      // Rows sit on a drum as tall as the wheel: the further from the band,
      // the more they turn away.
      const offset = row.offsetTop + row.offsetHeight / 2 - centre
      const ratio = Math.max(-1, Math.min(1, offset / radius))
      const tilt = (-Math.asin(ratio) * 180 * TILT_DEPTH) / Math.PI
      row.style.transform = flat ? "" : `rotateX(${tilt}deg)`
    }
  }, [])

  // The value moves the wheel: at once when it first shows, smoothly after.
  React.useLayoutEffect(() => {
    const column = columnRef.current
    const rowHeight = getRowHeight()
    if (!column || !rowHeight) return
    const top = index * rowHeight
    if (Math.abs(column.scrollTop - top) < 1) return paint()
    column.scrollTo({
      top,
      behavior: hasScrolled.current && !isFlat() ? "smooth" : "auto",
    })
    hasScrolled.current = true
    paint()
  }, [index, getRowHeight, paint])

  // Once the scroll comes to rest, the row on the band is the value.
  function settle() {
    window.clearTimeout(settleTimer.current)
    const column = columnRef.current
    const rowHeight = getRowHeight()
    if (!column || !rowHeight) return
    const restIndex = Math.round(column.scrollTop / rowHeight)
    const restItem = items[Math.max(0, Math.min(items.length - 1, restIndex))]
    if (restItem && restItem.value !== value) onValueChange(restItem.value)
  }

  function step(offset: number) {
    const next = items[Math.max(0, Math.min(items.length - 1, index + offset))]
    if (next && next.value !== value) onValueChange(next.value)
  }

  const moves: Record<string, number> = {
    ArrowUp: -1,
    ArrowDown: 1,
    PageUp: -pageSize,
    PageDown: pageSize,
    Home: -items.length,
    End: items.length,
  }

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
      className="cn-time-wheel-column relative overflow-y-auto overscroll-contain outline-none select-none"
      onScroll={() => {
        frame.current ??= requestAnimationFrame(paint)
        window.clearTimeout(settleTimer.current)
        settleTimer.current = window.setTimeout(settle, SETTLE_DELAY)
      }}
      onKeyDown={(event) => {
        const offset = moves[event.key]
        if (offset === undefined) return
        event.preventDefault()
        step(offset)
      }}
    >
      <div aria-hidden className="cn-time-wheel-spacer" />
      {items.map((row, rowIndex) => (
        <div
          key={row.value}
          aria-hidden
          data-slot="time-wheel-item"
          data-selected={rowIndex === index || undefined}
          className="cn-time-wheel-item flex cursor-pointer items-center justify-center"
          onClick={() => onValueChange(row.value)}
        >
          {row.text}
        </div>
      ))}
      <div aria-hidden className="cn-time-wheel-spacer" />
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
  const meridiemItems = [
    { value: 0, text: "AM" },
    { value: 1, text: "PM" },
  ]

  function change(next: Partial<TimeParts>) {
    const time = joinTime({ ...parts, ...next }, { hasSeconds })
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
            hours: hourCycle === 12 ? fromHour12(next, meridiem) : next,
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
          pageSize={1}
          onValueChange={(next) =>
            change({ hours: fromHour12(hour, next === 0 ? "AM" : "PM") })
          }
        />
      )}
    </div>
  )
}

export { TimeWheel }
