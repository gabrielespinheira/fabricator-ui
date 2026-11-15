"use client"

import * as React from "react"

import {
  DEFAULT_EVENT_CALENDAR_SETTINGS,
  type EventCalendarSettings,
} from "@/styles/radix-fabricator/lib/event-calendar-model"
import { Card, CardContent } from "@/styles/radix-fabricator/ui/card"
import {
  EventCalendar,
  type CalendarEvent,
  type CalendarSource,
  type EventCalendarView,
} from "@/styles/radix-fabricator/ui/event-calendar"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@/styles/radix-fabricator/ui/field"
import { Switch } from "@/styles/radix-fabricator/ui/switch"
import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightTitle,
} from "@/styles/radix-fabricator/ui/syntax-highlight"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/radix-fabricator/ui/toggle-group"

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "blue" },
  { id: "team", name: "Team", color: "green" },
  { id: "personal", name: "Personal", color: "purple" },
  { id: "holidays", name: "Holidays", color: "orange", editable: false },
]

const pad = (value: number) => String(value).padStart(2, "0")

/** A local wall time `days` from the start of this week. */
function at(days: number, time?: string) {
  const day = new Date()
  day.setDate(day.getDate() - day.getDay() + days)
  const date = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
  return time ? `${date}T${time}:00` : date
}

function createEvents(): CalendarEvent[] {
  return [
    {
      id: "standup",
      title: "Standup",
      start: at(1, "09:30"),
      end: at(1, "09:45"),
      calendarId: "team",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      location: "Huddle room",
    },
    {
      id: "planning",
      title: "Sprint planning",
      start: at(1, "10:00"),
      end: at(1, "11:30"),
      calendarId: "team",
      location: "Atlas, 3rd floor",
      description: "Bring the estimates for the onboarding epic.",
    },
    {
      id: "design-review",
      title: "Design review: billing",
      start: at(2, "14:00"),
      end: at(2, "15:00"),
      calendarId: "work",
    },
    {
      id: "one-on-one",
      title: "1:1 with Maya",
      start: at(2, "16:00"),
      end: at(2, "16:30"),
      calendarId: "work",
      recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU",
    },
    {
      id: "lunch",
      title: "Lunch with Acme Inc",
      start: at(3, "12:30"),
      end: at(3, "13:30"),
      calendarId: "work",
      location: "Cervejaria Ramiro",
    },
    {
      id: "focus",
      title: "Focus time",
      start: at(3, "09:00"),
      end: at(3, "12:00"),
      calendarId: "personal",
    },
    {
      id: "interview",
      title: "Interview: frontend",
      start: at(3, "10:30"),
      end: at(3, "11:30"),
      calendarId: "work",
    },
    {
      id: "sync",
      title: "Product sync",
      start: at(3, "11:00"),
      end: at(3, "11:45"),
      calendarId: "team",
    },
    {
      id: "launch",
      title: "Launch day",
      start: at(4),
      end: at(5),
      calendarId: "work",
    },
    {
      id: "offsite",
      title: "Team offsite",
      start: at(4),
      end: at(7),
      calendarId: "team",
      location: "Sintra",
    },
    {
      id: "retro",
      title: "Retro",
      start: at(5, "15:00"),
      end: at(5, "16:00"),
      calendarId: "team",
      status: "tentative",
    },
    {
      id: "gym",
      title: "Gym",
      start: at(0, "18:00"),
      end: at(0, "19:00"),
      calendarId: "personal",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,SA",
    },
    {
      id: "holiday",
      title: "Public holiday",
      start: at(12),
      end: at(13),
      calendarId: "holidays",
    },
  ]
}

type Variant = "card" | "flat"
type Size = "sm" | "default" | "lg"

type Playground = {
  view?: EventCalendarView
  variant: Variant
  size: Size
  businessHours: boolean
  continuous: boolean
  editable: boolean
  settings: Partial<EventCalendarSettings>
}

const SETTING_KEYS = Object.keys(DEFAULT_EVENT_CALENDAR_SETTINGS).filter(
  (key): key is keyof EventCalendarSettings =>
    key in DEFAULT_EVENT_CALENDAR_SETTINGS
)

/** The props that differ from the defaults, one per line. */
function getProps({
  view,
  variant,
  size,
  businessHours,
  continuous,
  editable,
  settings,
}: Playground) {
  const props: string[] = []
  if (view) props.push(`defaultView="${view}"`)
  if (variant !== "card") props.push(`variant="${variant}"`)
  if (size !== "default") props.push(`size="${size}"`)
  if (businessHours) props.push("businessHours")
  if (!continuous) props.push("continuous={false}")
  if (!editable) props.push("editable={false}")
  const changed = SETTING_KEYS.filter(
    (key) =>
      settings[key] !== undefined &&
      settings[key] !== DEFAULT_EVENT_CALENDAR_SETTINGS[key]
  ).map((key) => `${key}: ${JSON.stringify(settings[key])}`)
  if (changed.length > 0) {
    props.push(`defaultSettings={{ ${changed.join(", ")} }}`)
  }
  return props
}

const BASE_PROPS = [
  "events={events}",
  "calendars={calendars}",
  "onEventChange={(change) => setEvents(change.apply)}",
]

function getCode(props: string[]) {
  const lines = [...BASE_PROPS, ...props].map((prop) => `      ${prop}`)
  return `import * as React from "react"

import { EventCalendar } from "@/components/ui/event-calendar"

export function Schedule() {
  const [events, setEvents] = React.useState(initialEvents)

  return (
    <EventCalendar
${lines.join("\n")}
    />
  )
}`
}

// The line the first chosen prop sits on in the code above.
const FIRST_PROP_LINE = 10 + BASE_PROPS.length

const SWITCHES = [
  {
    id: "business-hours",
    label: "Business hours",
    description: "Shade time outside 9 to 5, Monday to Friday.",
  },
  {
    id: "continuous",
    label: "Continuity",
    description:
      "Scroll sideways through Day, 4 days and Week, a day at a time.",
  },
  {
    id: "weekends",
    label: "Weekends",
    description: "Show Saturday and Sunday.",
  },
  {
    id: "24-hour",
    label: "24-hour clock",
    description: "Times read 14:00 instead of 2 PM.",
  },
  {
    id: "week-numbers",
    label: "Week numbers",
    description: "Number each week in the grid.",
  },
  {
    id: "editable",
    label: "Editable",
    description: "Create, drag, resize and delete events.",
  },
] as const

type SwitchId = (typeof SWITCHES)[number]["id"]

export function EventCalendarDemo() {
  const [events, setEvents] = React.useState(createEvents)
  // The calendar picks its view (the week, or N days when it's narrow) until
  // its own switcher does; the code follows.
  const [view, setView] = React.useState<EventCalendarView>()
  const [variant, setVariant] = React.useState<Variant>("card")
  const [size, setSize] = React.useState<Size>("default")
  const [businessHours, setBusinessHours] = React.useState(false)
  const [continuous, setContinuous] = React.useState(true)
  const [editable, setEditable] = React.useState(true)
  // Controlled, so these switches and the calendar's own settings agree.
  const [settings, setSettings] = React.useState<
    Partial<EventCalendarSettings>
  >({})

  const switches: Record<SwitchId, [boolean, (checked: boolean) => void]> = {
    "business-hours": [businessHours, setBusinessHours],
    continuous: [continuous, setContinuous],
    weekends: [
      settings.showWeekends ?? true,
      (checked) =>
        setSettings((current) => ({ ...current, showWeekends: checked })),
    ],
    "24-hour": [
      settings.hourCycle === "h23",
      (checked) =>
        setSettings((current) => ({
          ...current,
          hourCycle: checked ? "h23" : "h12",
        })),
    ],
    "week-numbers": [
      settings.showWeekNumbers ?? false,
      (checked) =>
        setSettings((current) => ({ ...current, showWeekNumbers: checked })),
    ],
    editable: [editable, setEditable],
  }

  const props = getProps({
    view,
    variant,
    size,
    businessHours,
    continuous,
    editable,
    settings,
  })
  const code = getCode(props)

  return (
    <div className="flex w-full flex-col gap-4">
      <EventCalendar
        events={events}
        calendars={calendars}
        onEventChange={(change) => setEvents(change.apply)}
        onViewChange={setView}
        variant={variant}
        size={size}
        businessHours={businessHours}
        continuous={continuous}
        editable={editable}
        settings={settings}
        onSettingsChange={setSettings}
        className="h-[52rem] w-full"
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card size="sm">
          <CardContent>
            <FieldGroup className="gap-(--density-16)">
              <Field orientation="horizontal">
                <FieldTitle id="event-calendar-variant">Variant</FieldTitle>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={variant}
                  onValueChange={(next) => {
                    if (next === "card" || next === "flat") setVariant(next)
                  }}
                  aria-labelledby="event-calendar-variant"
                >
                  <ToggleGroupItem value="card">Card</ToggleGroupItem>
                  <ToggleGroupItem value="flat">Flat</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field orientation="horizontal">
                <FieldTitle id="event-calendar-size">Size</FieldTitle>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={size}
                  onValueChange={(next) => {
                    if (next === "sm" || next === "default" || next === "lg") {
                      setSize(next)
                    }
                  }}
                  aria-labelledby="event-calendar-size"
                >
                  <ToggleGroupItem value="sm">Compact</ToggleGroupItem>
                  <ToggleGroupItem value="default">Default</ToggleGroupItem>
                  <ToggleGroupItem value="lg">Spacious</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <FieldSeparator />
              {SWITCHES.map((item) => {
                const [checked, setChecked] = switches[item.id]
                const id = `event-calendar-${item.id}`
                return (
                  <Field key={item.id} orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor={id}>{item.label}</FieldLabel>
                      <FieldDescription>{item.description}</FieldDescription>
                    </FieldContent>
                    <Switch
                      id={id}
                      checked={checked}
                      onCheckedChange={setChecked}
                    />
                  </Field>
                )
              })}
            </FieldGroup>
          </CardContent>
        </Card>
        <SyntaxHighlight
          code={code}
          filename="schedule.tsx"
          className="min-h-0"
        >
          <SyntaxHighlightHeader>
            <SyntaxHighlightIcon />
            <SyntaxHighlightTitle />
            <SyntaxHighlightCopy />
          </SyntaxHighlightHeader>
          <SyntaxHighlightContent
            showLineNumbers
            highlightLines={
              props.length > 0
                ? [[FIRST_PROP_LINE, FIRST_PROP_LINE + props.length - 1]]
                : undefined
            }
            className="flex-1"
          />
        </SyntaxHighlight>
      </div>
    </div>
  )
}
