import { describe, expect, it } from "vitest"

import {
  addInvitations,
  checkAddresses,
  countSeatsUsed,
  describeOwned,
  filterRows,
  formatAgo,
  getAvatarHue,
  getCostUntilRenewal,
  getHeirs,
  getPeople,
  getRemovalBlock,
  getRoleChange,
  getRoleWithArticle,
  getSeatPlan,
  getTeamSummary,
  parseAddresses,
  removeRows,
  setRoles,
  sortRows,
  suggestAddress,
  type Invitation,
  type Person,
  type TeamRow,
} from "./members-model"

const NOW = "2026-11-24T14:00:00Z"
const SEATS = { total: 5, pricePerSeat: 12, renewsAt: "2026-12-01T00:00:00Z" }

function person(id: string, over: Partial<Person> = {}): Person {
  return {
    kind: "person",
    id,
    name: id,
    email: `${id}@acme.com`,
    role: "member",
    teams: [],
    lastActiveAt: NOW,
    joinedAt: NOW,
    hasTwoFactor: true,
    signIn: "Google",
    owns: { projects: 0, reports: 0 },
    sessions: [],
    activity: [],
    ...over,
  }
}

function invitation(email: string, status: Invitation["status"]): Invitation {
  return {
    kind: "invitation",
    id: email,
    email,
    role: "member",
    status,
    sentAt: NOW,
    invitedBy: "Ada",
  }
}

const rows: TeamRow[] = [
  person("tom"),
  person("ada", { name: "Ada Lovelace", role: "owner", teams: ["Product"] }),
  person("maya", { name: "Zoë Chen", role: "admin", teams: ["Design"] }),
  invitation("lee@acme.com", "pending"),
  invitation("old@acme.com", "expired"),
  invitation("bad@acme.com", "undelivered"),
]

describe("parseAddresses", () => {
  it("splits on commas, semicolons, spaces and lines", () => {
    expect(
      parseAddresses("a@acme.com, b@acme.com;c@acme.com d@acme.com\ne@acme.com")
        .map(({ email }) => email)
        .join(" ")
    ).toBe("a@acme.com b@acme.com c@acme.com d@acme.com e@acme.com")
  })

  it("keeps the name of `Name <email>`, quoted or not", () => {
    expect(
      parseAddresses(
        'Tom Becker <Tom@Acme.com>, "Ahmed, Nora" <nora@acme.com>\nlee@acme.com'
      )
    ).toEqual([
      { email: "tom@acme.com", name: "Tom Becker" },
      { email: "nora@acme.com", name: "Ahmed, Nora" },
      { email: "lee@acme.com", name: undefined },
    ])
  })

  it("drops repeats, punctuation and mailto", () => {
    expect(
      parseAddresses("mailto:a@acme.com, A@acme.com. (b@acme.com)").map(
        ({ email }) => email
      )
    ).toEqual(["a@acme.com", "b@acme.com"])
  })

  it("keeps what is not an address, to be marked", () => {
    expect(parseAddresses("maya")).toEqual([{ email: "maya", name: undefined }])
    expect(parseAddresses("  \n ")).toEqual([])
  })

  it("separates an address sitting in front of a named one", () => {
    expect(
      parseAddresses("lee@acme.com Tom Becker <tom@acme.com>").map(
        ({ email, name }) => `${email}:${name ?? ""}`
      )
    ).toEqual(["lee@acme.com:", "tom@acme.com:Tom Becker"])
  })
})

describe("suggestAddress", () => {
  it("offers the domain a slip away", () => {
    expect(suggestAddress("a@acme.con", ["acme.com"])).toBe("a@acme.com")
    expect(suggestAddress("a@amce.com", ["acme.com"])).toBe("a@acme.com")
    expect(suggestAddress("a@acme.co", ["acme.com"])).toBe("a@acme.com")
    expect(suggestAddress("a@northwind.io", ["acme.com"])).toBeNull()
  })
})

describe("checkAddresses", () => {
  const rules = {
    rows,
    domains: ["acme.com"],
    allowed: [],
    freeSeats: 1,
  }
  const kinds = (text: string, over = {}) =>
    checkAddresses(parseAddresses(text), { ...rules, ...over }).map(
      ({ problem }) => problem?.kind ?? "ok"
    )

  it("names each problem", () => {
    expect(
      kinds("nope tom@acme.com lee@acme.com x@acme.con sofia@northwind.io")
    ).toEqual(["invalid", "member", "invited", "typo", "domain"])
  })

  it("marks only the addresses past the last seat", () => {
    expect(kinds("a@acme.com tom@acme.com b@acme.com")).toEqual([
      "ok",
      "member",
      "seat",
    ])
  })

  it("lets an expired invitation be sent again", () => {
    expect(kinds("old@acme.com")).toEqual(["ok"])
  })

  it("accepts an outside address someone allowed", () => {
    expect(
      kinds("sofia@northwind.io", { allowed: ["sofia@northwind.io"] })
    ).toEqual(["ok"])
  })
})

describe("seats", () => {
  it("counts people and waiting invitations", () => {
    expect(countSeatsUsed(rows)).toBe(4)
    expect(getTeamSummary(rows, SEATS)).toBe(
      "3 people, 1 invitation waiting, 4 of 5 seats used."
    )
    expect(getTeamSummary(getPeople(rows).slice(0, 1), SEATS)).toBe(
      "1 person, 1 of 5 seats used."
    )
  })

  it("splits invitations into seats taken and seats to add", () => {
    expect(getSeatPlan(SEATS, { used: 4, invited: 3, now: NOW })).toMatchObject(
      {
        free: 1,
        filled: 1,
        over: 2,
        monthlyCost: 24,
      }
    )
  })

  it("charges the days left until the plan renews", () => {
    expect(getCostUntilRenewal(SEATS, 2, NOW)).toBe(5.6)
    expect(getCostUntilRenewal(SEATS, 2, "2026-12-02T00:00:00Z")).toBe(0)
  })
})

describe("roles", () => {
  const people = getPeople(rows)
  const [tom, ada, maya] = people

  it("keeps the last owner an owner", () => {
    expect(getRoleChange(people, ada, "member", "ada").kind).toBe("blocked")
    expect(getRemovalBlock(people, ada, "ada")).toContain("only owner")
  })

  it("confirms when you lower your own role", () => {
    const two = [tom, ada, { ...maya, role: "owner" as const }]
    expect(getRoleChange(two, ada, "member", "ada").kind).toBe("confirm-self")
    expect(getRemovalBlock(two, ada, "ada")).toBeNull()
  })

  it("leaves owners to owners", () => {
    expect(getRoleChange(people, tom, "owner", "maya").kind).toBe("blocked")
    expect(getRoleChange(people, tom, "owner", "ada").kind).toBe("allowed")
  })

  it("writes a role with its article", () => {
    expect(getRoleWithArticle("admin")).toBe("an Admin")
    expect(getRoleWithArticle("viewer")).toBe("a Viewer")
  })

  it("changes several roles at once", () => {
    expect(
      setRoles(rows, ["tom", "lee@acme.com"], "viewer").filter(
        ({ role }) => role === "viewer"
      )
    ).toHaveLength(2)
  })
})

describe("removing people", () => {
  const people = [
    person("leaving", { teams: ["Design"], owns: { projects: 3, reports: 1 } }),
    person("owner", { role: "owner" }),
    person("teammate", {
      teams: ["Design"],
      owns: { projects: 1, reports: 0 },
    }),
    person("viewer", { role: "viewer", teams: ["Design"] }),
  ]

  it("says what they own", () => {
    expect(describeOwned({ projects: 3, reports: 1 })).toBe(
      "3 projects and 1 report"
    )
    expect(describeOwned({ projects: 0, reports: 0 })).toBe("")
  })

  it("offers teammates first, never viewers or the person leaving", () => {
    expect(getHeirs(people, ["leaving"]).map(({ id }) => id)).toEqual([
      "teammate",
      "owner",
    ])
  })

  it("hands their work over", () => {
    const left = getPeople(removeRows(people, ["leaving"], "teammate"))
    expect(left.map(({ id }) => id)).not.toContain("leaving")
    expect(left.find(({ id }) => id === "teammate")?.owns).toEqual({
      projects: 4,
      reports: 1,
    })
  })
})

describe("the list", () => {
  it("puts problems first, then everyone by name", () => {
    expect(sortRows(rows).map(({ id }) => id)).toEqual([
      "bad@acme.com",
      "old@acme.com",
      "ada",
      "lee@acme.com",
      "tom",
      "maya",
    ])
  })

  it("filters by view, role and words, ignoring accents", () => {
    const ids = (filter: Partial<Parameters<typeof filterRows>[1]>) =>
      filterRows(rows, { view: "all", query: "", roles: [], ...filter }).map(
        ({ id }) => id
      )
    expect(ids({ view: "invited" })).toHaveLength(3)
    expect(ids({ view: "people", roles: ["owner", "admin"] })).toEqual([
      "ada",
      "maya",
    ])
    expect(ids({ query: "zoe CHEN" })).toEqual(["maya"])
    expect(ids({ query: "product" })).toEqual(["ada"])
    expect(ids({ query: "nobody" })).toEqual([])
  })

  it("replaces a lapsed invitation for the same address", () => {
    const next = addInvitations(
      rows,
      [{ email: "old@acme.com" }, { email: "new@acme.com", name: "New" }],
      { role: "viewer", invitedBy: "Ada", sentAt: NOW }
    )
    expect(next.filter(({ email }) => email === "old@acme.com")).toHaveLength(1)
    expect(countSeatsUsed(next)).toBe(6)
  })
})

describe("formatAgo", () => {
  it("goes from now to a date", () => {
    expect(formatAgo("2026-11-24T13:59:30Z", NOW)).toBe("Now")
    expect(formatAgo("2026-11-24T13:48:00Z", NOW)).toBe("12 min ago")
    expect(formatAgo("2026-11-24T11:00:00Z", NOW)).toBe("3 hours ago")
    expect(formatAgo("2026-11-23T23:00:00Z", NOW)).toBe("Yesterday")
    expect(formatAgo("2026-11-20T10:00:00Z", NOW)).toBe("4 days ago")
    expect(formatAgo("2026-11-03T10:00:00Z", NOW)).toBe("Nov 3")
  })
})

describe("getAvatarHue", () => {
  it("is steady and a hue", () => {
    expect(getAvatarHue("priya")).toBe(getAvatarHue("priya"))
    expect(getAvatarHue("priya")).toBeLessThan(360)
  })
})
