// What the flow asks, in which order, and what the answers make. Pure, so the
// screen, the saved answers and the preview can't disagree.

export type OnboardingUse = "projects" | "customers" | "reports"
export type OnboardingLayout = "board" | "list" | "charts"
export type OnboardingQuestion =
  | "use"
  | "team"
  | "workspace"
  | "connect"
  | "invite"
export type OnboardingStep = OnboardingQuestion | "review" | "ready"

export type OnboardingAnswers = {
  use: OnboardingUse | null
  layout: OnboardingLayout
  /** An index into ONBOARDING_SIZES. */
  size: number
  name: string
  address: string
  color: string
  sources: string[]
  invites: string[]
}

export const ONBOARDING_SIZES = [
  { label: "Just me", short: "1", teams: 0 },
  { label: "2 to 10 people", short: "2 to 10", teams: 1 },
  { label: "11 to 50 people", short: "11 to 50", teams: 2 },
  { label: "51 to 200 people", short: "51 to 200", teams: 3 },
  { label: "More than 200 people", short: "200+", teams: 4 },
]

export const ONBOARDING_COLORS = [
  { value: "#2563eb", label: "Blue" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#db2777", label: "Pink" },
  { value: "#ea580c", label: "Orange" },
  { value: "#059669", label: "Green" },
  { value: "#334155", label: "Slate" },
]

type UseRule = {
  title: string
  layouts: { value: OnboardingLayout; label: string; phrase: string }[]
  sources: { id: string; name: string; detail: string }[]
  teams: string[]
  ready: { label: string; detail: string }
}

const GOOGLE_CALENDAR = {
  id: "google-calendar",
  name: "Google Calendar",
  detail: "Meetings and deadlines in one place",
}

export const ONBOARDING_USES: Record<OnboardingUse, UseRule> = {
  projects: {
    title: "Projects",
    layouts: [
      { value: "board", label: "Board", phrase: "as a board" },
      { value: "list", label: "List", phrase: "as a list" },
    ],
    sources: [
      {
        id: "github",
        name: "GitHub",
        detail: "214 open issues become tasks",
      },
      { id: "figma", name: "Figma", detail: "Designs open inside their task" },
      GOOGLE_CALENDAR,
      {
        id: "linear",
        name: "Linear",
        detail: "Moves 3 teams and their cycles",
      },
    ],
    teams: ["Product", "Engineering", "Design", "Marketing"],
    ready: {
      label: "Create the first project",
      detail: "Name it and the board fills from your sources.",
    },
  },
  customers: {
    title: "Customers",
    layouts: [
      { value: "board", label: "Pipeline", phrase: "as a pipeline" },
      { value: "list", label: "List", phrase: "as a list" },
    ],
    sources: [
      {
        id: "hubspot",
        name: "HubSpot",
        detail: "1,248 contacts and 36 open deals",
      },
      {
        id: "gmail",
        name: "Gmail",
        detail: "Emails filed with their customer",
      },
      {
        id: "stripe",
        name: "Stripe",
        detail: "Plans and payments per customer",
      },
      GOOGLE_CALENDAR,
    ],
    teams: ["Sales", "Success", "Support", "Partners"],
    ready: {
      label: "Add the first customer",
      detail: "Paste a domain and the rest is looked up.",
    },
  },
  reports: {
    title: "Reports",
    layouts: [
      { value: "charts", label: "Charts", phrase: "as charts" },
      { value: "list", label: "Table", phrase: "as a table" },
    ],
    sources: [
      { id: "stripe", name: "Stripe", detail: "Revenue since January 2024" },
      {
        id: "google-sheets",
        name: "Google Sheets",
        detail: "Rows stay in sync every hour",
      },
      {
        id: "posthog",
        name: "PostHog",
        detail: "Sign-ups, usage and retention",
      },
      {
        id: "google-analytics",
        name: "Google Analytics",
        detail: "Visits and where they come from",
      },
    ],
    teams: ["Finance", "Growth", "Operations", "Board"],
    ready: {
      label: "Open the overview",
      detail: "Numbers arrive as the first sync finishes.",
    },
  },
}

const STEPS: OnboardingStep[] = [
  "use",
  "team",
  "workspace",
  "connect",
  "invite",
  "review",
  "ready",
]

const PERSONAL_DOMAINS = ["gmail.com", "outlook.com", "icloud.com", "yahoo.com"]
const TAKEN_ADDRESSES = ["northwind", "demo", "linear", "acme-inc"]
const DEFAULT_COLOR = ONBOARDING_COLORS[0].value
const FALLBACK_NAME = "Your workspace"
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return STEPS.some((step) => step === value)
}

export function isOnboardingUse(value: unknown): value is OnboardingUse {
  return value === "projects" || value === "customers" || value === "reports"
}

export function isOnboardingLayout(value: unknown): value is OnboardingLayout {
  return value === "board" || value === "list" || value === "charts"
}

function getDomain(email: string) {
  return email.split("@")[1] ?? ""
}

/** What the sign-up email already tells. */
export function getDefaultAnswers(email: string): OnboardingAnswers {
  const domain = getDomain(email)
  const isPersonal = domain === "" || PERSONAL_DOMAINS.includes(domain)
  const company = isPersonal ? "" : (domain.split(".")[0] ?? "")
  return {
    use: null,
    layout: "board",
    size: isPersonal ? 0 : 2,
    name: company.charAt(0).toUpperCase() + company.slice(1),
    address: toAddress(company),
    color: DEFAULT_COLOR,
    sources: [],
    invites: [],
  }
}

export function getSteps({ size }: Pick<OnboardingAnswers, "size">) {
  return STEPS.filter(
    (step): step is Exclude<OnboardingStep, "ready"> =>
      step !== "ready" && (step !== "invite" || size > 0)
  )
}

export function getNextStep(
  step: OnboardingStep,
  answers: OnboardingAnswers
): OnboardingStep {
  const steps: OnboardingStep[] = [...getSteps(answers), "ready"]
  return steps[steps.indexOf(step) + 1] ?? "ready"
}

export function getPreviousStep(
  step: OnboardingStep,
  answers: OnboardingAnswers
): OnboardingStep | null {
  const steps: OnboardingStep[] = [...getSteps(answers), "ready"]
  return steps[steps.indexOf(step) - 1] ?? null
}

export function getStepPosition(
  step: OnboardingStep,
  answers: OnboardingAnswers
) {
  const steps: OnboardingStep[] = getSteps(answers)
  const index = steps.indexOf(step)
  return {
    index: index === -1 ? steps.length : index + 1,
    count: steps.length,
  }
}

function getChannel(hex: string, start: number) {
  const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

/** Black or white, whichever reads better on the color. */
export function getReadableColor(color: string) {
  if (!/^#[0-9a-f]{6}/i.test(color)) return "#ffffff"
  const luminance =
    0.2126 * getChannel(color, 1) +
    0.7152 * getChannel(color, 3) +
    0.0722 * getChannel(color, 5)
  const onWhite = 1.05 / (luminance + 0.05)
  const onBlack = (luminance + 0.05) / 0.05
  return onWhite >= Math.min(3, onBlack) ? "#ffffff" : "#000000"
}

export function toAddress(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function getAddress(address: string) {
  return `${address}.example.com`
}

export type OnboardingAddressState =
  | { status: "free" }
  | { status: "invalid"; message: string }
  | { status: "taken"; message: string; suggestion: string }

/** The sample check. Yours asks the server. */
export function getAddressState(address: string): OnboardingAddressState {
  if (address.length < 3) {
    return { status: "invalid", message: "Use at least 3 characters." }
  }
  if (!TAKEN_ADDRESSES.includes(address)) return { status: "free" }
  const suggestion = `${address}-hq`
  return {
    status: "taken",
    message: `${address} is taken. Try ${suggestion}.`,
    suggestion,
  }
}

export function splitEmails(text: string) {
  const parts = text
    .split(/[\s,;]+/)
    .map((part) => part.replace(/^<|>$/g, "").toLowerCase())
    .filter(Boolean)
  return [...new Set(parts)]
}

export type OnboardingInviteProblem = { message: string; suggestion?: string }

export function getInviteProblem(
  email: string,
  ownerEmail: string
): OnboardingInviteProblem | undefined {
  if (email === ownerEmail) return { message: "That's you. You're already in." }
  const ownDomain = getDomain(ownerEmail)
  const [local = "", domain = ""] = email.split("@")
  if (!EMAIL.test(email)) {
    return {
      message: "That isn't a full address.",
      ...(local && { suggestion: `${local}@${ownDomain}` }),
    }
  }
  const ownRoot = ownDomain.slice(0, ownDomain.lastIndexOf("."))
  const isNearMiss = domain !== ownDomain && domain === `${ownRoot}.con`
  if (!isNearMiss) return undefined
  const suggestion = `${local}@${ownDomain}`
  return { message: `Did you mean ${suggestion}?`, suggestion }
}

/** What keeps a step from being finished. Undefined when nothing does. */
export function getStepIssue(
  step: OnboardingStep,
  answers: OnboardingAnswers,
  ownerEmail = "ada@acme.com"
): string | undefined {
  if (step === "use") {
    return answers.use ? undefined : "Choose one to continue."
  }
  if (step === "workspace") {
    if (answers.name.trim() === "") return "Name the workspace."
    const state = getAddressState(answers.address)
    return state.status === "free" ? undefined : state.message
  }
  if (step === "invite") {
    const count = answers.invites.filter((email) =>
      getInviteProblem(email, ownerEmail)
    ).length
    if (count === 0) return undefined
    return `Fix or remove ${count} ${count === 1 ? "address" : "addresses"}.`
  }
  return undefined
}

export function canOpenStep(step: OnboardingStep, answers: OnboardingAnswers) {
  const steps: OnboardingStep[] = [...getSteps(answers), "ready"]
  const index = steps.indexOf(step)
  if (index === -1) return false
  return steps
    .slice(0, index)
    .every((earlier) => getStepIssue(earlier, answers) === undefined)
}

/** The first question without an answer, if there is one. */
export function getOpenStep(answers: OnboardingAnswers) {
  return (
    getSteps(answers).find(
      (step) => getStepIssue(step, answers) !== undefined
    ) ?? null
  )
}

/** The step a link opens: itself, or the first one that needs an answer. */
export function resolveStep(
  wanted: string,
  answers: OnboardingAnswers
): OnboardingStep {
  if (!isOnboardingStep(wanted)) return "use"
  if (canOpenStep(wanted, answers)) return wanted
  return getOpenStep(answers) ?? "review"
}

/** Another use keeps what still makes sense. */
export function withUse(
  answers: OnboardingAnswers,
  use: OnboardingUse
): OnboardingAnswers {
  if (answers.use === use) return answers
  const rule = ONBOARDING_USES[use]
  return {
    ...answers,
    use,
    layout: rule.layouts[0]?.value ?? "list",
    sources: answers.sources.filter((id) =>
      rule.sources.some((source) => source.id === id)
    ),
  }
}

export function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value]
}

export type OnboardingPreview = {
  /** Nothing chosen yet: the frame, waiting. */
  isBlank: boolean
  name: string
  address: string
  color: string
  title: string
  view: OnboardingLayout | null
  nav: { id: OnboardingUse | "home"; label: string; isActive: boolean }[]
  teams: string[]
  sources: string[]
  invited: string[]
}

export function getPreview(answers: OnboardingAnswers): OnboardingPreview {
  const { use } = answers
  const rule = use ? ONBOARDING_USES[use] : null
  const others = (
    ["projects", "customers", "reports"] satisfies OnboardingUse[]
  ).filter((id) => id !== use)
  const ids: OnboardingUse[] = use ? [use, ...others] : []
  return {
    isBlank: use === null,
    name: answers.name.trim() || FALLBACK_NAME,
    address: getAddress(answers.address || "your-workspace"),
    color: answers.color,
    title: rule?.title ?? "",
    view: rule ? answers.layout : null,
    nav: [
      { id: "home", label: "Home", isActive: false },
      ...ids.map((id) => ({
        id,
        label: ONBOARDING_USES[id].title,
        isActive: id === use,
      })),
    ],
    teams:
      rule?.teams.slice(0, ONBOARDING_SIZES[answers.size]?.teams ?? 0) ?? [],
    sources: answers.sources,
    invited: answers.size > 0 ? answers.invites : [],
  }
}

export function getSourceName(id: string) {
  const all = Object.values(ONBOARDING_USES).flatMap(({ sources }) => sources)
  return all.find((source) => source.id === id)?.name ?? id
}

export type OnboardingReviewRow = {
  step: OnboardingQuestion
  label: string
  value: string
}

export function getReviewRows(
  answers: OnboardingAnswers
): OnboardingReviewRow[] {
  const rule = answers.use ? ONBOARDING_USES[answers.use] : null
  const layout = rule?.layouts.find(({ value }) => value === answers.layout)
  const size = ONBOARDING_SIZES[answers.size]?.label ?? ""
  const invites = answers.invites.length
  const rows: OnboardingReviewRow[] = [
    { step: "use", label: "First use", value: rule?.title ?? "Not chosen" },
    {
      step: "team",
      label: "Team",
      value: layout ? `${size}, ${layout.phrase}` : size,
    },
    {
      step: "workspace",
      label: "Workspace",
      value: `${answers.name.trim()}, ${getAddress(answers.address)}`,
    },
    {
      step: "connect",
      label: "Connected",
      value: answers.sources.map(getSourceName).join(", ") || "Nothing yet",
    },
    {
      step: "invite",
      label: "Invitations",
      value:
        invites === 0
          ? "No one yet"
          : `${invites} ${invites === 1 ? "person" : "people"}`,
    },
  ]
  return rows.filter(({ step }) => getSteps(answers).includes(step))
}

export function getReadyAction({ use }: Pick<OnboardingAnswers, "use">) {
  return ONBOARDING_USES[use ?? "projects"].ready
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readStrings(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === "string")
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback
}

function readJson(text: string | null): unknown {
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Saved answers, checked field by field: storage is not to be trusted. */
export function parseAnswers(
  text: string | null,
  defaults: OnboardingAnswers
): OnboardingAnswers {
  const saved = readJson(text)
  if (!isRecord(saved)) return defaults
  const isSize =
    typeof saved.size === "number" && saved.size in ONBOARDING_SIZES
  return {
    use: isOnboardingUse(saved.use) ? saved.use : defaults.use,
    layout: isOnboardingLayout(saved.layout) ? saved.layout : defaults.layout,
    size: isSize ? Number(saved.size) : defaults.size,
    name: readString(saved.name, defaults.name),
    address: readString(saved.address, defaults.address),
    color: readString(saved.color, defaults.color),
    sources: readStrings(saved.sources, defaults.sources),
    invites: readStrings(saved.invites, defaults.invites),
  }
}
