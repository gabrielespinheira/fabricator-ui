// What the screen check (`bun run mobile:check`) makes of each device's run:
// the logs every screen sent, and React Native's own entries in the device's
// native log, filed under the screen that was open. Pure, for its tests.

const REACT_NATIVE_LOG = "com.facebook.react.log"

/** What a demo shows on purpose, so the check leaves it out. */
export const EXPECTED_LOGS = [
  {
    path: "/components/video-player",
    pattern: /missing-video\.mp4/,
    reason: "The demo shows how the player looks when a video fails to load.",
  },
]

const LEVELS = { Error: "error", Fault: "fault" }

/** One entry of `log stream --style ndjson`, or null for anything else. */
export function parseNativeLog(line) {
  if (!line.startsWith("{")) return null
  const entry = JSON.parse(line)
  if (typeof entry.eventMessage !== "string") return null
  const [date, time] = entry.timestamp.split(" ")
  return {
    time: Date.parse(`${date}T${time.replace(/\+0000$/, "Z")}`),
    subsystem: entry.subsystem,
    category: entry.category,
    level: LEVELS[entry.messageType] ?? "other",
    message: entry.eventMessage,
  }
}

/** Each entry under the screen that was open when it was logged. */
export function attributeNativeLogs(screens, entries) {
  return entries.map((entry) => {
    const open = screens.filter((screen) => screen.startedAt <= entry.time)
    return { path: open.at(-1)?.path ?? "launch", entry }
  })
}

/**
 * React Native's errors from native code: a view that isn't registered, a
 * native module that throws. The JavaScript side's errors reach the screen's
 * own logs, and the system's frameworks log errors of their own all the time.
 */
function isNativeProblem(entry) {
  return (
    entry.subsystem === REACT_NATIVE_LOG &&
    entry.category !== "javascript" &&
    (entry.level === "error" || entry.level === "fault")
  )
}

const isExpected = (path, message) =>
  EXPECTED_LOGS.some(
    (expected) => expected.path === path && expected.pattern.test(message)
  )

// Expo's native logger marks each line with its level.
const LEVEL_MARKER = /^(?:🟡|🔴|🟢|🔵|⚪️|⚪) ?/gmu
const ADDRESS = /0x[0-9a-f]{6,}/gi

/** A message as one issue: without the level marker or memory addresses. */
function normalizeMessage(message) {
  return message.replace(LEVEL_MARKER, "").replace(ADDRESS, "0x…").trim()
}

/** One issue per device, screen and message, with how often it came up. */
function collect(rawIssues) {
  const byKey = new Map()
  const issues = rawIssues.map((issue) => ({
    ...issue,
    message: normalizeMessage(issue.message),
  }))
  for (const issue of issues) {
    const key = `${issue.device}\n${issue.path}\n${issue.message}`
    const found = byKey.get(key)
    if (found) found.count += 1
    else byKey.set(key, { ...issue, count: 1 })
  }
  return [...byKey.values()]
}

/**
 * Errors fail the check; warnings are listed, and fail it when strict. A device
 * that stopped reporting fails it at the screen it stopped on.
 */
export function judgeScreenCheck({ devices, strict = false }) {
  const errors = []
  const warnings = []
  for (const device of devices) {
    for (const screen of device.screens) {
      for (const log of screen.logs) {
        if (isExpected(screen.path, log.message)) continue
        const issue = {
          device: device.name,
          path: screen.path,
          message: log.message,
        }
        if (log.level === "error" || strict) errors.push(issue)
        else warnings.push(issue)
      }
    }
    for (const { path, entry } of attributeNativeLogs(
      device.screens,
      device.native.filter(isNativeProblem)
    )) {
      if (isExpected(path, entry.message)) continue
      errors.push({ device: device.name, path, message: entry.message })
    }
    if (device.stopped) {
      errors.push({
        device: device.name,
        path: device.stopped.path,
        message: device.stopped.reason,
      })
    }
  }
  return { failures: collect(errors), warnings: collect(warnings) }
}
