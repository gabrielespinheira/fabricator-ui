// The screen check (`bun run mobile:check`): a link asks the example to open
// every component demo in turn and report what each logged to the runner on
// this machine. Pure, so the runner's tests can read it.

export type ScreenCheckScope = "all" | "components"

export type ScreenCheckRequest = {
  reportUrl: string
  device: string
  scope: ScreenCheckScope
  settleMs: number
}

export type ScreenLog = { level: "error" | "warn"; message: string }

export type ScreenReport = {
  device: string
  path: string
  index: number
  total: number
  startedAt: number
  endedAt: number
  logs: ScreenLog[]
}

const DEFAULT_SETTLE_MS = 1500
const LINK = /^fabricator-ui:\/\/screen-check\?(.+)$/
// The runner listens on this machine; reports never leave it.
const LOCAL_URL = /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/
const SCOPES: readonly ScreenCheckScope[] = ["all", "components"]

function isScope(value: string | undefined): value is ScreenCheckScope {
  return SCOPES.some((scope) => scope === value)
}

// Hermes's URL has no searchParams, so the query is read by hand.
function readQuery(query: string) {
  return new Map(
    query.split("&").map((pair) => {
      const [key = "", value = ""] = pair.split("=")
      return [decodeURIComponent(key), decodeURIComponent(value)] as const
    })
  )
}

/** The check a `fabricator-ui://screen-check?report=…&device=…` link asks for. */
export function parseScreenCheckUrl(
  url: string | null | undefined
): ScreenCheckRequest | null {
  const match = url ? LINK.exec(url) : null
  if (!match?.[1]) return null
  const query = readQuery(match[1])
  const reportUrl = query.get("report")
  const device = query.get("device")
  if (!reportUrl || !LOCAL_URL.test(reportUrl) || !device) return null
  const scope = query.get("scope")
  if (scope !== undefined && !isScope(scope)) return null
  const settle = Number(query.get("settle"))
  return {
    reportUrl,
    device,
    scope: isScope(scope) ? scope : "all",
    settleMs: settle > 0 ? settle : DEFAULT_SETTLE_MS,
  }
}

/** Every component demo, A to Z. */
export function getScreenCheckPaths(components: string[]) {
  return [...components].sort().map((name) => `/components/${name}`)
}

// Expo's native logger sends a message line by line, each marked with its
// level. A line that starts indented or with a closing bracket (an NSError's
// description) carries on the message before it.
const LEVEL_MARKER = /^(?:🟡|🔴|🟢|🔵|⚪️|⚪) ?/u
const CONTINUATION = /^[\s)\]}]/

/** Adds a line from the native logger: `done` is a message it finished, if any. */
export function appendLogLine(pending: string | null, rawLine: string) {
  const line = rawLine.replace(LEVEL_MARKER, "")
  if (pending !== null && CONTINUATION.test(line)) {
    return { done: null, pending: `${pending}\n${line}` }
  }
  return { done: pending, pending: line }
}

function formatLogArg(arg: unknown) {
  if (typeof arg === "string") return arg
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`
  if (typeof arg === "object" && arg !== null) {
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }
  return String(arg)
}

/** What a console call logged, as one line. */
export function formatLogArgs(args: unknown[]) {
  return args.map(formatLogArg).join(" ")
}
