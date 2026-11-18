import {
  type CalendarEvent,
  type CalendarSource,
} from "@/registry/bases/__base__/lib/event-calendar-model"

// The calendar's demo data: five calendars and a busy week, written relative
// to "now" so the week in view always has something in it. Replace
// createCalendarAppEvents with your own events, or pass `load` to the
// calendar to fetch them by month.

export type CalendarAppResponse = "yes" | "maybe" | "no"

export type CalendarAppGuest = {
  id: string
  name: string
  initials: string
  /** Left out until the guest answers. */
  response?: CalendarAppResponse
  isOrganizer?: boolean
  /** The person signed in, whose answer the details panel changes. */
  isYou?: boolean
}

export type CalendarAppEventData = {
  guests?: CalendarAppGuest[]
  conference?: { label: string; url: string }
}

export type CalendarAppEvent = CalendarEvent<CalendarAppEventData>

export type CalendarAppCalendar = CalendarSource & {
  /** "mine" lists under My calendars; "other" under Other calendars. */
  group: "mine" | "other"
}

export const CALENDAR_APP_CALENDARS: CalendarAppCalendar[] = [
  { id: "ada", name: "Ada Park", color: "blue", group: "mine" },
  { id: "team", name: "Product team", color: "green", group: "mine" },
  { id: "family", name: "Family", color: "orange", group: "mine" },
  {
    id: "maya",
    name: "Maya Chen",
    color: "teal",
    group: "other",
    editable: false,
  },
  {
    id: "holidays",
    name: "Holidays",
    color: "purple",
    group: "other",
    editable: false,
  },
]

const PEOPLE = {
  ada: { id: "ada", name: "Ada Park", initials: "AP", isYou: true },
  maya: { id: "maya", name: "Maya Chen", initials: "MC" },
  sam: { id: "sam", name: "Sam Ortiz", initials: "SO" },
  noor: { id: "noor", name: "Noor Ali", initials: "NA" },
  leo: { id: "leo", name: "Leo Silva", initials: "LS" },
  ines: { id: "ines", name: "Inês Costa", initials: "IC" },
} satisfies Record<string, CalendarAppGuest>

const pad = (value: number) => String(value).padStart(2, "0")

/** Monday at midnight, local time, of the week `now` is in. */
export function getWeekStart(now: Date) {
  const daysSinceMonday = (now.getDay() + 6) % 7
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysSinceMonday
  )
}

/**
 * A local wall time ("2026-11-16T09:30:00") on `day`, or the date alone
 * ("2026-11-16") for an all-day event.
 */
export function toWallTime(day: Date, time?: string) {
  const date = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
  return time ? `${date}T${time}:00` : date
}

export function createCalendarAppEvents(now: Date): CalendarAppEvent[] {
  const monday = getWeekStart(now)
  // A day of this week: 0 is Monday, 6 is Sunday.
  const day = (offset: number) =>
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset)
  const at = (offset: number, time?: string) => toWallTime(day(offset), time)
  const meet = (code: string) => ({
    label: "Join video call",
    url: `https://meet.example.com/${code}`,
  })

  return [
    {
      id: "standup",
      title: "Standup",
      start: at(0, "09:30"),
      end: at(0, "09:45"),
      calendarId: "team",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      data: {
        conference: meet("std-upda-ily"),
        guests: [
          { ...PEOPLE.leo, isOrganizer: true, response: "yes" },
          { ...PEOPLE.ada, response: "yes" },
          { ...PEOPLE.maya, response: "yes" },
          { ...PEOPLE.sam, response: "yes" },
          { ...PEOPLE.noor, response: "maybe" },
        ],
      },
    },
    {
      id: "planning",
      title: "Sprint planning",
      start: at(0, "10:00"),
      end: at(0, "11:00"),
      calendarId: "team",
      location: "Atlas room, 3rd floor",
      description:
        "Pick the stories for the next two weeks. Bring estimates for anything you own.",
      data: {
        conference: meet("spr-intp-lan"),
        guests: [
          { ...PEOPLE.leo, isOrganizer: true, response: "yes" },
          { ...PEOPLE.ada, response: "yes" },
          { ...PEOPLE.maya, response: "yes" },
          { ...PEOPLE.sam, response: "no" },
          { ...PEOPLE.noor, response: "yes" },
        ],
      },
    },
    {
      id: "lunch-sam",
      title: "Lunch with Sam",
      start: at(0, "12:30"),
      end: at(0, "13:30"),
      calendarId: "ada",
      location: "Time Out Market",
      data: {
        guests: [
          { ...PEOPLE.ada, isOrganizer: true, response: "yes" },
          { ...PEOPLE.sam, response: "yes" },
        ],
      },
    },
    {
      id: "focus-roadmap",
      title: "Focus: Q1 roadmap",
      start: at(0, "14:00"),
      end: at(0, "16:30"),
      calendarId: "ada",
      description: "Notifications off. Draft the bets and their measures.",
    },
    {
      id: "interviews",
      title: "Interviews",
      start: at(1, "09:00"),
      end: at(1, "12:00"),
      calendarId: "maya",
    },
    {
      id: "one-on-one",
      title: "1:1 with Maya",
      start: at(1, "11:00"),
      end: at(1, "11:30"),
      calendarId: "ada",
      description: "Hiring plan, the onboarding research and your goals.",
      data: {
        conference: meet("one-onon-ema"),
        guests: [
          { ...PEOPLE.maya, isOrganizer: true, response: "yes" },
          { ...PEOPLE.ada },
        ],
      },
    },
    {
      id: "design-review",
      title: "Design review: onboarding",
      start: at(1, "14:00"),
      end: at(1, "15:30"),
      calendarId: "team",
      location: "Studio",
      description:
        "Walk through the new first-run checklist and the empty states.",
      data: {
        conference: meet("des-ignr-evw"),
        guests: [
          { ...PEOPLE.ines, isOrganizer: true, response: "yes" },
          { ...PEOPLE.ada },
          { ...PEOPLE.maya, response: "yes" },
          { ...PEOPLE.leo, response: "maybe" },
          { ...PEOPLE.noor, response: "yes" },
          { ...PEOPLE.sam },
        ],
      },
    },
    {
      id: "dentist",
      title: "Dentist",
      start: at(1, "15:00"),
      end: at(1, "16:00"),
      calendarId: "family",
      location: "Clínica Sorriso, Rua Augusta 112",
    },
    {
      id: "offsite",
      title: "Team offsite · Sintra",
      start: at(2),
      end: at(4),
      calendarId: "team",
      location: "Quinta da Regaleira, Sintra",
      description:
        "Two days on strategy and team rituals. The coach leaves the office at 8:15.",
      data: {
        guests: [
          { ...PEOPLE.leo, isOrganizer: true, response: "yes" },
          { ...PEOPLE.ada, response: "yes" },
          { ...PEOPLE.maya, response: "yes" },
          { ...PEOPLE.sam, response: "yes" },
          { ...PEOPLE.noor, response: "maybe" },
          { ...PEOPLE.ines, response: "yes" },
        ],
      },
    },
    {
      id: "offsite-dinner",
      title: "Offsite dinner",
      start: at(2, "19:30"),
      end: at(2, "22:00"),
      calendarId: "team",
      location: "Tascantiga, Sintra",
    },
    {
      id: "workshop",
      title: "Research workshop",
      start: at(3, "13:00"),
      end: at(3, "15:00"),
      calendarId: "maya",
    },
    {
      id: "northwind",
      title: "Northwind renewal call",
      start: at(3, "16:00"),
      end: at(3, "17:00"),
      calendarId: "ada",
      description: "Renewal for 120 seats. Pricing sheet is in the deal room.",
      data: {
        conference: meet("nor-thwi-ndr"),
        guests: [
          { ...PEOPLE.ada, isOrganizer: true, response: "yes" },
          { ...PEOPLE.sam, response: "yes" },
          {
            id: "dana",
            name: "Dana Whitfield",
            initials: "DW",
            response: "maybe",
          },
        ],
      },
    },
    {
      id: "founders-day",
      title: "Founders' Day",
      start: at(4),
      end: at(5),
      calendarId: "holidays",
    },
    {
      id: "dinner",
      title: "Dinner with Ana and João",
      start: at(4, "19:00"),
      end: at(4, "21:00"),
      calendarId: "family",
      location: "Prado, Lisbon",
    },
    {
      id: "market",
      title: "Farmers' market",
      start: at(5, "10:00"),
      end: at(5, "11:30"),
      calendarId: "family",
    },
    {
      id: "call-mom",
      title: "Call with Mom",
      // Started the Sunday before, so a week from Sunday shows it too.
      start: at(-1, "18:00"),
      end: at(-1, "18:30"),
      calendarId: "family",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
    },
  ]
}
