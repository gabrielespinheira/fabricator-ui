import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { addDays } from "date-fns"

import {
  Calendar,
  CalendarDayButton,
  type DateRange,
} from "@/registry/native/ui/calendar"
import { Text } from "@/registry/native/ui/text"

const YEAR = new Date().getFullYear()
const BOOKED = Array.from(
  { length: 15 },
  (_, index) => new Date(YEAR, 0, 12 + index)
)

function CalendarExample() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [dates, setDates] = React.useState<Date[] | undefined>([])
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(YEAR, 0, 12),
    to: addDays(new Date(YEAR, 0, 12), 10),
  })
  const [booked, setBooked] = React.useState<Date | undefined>(
    new Date(YEAR, 0, 6)
  )
  return (
    <ExampleWrapper>
      <Example title="Single, full width" className="items-stretch">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="w-full"
        />
      </Example>
      <Example title="Uncontrolled">
        <Calendar mode="single" />
      </Example>
      <Example title="Multiple, up to three">
        <Calendar
          mode="multiple"
          max={3}
          selected={dates}
          onSelect={setDates}
        />
      </Example>
      <Example title="Range, two months">
        <Calendar
          mode="range"
          defaultMonth={range?.from}
          selected={range}
          onSelect={setRange}
          numberOfMonths={2}
        />
      </Example>
      <Example title="Disabled dates">
        <Calendar
          mode="single"
          defaultMonth={booked}
          selected={booked}
          onSelect={setBooked}
          disabled={BOOKED}
          modifiers={{ booked: BOOKED }}
          modifiersClassNames={{ booked: "opacity-100" }}
        />
      </Example>
      <Example title="Month and year pickers">
        <Calendar mode="single" captionLayout="dropdown" />
      </Example>
      <Example title="Month picker">
        <Calendar mode="single" captionLayout="dropdown-months" />
      </Example>
      <Example title="Year picker">
        <Calendar mode="single" captionLayout="dropdown-years" />
      </Example>
      <Example title="Week starts on Monday, with week numbers">
        <Calendar mode="single" weekStartsOn={1} showWeekNumber />
      </Example>
      <Example title="No outside days">
        <Calendar mode="single" showOutsideDays={false} fixedWeeks />
      </Example>
      <Example title="Custom days">
        <Calendar
          mode="single"
          className="w-full"
          components={{
            DayButton: ({ children, modifiers, day, ...props }) => (
              <CalendarDayButton day={day} modifiers={modifiers} {...props}>
                {children}
                {!modifiers.outside && (
                  <Text className="text-[10px] text-muted-foreground">
                    {day.date.getDay() === 0 || day.date.getDay() === 6
                      ? "$120"
                      : "$100"}
                  </Text>
                )}
              </CalendarDayButton>
            ),
          }}
        />
      </Example>
    </ExampleWrapper>
  )
}

export { CalendarExample }
