import * as React from "react"
import { ArrowRightIcon, ClockIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { View, type TextInput } from "react-native"

import {
  addMinutesToTime,
  commitTimeText,
  formatTimeDuration,
  formatTimeValue,
  getLocaleHourCycle,
  getTimeDuration,
  joinTime,
  shiftEndTime,
  splitTime,
  type HourCycle,
} from "@/registry/fabricator/shared/lib/time-input-model"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/native/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/native/ui/popover"
import { Text } from "@/registry/native/ui/text"
import { TimeWheel } from "@/registry/native/ui/time-wheel"

function useHourCycle(hourCycle?: HourCycle) {
  return hourCycle ?? getLocaleHourCycle()
}

function TimeInput({
  value: prop,
  defaultValue,
  onValueChange,
  hourCycle: cycle,
  hasSeconds = false,
  step = 1,
  minTime,
  maxTime,
  startTime,
  name: _name,
  wheelLabel = "Choose time",
  disabled = false,
  className,
  onBlur,
  "aria-invalid": isInvalid,
  ...props
}: Omit<React.ComponentProps<typeof TextInput>, "value" | "defaultValue"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string | undefined) => void
  hourCycle?: HourCycle
  hasSeconds?: boolean
  step?: number
  minTime?: string
  maxTime?: string
  startTime?: string
  name?: string
  wheelLabel?: string
  disabled?: boolean
  "aria-invalid"?: boolean
}) {
  const [value, setValue] = useControllableState({
    prop,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const [text, setText] = React.useState<string | null>(null)
  const [invalid, setInvalid] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const hourCycle = useHourCycle(cycle)
  const earliest = startTime ? addMinutesToTime(startTime, 1) : minTime
  function commit() {
    if (text === null) return
    const next = commitTimeText(text, { hourCycle, minTime: earliest, maxTime })
    setInvalid(next.isInvalid)
    if (!next.isInvalid) {
      setValue(
        next.value ? joinTime(splitTime(next.value), { hasSeconds }) : undefined
      )
      setText(null)
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <InputGroup
        data-slot="time-input"
        data-invalid={isInvalid || invalid}
        className={cn("cn-time-input", className)}
      >
        <InputGroupInput
          value={text ?? formatTimeValue(value, { hourCycle })}
          editable={!disabled}
          aria-invalid={isInvalid || invalid}
          autoCorrect={false}
          onChangeText={setText}
          onSubmitEditing={commit}
          onBlur={(event) => {
            commit()
            onBlur?.(event)
          }}
          {...props}
        />
        <InputGroupAddon align="inline-end">
          <PopoverTrigger
            render={
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                accessibilityLabel={wheelLabel}
                disabled={disabled}
              />
            }
          >
            <ClockIcon />
          </PopoverTrigger>
        </InputGroupAddon>
      </InputGroup>
      <PopoverContent
        data-slot="time-input-content"
        className="cn-time-input-content"
      >
        <TimeWheel
          value={value}
          onValueChange={(next) => {
            setValue(next)
            setText(null)
            setInvalid(false)
          }}
          hourCycle={hourCycle}
          hasSeconds={hasSeconds}
          step={step}
          minTime={earliest}
          maxTime={maxTime}
          label={wheelLabel}
        />
      </PopoverContent>
    </Popover>
  )
}
type TimeRangeValue = { start: string | undefined; end: string | undefined }
function TimeRangeInput({
  value: prop,
  defaultValue,
  onValueChange,
  hourCycle,
  step = 1,
  minTime,
  maxTime,
  startId,
  startLabel = "Start time",
  endLabel = "End time",
  name,
  disabled,
  className,
  ...props
}: React.ComponentProps<typeof View> & {
  value?: TimeRangeValue
  defaultValue?: TimeRangeValue
  onValueChange?: (value: TimeRangeValue) => void
  hourCycle?: HourCycle
  step?: number
  minTime?: string
  maxTime?: string
  startId?: string
  startLabel?: string
  endLabel?: string
  name?: string
  disabled?: boolean
}) {
  const [currentRange, setRange] = useControllableState<TimeRangeValue>({
    prop,
    defaultProp: defaultValue ?? { start: undefined, end: undefined },
    onChange: onValueChange,
  })
  const range = currentRange ?? { start: undefined, end: undefined }
  const duration =
    range.start && range.end
      ? getTimeDuration(range.start, range.end)
      : undefined
  return (
    <View
      data-slot="time-range-input"
      className={cn(
        "cn-time-range-input flex-row flex-wrap items-center gap-2",
        className
      )}
      {...props}
    >
      <View className="min-w-32 flex-1">
        <TimeInput
          nativeID={startId}
          accessibilityLabel={startLabel}
          wheelLabel={startLabel}
          value={range.start}
          onValueChange={(start) =>
            setRange({
              start,
              end:
                range.start && start
                  ? shiftEndTime(range.start, range.end, start, step)
                  : start && range.end && !getTimeDuration(start, range.end)
                    ? shiftEndTime(start, undefined, start, step)
                    : range.end,
            })
          }
          hourCycle={hourCycle}
          step={step}
          minTime={minTime}
          maxTime={maxTime}
          disabled={disabled}
          name={name && `${name}-start`}
        />
      </View>
      <View
        data-slot="time-range-input-separator"
        className="cn-time-range-input-separator"
      >
        <ArrowRightIcon size={16} />
      </View>
      <View className="min-w-32 flex-1">
        <TimeInput
          accessibilityLabel={endLabel}
          wheelLabel={endLabel}
          value={range.end}
          onValueChange={(end) => setRange({ ...range, end })}
          startTime={range.start}
          hourCycle={hourCycle}
          step={step}
          minTime={minTime}
          maxTime={maxTime}
          disabled={disabled}
          name={name && `${name}-end`}
        />
      </View>
      {duration !== undefined && (
        <Text
          data-slot="time-range-input-duration"
          className="cn-time-range-input-duration"
        >
          {formatTimeDuration(duration)}
        </Text>
      )}
    </View>
  )
}
export { TimeInput, TimeRangeInput, useHourCycle, type TimeRangeValue }
