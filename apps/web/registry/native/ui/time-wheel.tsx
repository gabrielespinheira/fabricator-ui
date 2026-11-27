import * as React from "react"
import { cn } from "cn"
import {
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

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
} from "@/registry/fabricator/shared/lib/time-input-model"
import {
  getDrumRowLayout,
  getLoopCycles,
  getLoopedIndex,
  getRecenteredRow,
  getWheelGeometry,
  getWheelIndex,
  type WheelGeometry,
} from "@/registry/fabricator/shared/lib/time-wheel-model"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { Text } from "@/registry/native/ui/text"

// Time Wheel: hours, minutes, optional seconds and AM/PM as scroll wheels, as
// in the iOS Clock app. Each column is a native scroll view that snaps to its
// rows; the rows are moved onto a drum from the scroll position on the UI
// thread, so they bunch up and turn away towards the edges (flat under Reduce
// Motion). Hours, minutes and seconds loop: their rows repeat, and a column
// that comes to rest away from the middle turn jumps back to the same value
// there. Accessibility actions step each column.

// Rows tall, as on the website.
const WHEEL_ROWS = 7

function TimeWheelRow({
  row,
  text,
  isSelected,
  scrollY,
  geometry,
  isFlat,
}: {
  row: number
  text: string
  isSelected: boolean
  scrollY: SharedValue<number>
  geometry: WheelGeometry
  isFlat: boolean
}) {
  const style = useAnimatedStyle(() => {
    const layout = getDrumRowLayout(
      row - scrollY.value / geometry.rowHeight,
      geometry
    )
    if (isFlat) return { opacity: layout.opacity > 0 ? 1 : 0, transform: [] }
    return {
      opacity: layout.opacity,
      transform: [
        { perspective: 1000 },
        { translateY: layout.translateY },
        { rotateX: `${layout.rotateX}deg` },
      ],
    }
  })
  return (
    <Animated.View
      data-slot="time-wheel-item"
      data-selected={isSelected}
      className="cn-time-wheel-item items-center justify-center"
      style={[{ height: geometry.rowHeight }, style]}
    >
      <Text
        className={cn(
          "cn-time-wheel-item-text",
          isSelected ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {text}
      </Text>
    </Animated.View>
  )
}

function TimeWheelColumn({
  label,
  items,
  value,
  isLooping = true,
  onValueChange,
}: {
  label: string
  items: { value: number; text: string }[]
  value: number
  isLooping?: boolean
  onValueChange: (value: number) => void
}) {
  const ref = React.useRef<Animated.ScrollView>(null)
  const rowHeight = parseNumber(useCSSVariable("--density-36"), 36)
  const geometry = React.useMemo(
    () => getWheelGeometry(rowHeight * WHEEL_ROWS, rowHeight),
    [rowHeight]
  )
  const isFlat = useReducedMotion()
  const count = items.length
  const cycles = isLooping ? getLoopCycles(count) : 1
  const index = getWheelIndex(
    items.map((item) => item.value),
    value
  )
  const restRow = isLooping ? getRecenteredRow(index, count, cycles) : index
  const [centerRow, setCenterRow] = React.useState(restRow)
  const scrollY = useSharedValue(restRow * rowHeight)
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y
  })

  // A value from outside (typed, clamped to a range, another column) moves
  // the column to its row in the middle turn.
  React.useEffect(() => {
    if (getLoopedIndex(centerRow, count) === index) return
    setCenterRow(restRow)
    ref.current?.scrollTo({ y: restRow * rowHeight, animated: false })
  }, [index, count, centerRow, restRow, rowHeight])

  const select = (row: number) => {
    const total = count * cycles
    const clamped = Math.max(0, Math.min(total - 1, row))
    const next = items[getLoopedIndex(clamped, count)]
    // Back to the middle turn, so there's always a turn to flick through.
    const recentered = isLooping
      ? getRecenteredRow(clamped, count, cycles)
      : clamped
    setCenterRow(recentered)
    if (recentered !== clamped) {
      ref.current?.scrollTo({ y: recentered * rowHeight, animated: false })
    }
    if (next && next.value !== value) onValueChange(next.value)
  }

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    select(Math.round(event.nativeEvent.contentOffset.y / rowHeight))

  const step = (offset: number) => {
    const next = isLooping
      ? centerRow + offset
      : Math.max(0, Math.min(count - 1, centerRow + offset))
    setCenterRow(next)
    ref.current?.scrollTo({ y: next * rowHeight, animated: !isFlat })
    const item = items[getLoopedIndex(next, count)]
    if (item && item.value !== value) onValueChange(item.value)
  }

  const rows = React.useMemo(
    () => Array.from({ length: count * cycles }, (_, row) => row),
    [count, cycles]
  )
  const spacer = (geometry.radius * 2 - rowHeight) / 2

  return (
    <View
      data-slot="time-wheel-column"
      className="cn-time-wheel-column"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index]?.text }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        step(event.nativeEvent.actionName === "increment" ? 1 : -1)
      }
    >
      <Animated.ScrollView
        ref={ref}
        nestedScrollEnabled
        className="cn-time-wheel-drum"
        showsVerticalScrollIndicator={false}
        snapToInterval={rowHeight}
        decelerationRate="fast"
        scrollEventThrottle={16}
        style={{ height: rowHeight * WHEEL_ROWS }}
        contentOffset={{ x: 0, y: restRow * rowHeight }}
        onScroll={onScroll}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(event) => {
          if (!event.nativeEvent.velocity?.y) settle(event)
        }}
      >
        <View className="cn-time-wheel-spacer" style={{ height: spacer }} />
        <View data-slot="time-wheel-layer" className="cn-time-wheel-layer">
          {rows.map((row) => {
            const item = items[getLoopedIndex(row, count)]
            return (
              <TimeWheelRow
                key={row}
                row={row}
                text={item?.text ?? ""}
                isSelected={row === centerRow}
                scrollY={scrollY}
                geometry={geometry}
                isFlat={isFlat}
              />
            )
          })}
        </View>
        <View className="cn-time-wheel-spacer" style={{ height: spacer }} />
      </Animated.ScrollView>
    </View>
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
}: Omit<React.ComponentProps<typeof View>, "defaultValue"> & {
  value: string | undefined
  onValueChange: (value: string) => void
  hourCycle: HourCycle
  hasSeconds?: boolean
  step?: number
  minTime?: string
  maxTime?: string
  label?: string
}) {
  const [now] = React.useState(() => getTimeOfDay(new Date()))
  const parts = splitTime(value ?? now)
  const { hour, meridiem } = toHour12(parts.hours)
  const pad = (number: number) => String(number).padStart(2, "0")
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
  const rowHeight = parseNumber(useCSSVariable("--density-36"), 36)

  // Columns settle one at a time: merge into the newest time so one column's
  // change doesn't undo another's.
  const latestParts = React.useRef(parts)
  React.useLayoutEffect(() => {
    latestParts.current = parts
  })
  const change = (next: Partial<TimeParts>) => {
    const merged = { ...latestParts.current, ...next }
    latestParts.current = merged
    onValueChange(
      clampTime(joinTime(merged, { hasSeconds }), { minTime, maxTime })
    )
  }

  return (
    <View
      data-slot="time-wheel"
      accessibilityLabel={label}
      className={cn(
        "cn-time-wheel relative flex-row justify-center",
        className
      )}
      {...props}
    >
      <View
        pointerEvents="none"
        data-slot="time-wheel-band"
        className="cn-time-wheel-band absolute inset-x-0"
        style={{ top: (rowHeight * (WHEEL_ROWS - 1)) / 2, height: rowHeight }}
      />
      <TimeWheelColumn
        label="Hours"
        items={hourItems}
        value={hourCycle === 12 ? hour : parts.hours}
        onValueChange={(hours) =>
          change({
            hours:
              hourCycle === 12
                ? fromHour12(
                    hours,
                    toHour12(latestParts.current.hours).meridiem
                  )
                : hours,
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
          value={meridiem === "PM" ? 1 : 0}
          isLooping={false}
          onValueChange={(next) =>
            change({
              hours: fromHour12(
                toHour12(latestParts.current.hours).hour,
                next ? "PM" : "AM"
              ),
            })
          }
        />
      )}
    </View>
  )
}

export { TimeWheel }
