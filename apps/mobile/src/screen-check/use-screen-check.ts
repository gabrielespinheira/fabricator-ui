// The screen check's side in the app, in development builds: a
// `fabricator-ui://screen-check` link opens every component demo in turn and
// posts what each one logged to the runner (scripts/check-screens.mjs).
import * as React from "react"
import { NATIVE_EXAMPLES } from "@/examples/native/__index__"
import { requireOptionalNativeModule } from "expo"
import { Linking, LogBox } from "react-native"

import {
  appendLogLine,
  formatLogArgs,
  getScreenCheckPaths,
  parseScreenCheckUrl,
  type ScreenCheckRequest,
  type ScreenLog,
  type ScreenReport,
} from "./screen-check-model"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function post(request: ScreenCheckRequest, route: string, body: object) {
  await fetch(`${request.reportUrl}/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device: request.device, ...body }),
  })
}

type NativeLogger = {
  addListener: (
    event: string,
    listener: (log: { message: string }) => void
  ) => { remove: () => void }
}

// What native modules log through Expo (a video that won't load). Expo passes it
// to the console it saw at startup, so a console patched later misses it.
const NATIVE_LOGGER = "ExpoModulesCoreJSLogger"

function listenToNativeLogger(onLog: (log: ScreenLog) => void) {
  const logger = requireOptionalNativeModule<NativeLogger>(NATIVE_LOGGER)
  if (!logger) return []
  return (["error", "warn"] as const).map((level) => {
    let pending: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const flush = () => {
      if (pending !== null) onLog({ level, message: pending })
      pending = null
    }
    const subscription = logger.addListener(
      `${NATIVE_LOGGER}.${level === "error" ? "onNewError" : "onNewWarning"}`,
      ({ message }) => {
        const next = appendLogLine(pending, message)
        if (next.done !== null) onLog({ level, message: next.done })
        pending = next.pending
        // A message's lines arrive together: the next tick ends it.
        clearTimeout(timer)
        timer = setTimeout(flush, 0)
      }
    )
    return {
      remove: () => {
        clearTimeout(timer)
        flush()
        subscription.remove()
      },
    }
  })
}

/**
 * Records what the app logs while it runs: console errors and warnings (React
 * logs render errors there too), native modules' errors and warnings, and
 * uncaught errors. Returns the way back.
 */
function captureLogs(onLog: (log: ScreenLog) => void) {
  const { error, warn } = console
  const handler = ErrorUtils.getGlobalHandler()
  console.error = (...args: unknown[]) => {
    onLog({ level: "error", message: formatLogArgs(args) })
    error(...args)
  }
  console.warn = (...args: unknown[]) => {
    onLog({ level: "warn", message: formatLogArgs(args) })
    warn(...args)
  }
  ErrorUtils.setGlobalHandler((caught: unknown, isFatal) => {
    onLog({ level: "error", message: formatLogArgs([caught]) })
    handler(caught, isFatal)
  })
  const nativeLogs = listenToNativeLogger(onLog)
  // The overlays would cover the screens being checked.
  LogBox.ignoreAllLogs(true)
  return () => {
    nativeLogs.forEach((subscription) => subscription.remove())
    console.error = error
    console.warn = warn
    ErrorUtils.setGlobalHandler(handler)
    LogBox.ignoreAllLogs(false)
  }
}

async function runScreenCheck(
  request: ScreenCheckRequest,
  open: (path: string) => void
) {
  const paths = getScreenCheckPaths(Object.keys(NATIVE_EXAMPLES))
  let logs: ScreenLog[] = []
  const restore = captureLogs((log) => logs.push(log))
  await post(request, "start", { total: paths.length })
  for (const [index, path] of paths.entries()) {
    logs = []
    const startedAt = Date.now()
    open(path)
    await wait(request.settleMs)
    const report: Omit<ScreenReport, "device"> = {
      path,
      index,
      total: paths.length,
      startedAt,
      endedAt: Date.now(),
      logs,
    }
    await post(request, "screen", report)
  }
  restore()
  open("/")
  await post(request, "done", {})
}

/** Runs the check when its link arrives. `open` goes to a path, as the shell does. */
export function useScreenCheck(open: (path: string) => void) {
  const openRef = React.useRef(open)
  openRef.current = open
  React.useEffect(() => {
    if (!__DEV__) return
    let isRunning = false
    const start = (url: string | null | undefined) => {
      const request = parseScreenCheckUrl(url)
      // The runner sends the link until the check starts: one run at a time.
      if (!request || isRunning) return
      isRunning = true
      void runScreenCheck(request, (path) => openRef.current(path)).finally(
        () => {
          isRunning = false
        }
      )
    }
    void Linking.getInitialURL().then(start)
    const subscription = Linking.addEventListener("url", ({ url }) =>
      start(url)
    )
    return () => subscription.remove()
  }, [])
}
