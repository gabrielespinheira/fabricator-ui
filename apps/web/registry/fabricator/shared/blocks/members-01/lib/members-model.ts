// What the members page knows: roles and who may change them, seats, the
// invite box's addresses, and the order and filters of the list. Pure, so it
// runs the same on the server, in the browser and in tests.

export type MemberRole = "owner" | "admin" | "member" | "viewer"

export type MemberSession = {
  id: string
  device: string
  kind: "desktop" | "phone"
  place: string
  lastActiveAt: string
  isCurrent?: boolean
}

export type MemberActivity = { id: string; text: string; at: string }

export type Person = {
  kind: "person"
  id: string
  name: string
  email: string
  photo?: string
  role: MemberRole
  teams: string[]
  lastActiveAt: string
  joinedAt: string
  hasTwoFactor: boolean
  signIn: string
  /** Work that needs a new owner when this person goes. */
  owns: { projects: number; reports: number }
  sessions: MemberSession[]
  activity: MemberActivity[]
}

export type InvitationStatus = "pending" | "expired" | "undelivered"

export type Invitation = {
  kind: "invitation"
  id: string
  email: string
  name?: string
  role: MemberRole
  status: InvitationStatus
  sentAt: string
  invitedBy: string
}

export type TeamRow = Person | Invitation

export const MEMBER_ROLES: {
  value: MemberRole
  label: string
  description: string
}[] = [
  {
    value: "owner",
    label: "Owner",
    description: "Everything, including billing and deleting the workspace",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Invites people, changes roles and edits every project",
  },
  {
    value: "member",
    label: "Member",
    description: "Creates projects and edits the ones shared with them",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Reads and comments, and changes nothing",
  },
]

export function isMemberRole(value: unknown): value is MemberRole {
  return MEMBER_ROLES.some((role) => role.value === value)
}

export function getRoleLabel(role: MemberRole) {
  return MEMBER_ROLES.find(({ value }) => value === role)?.label ?? "Member"
}

/** "Viewer", with the article a sentence needs: "a Viewer", "an Admin". */
export function getRoleWithArticle(role: MemberRole) {
  const label = getRoleLabel(role)
  return `${/^[AO]/.test(label) ? "an" : "a"} ${label}`
}

// People and rows

export function getPeople(rows: readonly TeamRow[]) {
  return rows.filter((row): row is Person => row.kind === "person")
}

export function getInvitations(rows: readonly TeamRow[]) {
  return rows.filter((row): row is Invitation => row.kind === "invitation")
}

export function getRowName(row: TeamRow) {
  return row.name ?? row.email
}

export function getFirstName(name: string) {
  return name.split(" ")[0] ?? name
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

/** A steady hue per person, so initials keep their colour everywhere. */
export function getAvatarHue(id: string) {
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 360
  return hash
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`
) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function describeOwned({ projects, reports }: Person["owns"]) {
  return [
    projects > 0 && pluralize(projects, "project"),
    reports > 0 && pluralize(reports, "report"),
  ]
    .filter(Boolean)
    .join(" and ")
}

export function isProblem(row: TeamRow) {
  return row.kind === "invitation" && row.status !== "pending"
}

// Seats

export type Seats = { total: number; pricePerSeat: number; renewsAt: string }

/** Every person holds a seat, and so does an invitation still waiting. */
export function countSeatsUsed(rows: readonly TeamRow[]) {
  return rows.filter((row) => row.kind === "person" || row.status === "pending")
    .length
}

export function getTeamSummary(rows: readonly TeamRow[], seats: Seats) {
  const people = getPeople(rows).length
  const waiting = getInvitations(rows).filter(
    ({ status }) => status === "pending"
  ).length
  return [
    pluralize(people, "person", "people"),
    waiting > 0 && `${pluralize(waiting, "invitation")} waiting`,
    `${countSeatsUsed(rows)} of ${seats.total} seats used`,
  ]
    .filter(Boolean)
    .join(", ")
    .concat(".")
}

export type SeatPlan = {
  used: number
  /** Seats the invitations take that the plan has. */
  filled: number
  /** Invitations past the last seat. */
  over: number
  free: number
  total: number
  monthlyCost: number
  /** What the added seats cost until the plan renews. */
  costUntilRenewal: number
}

const DAY = 86_400_000

export function getSeatPlan(
  seats: Seats,
  { used, invited, now }: { used: number; invited: number; now: string }
): SeatPlan {
  const free = Math.max(0, seats.total - used)
  const filled = Math.min(free, invited)
  const over = invited - filled
  return {
    used,
    filled,
    over,
    free,
    total: seats.total,
    monthlyCost: over * seats.pricePerSeat,
    costUntilRenewal: getCostUntilRenewal(seats, over, now),
  }
}

/** The part of the month left until the plan renews, to the cent. */
export function getCostUntilRenewal(seats: Seats, count: number, now: string) {
  const renewal = new Date(seats.renewsAt)
  const start = new Date(renewal)
  start.setUTCMonth(start.getUTCMonth() - 1)
  const month = (renewal.getTime() - start.getTime()) / DAY
  const left = Math.max(
    0,
    Math.ceil((renewal.getTime() - new Date(now).getTime()) / DAY)
  )
  return (
    Math.round(
      ((count * seats.pricePerSeat * Math.min(left, month)) / month) * 100
    ) / 100
  )
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

// Roles

export type RoleChange =
  | { kind: "allowed" }
  | { kind: "confirm-self" }
  | { kind: "blocked"; reason: string }

function isLastOwner(people: readonly Person[], person: Person) {
  return (
    person.role === "owner" &&
    people.filter(({ role }) => role === "owner").length === 1
  )
}

/** Whether a role can change, and what has to be said first. */
export function getRoleChange(
  people: readonly Person[],
  person: Person,
  next: MemberRole,
  meId: string
): RoleChange {
  if (person.role === next) return { kind: "allowed" }
  if (isLastOwner(people, person)) {
    return {
      kind: "blocked",
      reason: "A workspace needs an owner. Make someone else an owner first.",
    }
  }
  const me = people.find(({ id }) => id === meId)
  if ((person.role === "owner" || next === "owner") && me?.role !== "owner") {
    return { kind: "blocked", reason: "Only an owner can change owners." }
  }
  if (person.id === meId && getRoleRank(next) > getRoleRank(person.role)) {
    return { kind: "confirm-self" }
  }
  return { kind: "allowed" }
}

function getRoleRank(role: MemberRole) {
  return MEMBER_ROLES.findIndex(({ value }) => value === role)
}

/** Why a person can't leave or be removed, or null when they can. */
export function getRemovalBlock(
  people: readonly Person[],
  person: Person,
  meId: string
) {
  if (isLastOwner(people, person)) {
    return person.id === meId
      ? "You are the only owner. Make someone else an owner first."
      : `${person.name} is the only owner.`
  }
  return null
}

/** People who can take over someone's work, most likely first. */
export function getHeirs(
  people: readonly Person[],
  leavingIds: readonly string[]
) {
  const leaving = people.filter(({ id }) => leavingIds.includes(id))
  const teams = new Set(leaving.flatMap((person) => person.teams))
  const score = (person: Person) =>
    person.teams.filter((team) => teams.has(team)).length
  return people
    .filter(({ id, role }) => !leavingIds.includes(id) && role !== "viewer")
    .toSorted(
      (a, b) => score(b) - score(a) || getRoleRank(a.role) - getRoleRank(b.role)
    )
}

export function setRoles(
  rows: readonly TeamRow[],
  ids: readonly string[],
  role: MemberRole
): TeamRow[] {
  return rows.map((row) => (ids.includes(row.id) ? { ...row, role } : row))
}

/** Takes people out and hands what they own to the heir. */
export function removeRows(
  rows: readonly TeamRow[],
  ids: readonly string[],
  heirId?: string
): TeamRow[] {
  const leaving = getPeople(rows).filter(({ id }) => ids.includes(id))
  const projects = leaving.reduce((sum, { owns }) => sum + owns.projects, 0)
  const reports = leaving.reduce((sum, { owns }) => sum + owns.reports, 0)
  return rows
    .filter(({ id }) => !ids.includes(id))
    .map((row) =>
      row.kind === "person" && row.id === heirId
        ? {
            ...row,
            owns: {
              projects: row.owns.projects + projects,
              reports: row.owns.reports + reports,
            },
          }
        : row
    )
}

// The list

export type MembersView = "all" | "people" | "invited"

export const MEMBERS_VIEWS: { value: MembersView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "people", label: "Members" },
  { value: "invited", label: "Invited" },
]

export function isMembersView(value: unknown): value is MembersView {
  return MEMBERS_VIEWS.some((view) => view.value === value)
}

export type MembersFilter = {
  view: MembersView
  query: string
  roles: readonly MemberRole[]
}

const PROBLEM_ORDER: Record<InvitationStatus, number> = {
  undelivered: 0,
  expired: 1,
  pending: 2,
}

/** What needs someone first, then everybody by name. */
export function sortRows(rows: readonly TeamRow[]) {
  const rank = (row: TeamRow) =>
    row.kind === "invitation"
      ? PROBLEM_ORDER[row.status]
      : PROBLEM_ORDER.pending
  return rows.toSorted(
    (a, b) =>
      rank(a) - rank(b) || getRowName(a).localeCompare(getRowName(b), "en")
  )
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

export function filterRows(
  rows: readonly TeamRow[],
  { view, query, roles }: MembersFilter
) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  return rows.filter((row) => {
    if (view === "people" && row.kind !== "person") return false
    if (view === "invited" && row.kind !== "invitation") return false
    if (roles.length > 0 && !roles.includes(row.role)) return false
    const text = normalize(
      [
        getRowName(row),
        row.email,
        ...(row.kind === "person" ? row.teams : []),
      ].join(" ")
    )
    return words.every((word) => text.includes(word))
  })
}

// The invite box

export type ParsedAddress = { email: string; name?: string }

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/

export function isEmail(text: string) {
  return EMAIL.test(text)
}

function cleanAddress(text: string) {
  return text
    .replace(/^mailto:/i, "")
    .replace(/^[<"'(]+|[>"').]+$/g, "")
    .toLowerCase()
}

/**
 * Reads a pasted list: commas, semicolons, spaces, tabs and lines between
 * addresses, and the `Name <email>` a mail app copies.
 */
export function parseAddresses(text: string): ParsedAddress[] {
  const found = new Map<string, ParsedAddress>()
  const add = (email: string, name?: string) => {
    const clean = cleanAddress(email)
    if (!clean) return
    const known = found.get(clean)
    found.set(clean, { email: clean, name: known?.name ?? (name || undefined) })
  }
  const rest = text.replace(
    /(?:"([^"]*)"|([^<>,;\n\r\t"]*?))\s*<([^<>\s]+)>/g,
    (_match, quoted?: string, plain?: string, email?: string) => {
      const { name, before } = splitName(quoted ?? plain ?? "")
      for (const part of before) add(part)
      if (email) add(email, name)
      return " "
    }
  )
  for (const part of rest.split(/[\s,;]+/)) add(part)
  return [...found.values()]
}

// "lee@acme.com Tom Becker" in front of <tom@acme.com>: the first is its own
// address, the rest is the name.
function splitName(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const before = words.filter((word) => word.includes("@"))
  const name = words.filter((word) => !word.includes("@")).join(" ")
  return { name, before }
}

/** Letters apart: one typo, one swap or one missing letter. */
function isNearly(a: string, b: string) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false
  let start = 0
  while (start < a.length && a[start] === b[start]) start++
  let end = 0
  while (
    end < Math.min(a.length, b.length) - start &&
    a[a.length - 1 - end] === b[b.length - 1 - end]
  ) {
    end++
  }
  const restA = a.slice(start, a.length - end)
  const restB = b.slice(start, b.length - end)
  if (restA.length <= 1 && restB.length <= 1) return true
  return (
    restA.length === 2 &&
    restB.length === 2 &&
    restA === [...restB].toReversed().join("")
  )
}

/** The address they probably meant, when a domain is a slip away. */
export function suggestAddress(email: string, domains: readonly string[]) {
  const [name, domain] = email.split("@")
  if (!name || !domain) return null
  const match = domains.find((known) => isNearly(domain, known))
  return match ? `${name}@${match}` : null
}

export type AddressProblem =
  | { kind: "invalid" }
  | { kind: "member"; name: string }
  | { kind: "invited" }
  | { kind: "typo"; suggestion: string }
  | { kind: "domain" }
  | { kind: "seat" }

export type CheckedAddress = ParsedAddress & { problem: AddressProblem | null }

export type AddressRules = {
  rows: readonly TeamRow[]
  domains: readonly string[]
  /** Outside addresses someone chose to invite anyway. */
  allowed: readonly string[]
  freeSeats: number
}

/** Checks each address in order; the ones past the last seat come last. */
export function checkAddresses(
  addresses: readonly ParsedAddress[],
  { rows, domains, allowed, freeSeats }: AddressRules
): CheckedAddress[] {
  let free = freeSeats
  return addresses.map((address) => {
    const problem = getAddressProblem(address, { rows, domains, allowed })
    if (problem) return { ...address, problem }
    free -= 1
    return { ...address, problem: free < 0 ? { kind: "seat" } : null }
  })
}

function getAddressProblem(
  { email }: ParsedAddress,
  { rows, domains, allowed }: Omit<AddressRules, "freeSeats">
): AddressProblem | null {
  if (!isEmail(email)) return { kind: "invalid" }
  const known = rows.find((row) => row.email === email)
  if (known?.kind === "person") return { kind: "member", name: known.name }
  if (known?.kind === "invitation" && known.status === "pending") {
    return { kind: "invited" }
  }
  const domain = email.split("@")[1] ?? ""
  if (domains.includes(domain) || allowed.includes(email)) return null
  const suggestion = suggestAddress(email, domains)
  return suggestion ? { kind: "typo", suggestion } : { kind: "domain" }
}

export function describeProblem(
  problem: AddressProblem,
  domains: readonly string[]
) {
  switch (problem.kind) {
    case "invalid":
      return "This is not an email address"
    case "member":
      return `${problem.name} is already a member`
    case "invited":
      return "Already invited, and still waiting"
    case "typo":
      return `Did you mean ${problem.suggestion}?`
    case "domain":
      return `Outside ${domains.join(" and ")}`
    case "seat":
      return "No seat left"
  }
}

export type SendFailure = { email: string; reason: string }

/** New invitation rows, replacing any lapsed one for the same address. */
export function addInvitations(
  rows: readonly TeamRow[],
  addresses: readonly ParsedAddress[],
  { role, invitedBy, sentAt }: Pick<Invitation, "role" | "invitedBy" | "sentAt">
): TeamRow[] {
  const emails = new Set(addresses.map(({ email }) => email))
  return [
    ...rows.filter(
      (row) => !(row.kind === "invitation" && emails.has(row.email))
    ),
    ...addresses.map(
      ({ email, name }): Invitation => ({
        kind: "invitation",
        id: `invitation-${email}`,
        email,
        name,
        role,
        status: "pending",
        sentAt,
        invitedBy,
      })
    ),
  ]
}

// Time

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

export function formatDay(iso: string) {
  return dayFormat.format(new Date(iso))
}

/** "Now", "12 min ago", "3 hours ago", "Yesterday", "4 days ago", "Nov 3". */
export function formatAgo(iso: string, now: string) {
  const elapsed = new Date(now).getTime() - new Date(iso).getTime()
  if (elapsed < 2 * MINUTE) return "Now"
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`
  const days =
    Math.floor(new Date(now).getTime() / DAY) -
    Math.floor(new Date(iso).getTime() / DAY)
  if (days === 0) return `${pluralize(Math.floor(elapsed / HOUR), "hour")} ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return formatDay(iso)
}
