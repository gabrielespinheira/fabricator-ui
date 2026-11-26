import { describe, expect, it } from "vitest"

import { BOARD_PROPERTIES, createBoardProjects } from "./board-data"
import {
  countOpenTickets,
  createFilters,
  describeChange,
  formatTicketTime,
  getActiveViewId,
  getFilterDefaults,
  getNextTicketNumber,
  getTicketLink,
  getTicketValue,
  isSameFilters,
  moveTicket,
  readTicketLink,
  recordChanges,
  setTicketValue,
  toggleMember,
  type BoardTicket,
} from "./board-model"

const NOW = new Date(2026, 10, 25, 12).getTime()
const MINUTE = 60_000

function ticket(patch: Partial<BoardTicket> = {}): BoardTicket {
  return {
    id: "SHOP-1",
    title: "Split payments",
    description: "",
    subtasks: [],
    activity: [],
    values: { status: "planned", priority: "low" },
    ...patch,
  }
}

const by = (at = NOW) => ({
  personId: "maya",
  at,
  createId: () => "change",
})

describe("getTicketValue", () => {
  it("reads the parts that aren't stored as values", () => {
    const entry = ticket({
      subtasks: [
        { id: "a", title: "One", isDone: true },
        { id: "b", title: "Two", isDone: false },
      ],
      activity: [
        { id: "c", kind: "comment", personId: "maya", at: NOW, text: "Hi" },
      ],
    })
    expect(getTicketValue(entry, "key")).toBe("SHOP-1")
    expect(getTicketValue(entry, "subtasks")).toEqual({ done: 1, total: 2 })
    expect(getTicketValue(entry, "comments")).toBe(1)
    expect(getTicketValue(entry, "priority")).toBe("low")
  })

  it("has nothing to count on a bare ticket", () => {
    expect(getTicketValue(ticket(), "subtasks")).toBeUndefined()
    expect(getTicketValue(ticket(), "comments")).toBeUndefined()
  })
})

describe("setTicketValue", () => {
  it("changes one value and leaves the ticket it was given alone", () => {
    const before = ticket()
    expect(setTicketValue(before, "priority", "high").values).toEqual({
      status: "planned",
      priority: "high",
    })
    expect(before.values.priority).toBe("low")
  })
})

describe("moveTicket", () => {
  const placement = {
    columnId: "review",
    laneId: "nora",
    afterId: null,
    beforeId: null,
    isEndLoaded: true,
  }

  it("writes the column, and the row when the board has rows", () => {
    expect(moveTicket(ticket(), placement, "assignee").values).toMatchObject({
      status: "review",
      assignee: "nora",
    })
    expect(
      moveTicket(ticket(), placement, undefined).values.assignee
    ).toBeUndefined()
  })

  it("clears the value in the row for tickets without one", () => {
    const moved = moveTicket(
      ticket({ values: { status: "planned", assignee: "maya" } }),
      { ...placement, laneId: null },
      "assignee"
    )
    expect(moved.values.assignee).toBeNull()
  })
})

describe("recordChanges", () => {
  it("adds what changed, once per property", () => {
    const before = [ticket()]
    const after = [ticket({ values: { status: "review", priority: "high" } })]
    const [entry] = recordChanges(before, after, by())
    expect(entry.activity).toEqual([
      {
        id: "change",
        kind: "change",
        personId: "maya",
        at: NOW,
        propertyId: "status",
        from: "planned",
        to: "review",
      },
      {
        id: "change",
        kind: "change",
        personId: "maya",
        at: NOW,
        propertyId: "priority",
        from: "low",
        to: "high",
      },
    ])
  })

  it("keeps untouched, new and reordered tickets as they are", () => {
    const first = ticket()
    const second = ticket({ id: "SHOP-2" })
    const created = ticket({ id: "SHOP-3" })
    expect(
      recordChanges([first, second], [second, first, created], by())
    ).toEqual([second, first, created])
  })

  it("joins changes made in quick succession", () => {
    const first = recordChanges(
      [ticket()],
      [ticket({ values: { status: "progress", priority: "low" } })],
      by()
    )
    const moved = first.map((entry) => setTicketValue(entry, "status", "done"))
    const [second] = recordChanges(first, moved, by(NOW + MINUTE))
    expect(second.activity).toMatchObject([{ from: "planned", to: "done" }])
  })

  it("drops a change that is taken straight back", () => {
    const first = recordChanges(
      [ticket()],
      [ticket({ values: { status: "progress", priority: "low" } })],
      by()
    )
    const back = first.map((entry) =>
      setTicketValue(entry, "status", "planned")
    )
    const [entry] = recordChanges(first, back, by(NOW + MINUTE))
    expect(entry.activity).toEqual([])
  })

  it("keeps changes made apart", () => {
    const first = recordChanges(
      [ticket()],
      [ticket({ values: { status: "progress", priority: "low" } })],
      by()
    )
    const moved = first.map((entry) => setTicketValue(entry, "status", "done"))
    const [entry] = recordChanges(first, moved, by(NOW + 10 * MINUTE))
    expect(entry.activity).toHaveLength(2)
  })

  it("compares lists by what they hold", () => {
    const before = [ticket({ values: { labels: ["api", "bug"] } })]
    const after = [ticket({ values: { labels: ["api", "bug"] } })]
    expect(recordChanges(before, after, by())[0].activity).toEqual([])
  })
})

describe("describeChange", () => {
  const change = (propertyId: string, from: unknown, to: unknown) =>
    describeChange({ propertyId, from, to }, BOARD_PROPERTIES)

  it("says what happened in words", () => {
    expect(change("status", "planned", "review")).toBe(
      "moved this from Planned to In review"
    )
    expect(change("assignee", null, "nora")).toBe("assigned this to Nora Ahmed")
    expect(change("assignee", "nora", null)).toBe("removed the assignee")
    expect(change("priority", "low", "high")).toBe("set the priority to High")
    expect(change("labels", ["api"], [])).toBe("cleared the labels")
    expect(change("labels", [], ["api", "bug"])).toBe(
      "set the labels to API, Bug"
    )
  })

  it("falls back when the property is gone", () => {
    expect(change("ghost", 1, 2)).toBe("changed this ticket")
  })
})

describe("filters", () => {
  const mine = createFilters(BOARD_PROPERTIES, { assignee: ["maya"] })
  const urgent = createFilters(BOARD_PROPERTIES, {
    priority: ["urgent", "high"],
  })
  const views = [
    { id: "all", filters: undefined },
    { id: "mine", filters: mine },
    { id: "urgent", filters: urgent },
  ]

  it("has no filters when nothing is picked", () => {
    expect(createFilters(BOARD_PROPERTIES, {})).toBeUndefined()
  })

  it("compares filters whatever their order", () => {
    expect(
      isSameFilters(
        urgent,
        createFilters(BOARD_PROPERTIES, { priority: ["high", "urgent"] })
      )
    ).toBe(true)
    expect(isSameFilters(mine, urgent)).toBe(false)
    expect(isSameFilters(undefined, undefined)).toBe(true)
    expect(isSameFilters(mine, undefined)).toBe(false)
  })

  it("finds the view the filters belong to, or none once they differ", () => {
    expect(getActiveViewId(views, undefined)).toBe("all")
    expect(getActiveViewId(views, urgent)).toBe("urgent")
    expect(
      getActiveViewId(
        views,
        createFilters(BOARD_PROPERTIES, {
          assignee: ["maya"],
          priority: ["high"],
        })
      )
    ).toBeNull()
  })

  it("adds and removes a person beside other filters", () => {
    const both = toggleMember(urgent, "nora", BOARD_PROPERTIES)
    expect(
      isSameFilters(
        both,
        createFilters(BOARD_PROPERTIES, {
          priority: ["urgent", "high"],
          assignee: ["nora"],
        })
      )
    ).toBe(true)
    expect(
      isSameFilters(toggleMember(both, "nora", BOARD_PROPERTIES), urgent)
    ).toBe(true)
  })

  it("counts the open tickets that match", () => {
    const tickets = [
      ticket({ values: { status: "planned", assignee: "maya" } }),
      ticket({ values: { status: "done", assignee: "maya" } }),
      ticket({ values: { status: "review", assignee: "nora" } }),
    ]
    expect(countOpenTickets(tickets, BOARD_PROPERTIES, undefined)).toBe(2)
    expect(countOpenTickets(tickets, BOARD_PROPERTIES, mine)).toBe(1)
  })
})

describe("getFilterDefaults", () => {
  it("gives a new ticket what the filters name, so it doesn't vanish", () => {
    expect(
      getFilterDefaults(
        createFilters(BOARD_PROPERTIES, {
          assignee: ["maya"],
          labels: ["bug"],
        }),
        BOARD_PROPERTIES
      )
    ).toEqual({ assignee: "maya", labels: ["bug"] })
  })

  it("takes the last of several, the mildest of a list by severity", () => {
    expect(
      getFilterDefaults(
        createFilters(BOARD_PROPERTIES, { priority: ["urgent", "high"] }),
        BOARD_PROPERTIES
      )
    ).toEqual({ priority: "high" })
  })

  it("leaves the column to where the ticket is added", () => {
    expect(
      getFilterDefaults(
        createFilters(BOARD_PROPERTIES, { status: ["done"] }),
        BOARD_PROPERTIES
      )
    ).toEqual({})
    expect(getFilterDefaults(undefined, BOARD_PROPERTIES)).toEqual({})
  })
})

describe("getNextTicketNumber", () => {
  it("continues after the highest number", () => {
    expect(
      getNextTicketNumber([ticket({ id: "SHOP-9" }), ticket({ id: "SHOP-10" })])
    ).toBe(11)
  })

  it("starts at one", () => {
    expect(getNextTicketNumber([])).toBe(1)
  })
})

describe("formatTicketTime", () => {
  it("is relative for a week, then a date", () => {
    expect(formatTicketTime(NOW - 20_000, NOW)).toBe("Just now")
    expect(formatTicketTime(NOW - 5 * MINUTE, NOW)).toBe("5m ago")
    expect(formatTicketTime(NOW - 3 * 60 * MINUTE, NOW)).toBe("3h ago")
    expect(formatTicketTime(NOW - 2 * 24 * 60 * MINUTE, NOW)).toBe("2d ago")
    expect(formatTicketTime(new Date(2026, 10, 2).getTime(), NOW)).toBe("Nov 2")
  })
})

describe("ticket links", () => {
  it("round-trips a ticket through the address", () => {
    const link = getTicketLink("https://acme.com/board?tab=1", "SHOP-118")
    expect(link).toBe("https://acme.com/board?tab=1&ticket=SHOP-118")
    expect(readTicketLink(link)).toBe("SHOP-118")
    expect(readTicketLink("https://acme.com/board")).toBeNull()
  })
})

describe("sample data", () => {
  const projects = createBoardProjects(new Date(NOW))

  it("gives every ticket a unique ID with its project's key", () => {
    const ids = projects.flatMap(({ key, tickets }) =>
      tickets.map(({ id }) => {
        expect(id.startsWith(`${key}-`)).toBe(true)
        return id
      })
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("only uses options that exist", () => {
    for (const property of BOARD_PROPERTIES) {
      if (!property.options) continue
      const values = new Set(property.options.map(({ value }) => value))
      for (const { tickets } of projects)
        for (const entry of tickets)
          for (const value of [entry.values[property.id] ?? []].flat())
            expect(values).toContain(value)
    }
  })

  it("stays within the columns' limits", () => {
    for (const { columns, tickets } of projects)
      for (const { id, limit } of columns)
        if (limit !== undefined)
          expect(
            tickets.filter(({ values }) => values.status === id).length
          ).toBeLessThanOrEqual(limit)
  })
})
