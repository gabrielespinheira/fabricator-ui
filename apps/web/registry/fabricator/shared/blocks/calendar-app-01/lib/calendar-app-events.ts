import {
  type CalendarEvent,
  type CalendarSource,
} from "@/registry/bases/__base__/lib/event-calendar-model"

// The calendar's demo data: Ada's calendars and a full week, written relative
// to "now" so the week in view always has something in it. Replace
// createCalendarAppEvents with your own events, or pass `load` to the
// calendar to fetch them by month.

export type CalendarAppResponse = "yes" | "maybe" | "no"

export type CalendarAppGuest = {
  id: string
  name: string
  initials: string
  avatar?: string
  /** Left out until the guest answers. */
  response?: CalendarAppResponse
  isOrganizer?: boolean
  /** The person signed in, whose answer the details panel changes. */
  isYou?: boolean
}

export type CalendarAppEventData = {
  guests?: CalendarAppGuest[]
  conference?: { label: string; url: string }
  /** How long before the event its reminder comes. */
  reminderMinutes?: number
}

export type CalendarAppEvent = CalendarEvent<CalendarAppEventData>

export type CalendarAppCalendar = CalendarSource & {
  /** "mine" lists under My calendars; "other" under Other calendars. */
  group: "mine" | "other"
}

function photo(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&auto=format&q=80`
}

const PEOPLE = {
  ada: {
    id: "ada",
    name: "Ada Lovelace",
    initials: "AL",
    avatar: photo("1580489944761-15a19d654956"),
    isYou: true,
  },
  maya: {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    avatar: photo("1534528741775-53994a69daeb"),
  },
  lucas: {
    id: "lucas",
    name: "Lucas Ferreira",
    initials: "LF",
    avatar: photo("1500648767791-00dcc994a43e"),
  },
  daniel: {
    id: "daniel",
    name: "Daniel Okafor",
    initials: "DO",
    avatar: photo("1507003211169-0a1dd7228f2d"),
  },
  emma: {
    id: "emma",
    name: "Emma Lindqvist",
    initials: "EL",
    avatar: photo("1438761681033-6461ffad8d80"),
  },
  tom: {
    id: "tom",
    name: "Tom Becker",
    initials: "TB",
    avatar: photo("1472099645785-5658abf4ff4e"),
  },
  nora: {
    id: "nora",
    name: "Nora Ahmed",
    initials: "NA",
    avatar: photo("1544005313-94ddf0286df2"),
  },
  priya: { id: "priya", name: "Priya Raman", initials: "PR" },
  sofia: {
    id: "sofia",
    name: "Sofia Marques",
    initials: "SM",
    avatar: photo("1494790108377-be9c29b29330"),
  },
} satisfies Record<string, CalendarAppGuest>

export const CALENDAR_APP_ACCOUNT = {
  name: PEOPLE.ada.name,
  email: "ada@acme.com",
  avatarUrl: PEOPLE.ada.avatar,
}

export const CALENDAR_APP_CALENDARS: CalendarAppCalendar[] = [
  { id: "ada", name: "Ada Lovelace", color: "blue", group: "mine" },
  { id: "team", name: "Product team", color: "green", group: "mine" },
  { id: "personal", name: "Personal", color: "orange", group: "mine" },
  {
    id: "maya",
    name: "Maya Chen",
    color: "teal",
    group: "other",
    editable: false,
  },
  {
    id: "company",
    name: "Acme company",
    color: "purple",
    group: "other",
    editable: false,
  },
]

/** The colleagues whose calendars "Add calendar" offers. */
export const CALENDAR_APP_COLLEAGUES: CalendarAppCalendar[] = [
  {
    id: "lucas",
    name: PEOPLE.lucas.name,
    color: "cyan",
    group: "other",
    editable: false,
  },
  {
    id: "priya",
    name: PEOPLE.priya.name,
    color: "pink",
    group: "other",
    editable: false,
  },
  {
    id: "tom",
    name: PEOPLE.tom.name,
    color: "indigo",
    group: "other",
    editable: false,
  },
]

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

const { ada, maya, lucas, daniel, emma, tom, nora, priya, sofia } = PEOPLE

function host(person: CalendarAppGuest): CalendarAppGuest {
  return { ...person, isOrganizer: true, response: "yes" }
}

function answered(response: CalendarAppResponse) {
  return (person: CalendarAppGuest): CalendarAppGuest => ({
    ...person,
    response,
  })
}

const yes = answered("yes")
const maybe = answered("maybe")
const no = answered("no")

function zoom(meetingId: string) {
  return { label: "Join Zoom call", url: `https://zoom.us/j/${meetingId}` }
}

export function createCalendarAppEvents(now: Date): CalendarAppEvent[] {
  const monday = getWeekStart(now)
  // A day counted from this week's Monday: 0 to 6 this week, -7 a week ago.
  const at = (offset: number, time?: string) =>
    toWallTime(
      new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + offset
      ),
      time
    )
  // Series start some weeks back, so the weeks before this one have them too.
  const back = -56

  return [
    // --- Every week --------------------------------------------------------------
    {
      id: "standup",
      title: "Standup",
      start: at(back, "09:30"),
      end: at(back, "09:45"),
      calendarId: "team",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      location: "Atlas room, 3rd floor",
      description:
        "What moved, what is stuck, what ships today. Write yours in the thread if you can't make it.",
      data: {
        conference: zoom("84211903377"),
        reminderMinutes: 5,
        guests: [
          host(lucas),
          yes(ada),
          yes(maya),
          yes(daniel),
          maybe(nora),
          yes(priya),
        ],
      },
    },
    {
      id: "product-weekly",
      title: "Product weekly",
      start: at(back + 3, "10:00"),
      end: at(back + 3, "11:00"),
      calendarId: "team",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=TH",
      location: "Orion room, 2nd floor",
      description: "Metrics first, then decisions. The agenda closes at 9:00.",
      data: {
        conference: zoom("83760021954"),
        reminderMinutes: 10,
        guests: [
          host(ada),
          yes(maya),
          yes(lucas),
          yes(emma),
          yes(daniel),
          priya,
        ],
      },
    },
    {
      id: "one-on-one-maya",
      title: "1:1 with Maya",
      start: at(back + 1, "13:30"),
      end: at(back + 1, "14:00"),
      calendarId: "ada",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=TU",
      location: "Walk, or Zoom if it rains",
      description:
        "Hiring plan, the onboarding research and what you want to work on next quarter.",
      data: {
        conference: zoom("81159920043"),
        reminderMinutes: 10,
        guests: [host(maya), yes(ada)],
      },
    },
    {
      id: "yoga",
      title: "Yoga",
      start: at(back + 2, "17:30"),
      end: at(back + 2, "18:30"),
      calendarId: "personal",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=WE",
      location: "Sala Azul, Rua da Rosa 41",
      description: "Bring the long strap.",
      data: { reminderMinutes: 30, guests: [host(ada)] },
    },
    {
      id: "call-mom",
      title: "Call with Mom",
      start: at(back + 6, "18:00"),
      end: at(back + 6, "18:30"),
      calendarId: "personal",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
      location: "FaceTime",
      description: "Ask about the garden and the flights in December.",
      data: { reminderMinutes: 10, guests: [host(ada)] },
    },

    // --- This week -----------------------------------------------------------------
    {
      id: "launch-week",
      title: "Launch week",
      start: at(0),
      end: at(5),
      calendarId: "company",
      location: "All offices",
      description:
        "Workflows 2.0 goes out on Thursday. Release notes are in the launch doc.",
      data: {
        conference: zoom("80014427781"),
        reminderMinutes: 1440,
        guests: [host(emma), yes(ada), yes(lucas), yes(maya)],
      },
    },
    {
      id: "priya-out",
      title: "Priya out of office",
      start: at(3),
      end: at(5),
      calendarId: "team",
      location: "Away",
      description: "Daniel covers on-call until Monday.",
      data: { reminderMinutes: 1440, guests: [host(priya), yes(daniel)] },
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
        conference: zoom("82470013365"),
        reminderMinutes: 10,
        guests: [
          host(lucas),
          yes(ada),
          yes(maya),
          yes(daniel),
          no(nora),
          yes(priya),
        ],
      },
    },
    {
      id: "one-on-one-daniel",
      title: "1:1 with Daniel",
      start: at(0, "11:30"),
      end: at(0, "12:00"),
      calendarId: "ada",
      location: "Vega booth",
      description: "On-call load and the migration date.",
      data: {
        conference: zoom("86631904412"),
        reminderMinutes: 10,
        guests: [host(ada), yes(daniel)],
      },
    },
    {
      id: "lunch-nora",
      title: "Lunch with Nora",
      start: at(0, "12:30"),
      end: at(0, "13:30"),
      calendarId: "personal",
      location: "Time Out Market",
      description: "Nora books the table.",
      data: { reminderMinutes: 15, guests: [host(nora), yes(ada)] },
    },
    {
      id: "focus-roadmap",
      title: "Focus: Q1 roadmap",
      start: at(0, "14:00"),
      end: at(0, "16:00"),
      calendarId: "ada",
      location: "Desk, notifications off",
      description: "Draft the three bets and how each one is measured.",
      data: {
        conference: zoom("87702216650"),
        reminderMinutes: 5,
        guests: [host(ada)],
      },
    },
    {
      id: "portfolio-review",
      title: "Portfolio review",
      start: at(0, "16:30"),
      end: at(0, "17:00"),
      calendarId: "maya",
      location: "Studio",
      description: "Four candidates for the design role.",
      data: {
        conference: zoom("85530072218"),
        reminderMinutes: 10,
        guests: [host(maya), yes(emma)],
      },
    },
    {
      id: "dentist",
      title: "Dentist",
      start: at(1, "08:15"),
      end: at(1, "09:00"),
      calendarId: "personal",
      location: "Clínica Sorriso, Rua Augusta 112",
      description: "Check-up. The insurance card is in the wallet app.",
      data: { reminderMinutes: 60, guests: [host(ada)] },
    },
    {
      id: "interview",
      title: "Interview: staff designer",
      start: at(1, "11:00"),
      end: at(1, "12:00"),
      calendarId: "ada",
      location: "Orion room, 2nd floor",
      description:
        "Your part is product sense: 35 minutes, then 10 for their questions. The portfolio and scorecard are linked.",
      data: {
        conference: zoom("84498120076"),
        reminderMinutes: 15,
        guests: [host(emma), yes(ada), yes(maya), maybe(tom)],
      },
    },
    {
      id: "design-review",
      title: "Design review: signup",
      start: at(1, "14:30"),
      end: at(1, "15:30"),
      calendarId: "team",
      location: "Studio",
      description:
        "Walk through the new first run and its empty states. Decide what ships on Thursday.",
      data: {
        conference: zoom("81047763329"),
        reminderMinutes: 10,
        guests: [host(maya), ada, yes(lucas), maybe(tom), yes(nora), emma],
      },
    },
    {
      id: "debrief",
      title: "Hiring debrief",
      start: at(1, "16:45"),
      end: at(1, "17:30"),
      calendarId: "maya",
      location: "Vega booth",
      description: "Scorecards in before we start.",
      data: {
        conference: zoom("88210034415"),
        reminderMinutes: 10,
        guests: [host(maya), yes(emma), maybe(tom)],
      },
    },
    {
      id: "research-workshop",
      title: "Research workshop",
      start: at(2, "10:00"),
      end: at(2, "11:30"),
      calendarId: "team",
      location: "Studio",
      description:
        "Sort last month's 24 interviews into themes. Nora brings the transcripts.",
      data: {
        conference: zoom("83317744820"),
        reminderMinutes: 10,
        guests: [host(nora), yes(ada), yes(maya), maybe(lucas)],
      },
    },
    {
      id: "vendor-demo",
      title: "Vendor demo",
      start: at(2, "13:00"),
      end: at(2, "13:45"),
      calendarId: "ada",
      location: "Zoom",
      description: "Survey tool renewal. Tom decides.",
      data: {
        conference: zoom("86690155274"),
        reminderMinutes: 10,
        guests: [host(tom), no(ada), yes(nora)],
      },
    },
    {
      id: "pricing-review",
      title: "Pricing review",
      start: at(2, "14:30"),
      end: at(2, "15:30"),
      calendarId: "ada",
      location: "Orion room, 2nd floor",
      description:
        "Seats or usage for the team plan. Emma shares the model on Tuesday.",
      data: {
        conference: zoom("82259917740"),
        reminderMinutes: 10,
        guests: [host(emma), maybe(ada), yes(tom), daniel],
      },
    },
    {
      id: "all-hands",
      title: "All hands",
      start: at(2, "17:00"),
      end: at(2, "18:00"),
      calendarId: "company",
      location: "Main floor",
      description: "Launch numbers, then questions for Emma and Tom.",
      data: {
        conference: zoom("80014427781"),
        reminderMinutes: 10,
        guests: [host(emma), yes(ada), yes(lucas), yes(maya), yes(tom)],
      },
    },
    {
      id: "launch-checklist",
      title: "Launch checklist",
      start: at(3, "08:30"),
      end: at(3, "09:15"),
      calendarId: "ada",
      location: "Desk",
      description: "Status page, docs, changelog, support macros.",
      data: {
        conference: zoom("87745500182"),
        reminderMinutes: 5,
        guests: [host(ada), yes(lucas)],
      },
    },
    {
      id: "northwind",
      title: "Northwind renewal call",
      start: at(3, "13:00"),
      end: at(3, "14:00"),
      calendarId: "ada",
      location: "Zoom",
      description:
        "Renewal for 120 seats. The pricing sheet is in the deal room; Sofia wants SSO in the contract.",
      data: {
        conference: zoom("85520981147"),
        reminderMinutes: 15,
        guests: [host(ada), yes(sofia), maybe(tom)],
      },
    },
    {
      id: "rehearsal",
      title: "Launch rehearsal",
      start: at(3, "15:00"),
      end: at(3, "16:30"),
      calendarId: "team",
      location: "Main floor",
      description: "Full run with slides and the live demo, twice.",
      data: {
        conference: zoom("81873309956"),
        reminderMinutes: 10,
        guests: [host(lucas), yes(ada), yes(maya), yes(emma), maybe(tom)],
      },
    },
    {
      id: "dinner",
      title: "Dinner with Ana",
      start: at(3, "19:00"),
      end: at(3, "21:00"),
      calendarId: "personal",
      location: "Prado, Lisbon",
      description: "Table for four under Ana's name.",
      data: { reminderMinutes: 60, guests: [host(ada)] },
    },
    {
      id: "focus-notes",
      title: "Focus: launch notes",
      start: at(4, "10:00"),
      end: at(4, "12:00"),
      calendarId: "ada",
      location: "Desk, notifications off",
      description: "What we learned, what breaks first, what comes next.",
      data: {
        conference: zoom("87702216650"),
        reminderMinutes: 5,
        guests: [host(ada)],
      },
    },
    {
      id: "team-lunch",
      title: "Team lunch",
      start: at(4, "12:30"),
      end: at(4, "13:30"),
      calendarId: "team",
      location: "Mercado de Campo de Ourique",
      description: "Say if you don't eat fish by Thursday.",
      data: {
        conference: zoom("84211903377"),
        reminderMinutes: 15,
        guests: [host(nora), ada, yes(maya), yes(lucas), yes(daniel)],
      },
    },
    {
      id: "retro",
      title: "Retro",
      start: at(4, "14:30"),
      end: at(4, "15:15"),
      calendarId: "team",
      location: "Atlas room, 3rd floor",
      description: "Two notes each: keep one, change one.",
      data: {
        conference: zoom("83360047718"),
        reminderMinutes: 10,
        guests: [host(daniel), yes(ada), yes(lucas), yes(maya), maybe(nora)],
      },
    },
    {
      id: "demo-hour",
      title: "Demo hour",
      start: at(4, "16:00"),
      end: at(4, "17:00"),
      calendarId: "company",
      location: "Main floor",
      description: "Three teams, ten minutes each.",
      data: {
        conference: zoom("80014427781"),
        reminderMinutes: 10,
        guests: [host(tom), yes(ada), yes(emma)],
      },
    },
    {
      id: "market",
      title: "Farmers' market",
      start: at(5, "10:00"),
      end: at(5, "11:30"),
      calendarId: "personal",
      location: "Príncipe Real",
      description: "Persimmons, eggs, the good bread.",
      data: { reminderMinutes: 30, guests: [host(ada)] },
    },
    {
      id: "swim",
      title: "Swim with Nora",
      start: at(6, "10:30"),
      end: at(6, "11:30"),
      calendarId: "personal",
      location: "Piscina do Oriente",
      description: "Lane 4 is ours until noon.",
      data: { reminderMinutes: 60, guests: [host(nora), yes(ada)] },
    },
    ...createNeighbouringWeeks(at),
    ...createColleagueEvents(at),
  ]
}

type At = (offset: number, time?: string) => string

/** The weeks around this one, so the month and the agenda are as full. */
function createNeighbouringWeeks(at: At): CalendarAppEvent[] {
  const work = (
    id: string,
    title: string,
    [day, from, to]: [number, string, string],
    calendarId: "ada" | "team",
    location: string,
    description: string,
    guests: CalendarAppGuest[]
  ): CalendarAppEvent => ({
    id,
    title,
    start: at(day, from),
    end: at(day, to),
    calendarId,
    location,
    description,
    data: {
      conference: zoom("84498120076"),
      reminderMinutes: 10,
      guests,
    },
  })

  return [
    work(
      "board-prep",
      "Board prep",
      [-20, "14:00", "15:30"],
      "ada",
      "Orion room, 2nd floor",
      "Twelve slides at most.",
      [host(emma), yes(ada), yes(tom)]
    ),
    work(
      "usability",
      "Usability sessions",
      [-18, "13:00", "16:00"],
      "team",
      "Studio",
      "Five people, half an hour each.",
      [host(nora), yes(ada), yes(maya)]
    ),
    work(
      "planning-past",
      "Sprint planning",
      [-14, "10:00", "11:00"],
      "team",
      "Atlas room, 3rd floor",
      "Carry over what didn't ship.",
      [host(lucas), yes(ada), yes(daniel)]
    ),
    work(
      "security-review",
      "Security review",
      [-12, "15:00", "16:00"],
      "team",
      "Vega booth",
      "Access logs and the new roles.",
      [host(daniel), yes(ada), yes(tom)]
    ),
    work(
      "northwind-visit",
      "Northwind visit",
      [-10, "11:00", "13:00"],
      "ada",
      "Northwind, Porto",
      "See how their support team works.",
      [host(ada), yes(sofia), yes(maya)]
    ),
    work(
      "copy-review",
      "Copy review",
      [-6, "11:00", "11:45"],
      "team",
      "Studio",
      "Empty states and errors.",
      [host(maya), yes(ada)]
    ),
    work(
      "pricing-kickoff",
      "Pricing kickoff",
      [-5, "14:30", "15:30"],
      "ada",
      "Orion room, 2nd floor",
      "What the team plan costs to run.",
      [host(emma), yes(ada), yes(tom)]
    ),
    work(
      "bug-bash",
      "Bug bash",
      [-3, "13:00", "15:00"],
      "team",
      "Main floor",
      "Everyone on a phone.",
      [host(lucas), yes(ada), yes(nora), yes(daniel)]
    ),
    {
      id: "berlin",
      title: "Berlin: design summit",
      start: at(8),
      end: at(11),
      calendarId: "ada",
      location: "Station Berlin",
      description: "Flights and hotel are in the trip folder.",
      data: {
        reminderMinutes: 1440,
        guests: [host(ada), yes(maya)],
      },
    },
    work(
      "launch-review",
      "Launch review",
      [7, "11:00", "12:00"],
      "team",
      "Orion room, 2nd floor",
      "The first week in numbers.",
      [host(ada), yes(lucas), yes(emma), priya]
    ),
    work(
      "performance",
      "Performance reviews",
      [11, "13:00", "15:00"],
      "ada",
      "Vega booth",
      "Three of five, an hour each at most.",
      [host(ada), yes(emma)]
    ),
    work(
      "planning-next",
      "Sprint planning",
      [14, "10:00", "11:00"],
      "team",
      "Atlas room, 3rd floor",
      "Last sprint before the break.",
      [host(lucas), ada, yes(daniel)]
    ),
    work(
      "roadmap-review",
      "Q1 roadmap review",
      [16, "14:00", "15:30"],
      "ada",
      "Orion room, 2nd floor",
      "Decide the three bets.",
      [host(ada), yes(emma), yes(tom), maybe(lucas)]
    ),
    work(
      "year-end",
      "Year-end dinner",
      [18, "19:00", "22:00"],
      "team",
      "Cervejaria Ramiro",
      "Partners welcome.",
      [host(nora), yes(ada), yes(maya), yes(lucas)]
    ),
    {
      id: "winter-break",
      title: "Winter break",
      start: at(28),
      end: at(35),
      calendarId: "company",
      location: "All offices",
      description: "Offices close; on-call stays on.",
      data: { reminderMinutes: 1440, guests: [host(emma), yes(ada)] },
    },
  ]
}

/** What shows once a colleague's calendar is added. */
function createColleagueEvents(at: At): CalendarAppEvent[] {
  return CALENDAR_APP_COLLEAGUES.flatMap(({ id: calendarId, name }, index) => {
    const person = Object.values(PEOPLE).find(({ id }) => id === calendarId)
    const guests = person ? [host(person)] : []
    return [1, 2, 4].map(
      (day): CalendarAppEvent => ({
        id: `${calendarId}-${day}`,
        title: "Busy",
        start: at(day, `${pad(16 + (index % 2))}:00`),
        end: at(day, `${pad(16 + (index % 2))}:45`),
        calendarId,
        location: "Not shared",
        description: `${name} shares only when they are busy.`,
        data: { conference: zoom("80000000000"), reminderMinutes: 10, guests },
      })
    )
  })
}
