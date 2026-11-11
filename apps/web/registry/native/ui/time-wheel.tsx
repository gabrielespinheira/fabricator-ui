import * as React from "react"
import { cn } from "cn"
import { ScrollView, View } from "react-native"
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
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import {
  getScrollWheelIndex,
  getWheelIndex,
} from "@/registry/native/lib/time-wheel-model"
import { Text } from "@/registry/native/ui/text"

function TimeWheelColumn({
  label,
  items,
  value,
  onValueChange,
  meridiem = false,
}: {
  label: string
  items: number[]
  value: number
  onValueChange: (value: number) => void
  meridiem?: boolean
}) {
  const ref = React.useRef<React.ComponentRef<typeof ScrollView>>(null)
  const height = parseNumber(useCSSVariable("--density-32"), 32)
  const index = getWheelIndex(items, value)
  React.useEffect(() => {
    ref.current?.scrollTo({ y: index * height, animated: false })
  }, [index, height])
  const select = (next: number) => {
    const value = items[next]
    if (value !== undefined) onValueChange(value)
  }
  return (
    <View
      data-slot="time-wheel-column"
      className="cn-time-wheel-column flex-1"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        text: meridiem ? (value ? "PM" : "AM") : String(value),
        min: 0,
        max: items.length - 1,
        now: index,
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        select(
          Math.max(
            0,
            Math.min(
              items.length - 1,
              index + (event.nativeEvent.actionName === "increment" ? 1 : -1)
            )
          )
        )
      }
    >
      <ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        style={{ height: height * 5 }}
        onMomentumScrollEnd={(event) =>
          select(
            getScrollWheelIndex(
              event.nativeEvent.contentOffset.y,
              height,
              items.length
            )
          )
        }
        onScrollEndDrag={(event) => {
          if (!event.nativeEvent.velocity?.y)
            select(
              getScrollWheelIndex(
                event.nativeEvent.contentOffset.y,
                height,
                items.length
              )
            )
        }}
      >
        <View className="cn-time-wheel-spacer" style={{ height: height * 2 }} />
        {items.map((item, row) => (
          <View
            key={item}
            data-slot="time-wheel-item"
            data-selected={index === row}
            className="cn-time-wheel-item items-center justify-center"
            style={{ height }}
          >
            <Text
              className={
                index === row
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }
            >
              {meridiem ? (item ? "PM" : "AM") : String(item).padStart(2, "0")}
            </Text>
          </View>
        ))}
        <View className="cn-time-wheel-spacer" style={{ height: height * 2 }} />
      </ScrollView>
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
  const hourItems = React.useMemo(() => getHourValues(hourCycle), [hourCycle])
  const minuteItems = React.useMemo(() => getMinuteValues(step), [step])
  const secondItems = React.useMemo(() => getMinuteValues(1), [])
  const height = parseNumber(useCSSVariable("--density-32"), 32)
  const change = (next: Partial<TimeParts>) =>
    onValueChange(
      clampTime(joinTime({ ...parts, ...next }, { hasSeconds }), {
        minTime,
        maxTime,
      })
    )
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
        className="cn-time-wheel-band absolute inset-x-0 rounded-lg bg-active"
        style={{ top: height * 2, height }}
      />
      <TimeWheelColumn
        label="Hours"
        items={hourItems}
        value={hourCycle === 12 ? hour : parts.hours}
        onValueChange={(hours) =>
          change({
            hours: hourCycle === 12 ? fromHour12(hours, meridiem) : hours,
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
          items={[0, 1]}
          value={meridiem === "PM" ? 1 : 0}
          meridiem
          onValueChange={(value) =>
            change({ hours: fromHour12(hour, value ? "PM" : "AM") })
          }
        />
      )}
    </View>
  )
}
export { TimeWheel }
