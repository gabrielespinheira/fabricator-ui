// Opens every component demo in the example on an iPhone and an iPad
// simulator, and fails on what they log: errors the app sees (console errors,
// uncaught errors, render errors) and React Native's own errors in the
// device's native log (a native view that isn't registered). Warnings are
// listed, and fail the check with --strict.
//
//   bun run mobile:check [--device <name or udid>]... [--scope all|components]
//                        [--settle <ms>] [--strict]
//
// The app must be built on each simulator first (bun run mobile, bun run
// mobile:ipad). Reuses a running Metro, or starts one for the run.
import { execFileSync, spawn } from "node:child_process"
import http from "node:http"
import path from "node:path"
import readline from "node:readline"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { pickIpad, pickIphone } from "./pick-simulator.mjs"
import {
  EXPECTED_LOGS,
  judgeScreenCheck,
  parseNativeLog,
} from "./screen-check-report.mjs"

const BUNDLE_ID = "app.fabricator-ui.mobile"
const METRO_URL = "http://localhost:8081/status"
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// The first screen waits for Metro to bundle the app; each one after that has
// this long to report before the device counts as stopped.
const START_TIMEOUT_MS = 180_000
const SCREEN_TIMEOUT_MS = 30_000
const LINK_RETRY_MS = 4_000
const MESSAGE_WIDTH = 200

const { values: options } = parseArgs({
  options: {
    device: { type: "string", multiple: true },
    scope: { type: "string", default: "all" },
    settle: { type: "string" },
    strict: { type: "boolean", default: false },
  },
})

if (options.scope !== "all" && options.scope !== "components") {
  throw new Error(
    "The mobile example checks component demos only. Use --scope components or omit --scope."
  )
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function simctl(...args) {
  return execFileSync("xcrun", ["simctl", ...args], { encoding: "utf8" })
}

function getDevices() {
  const { devices } = JSON.parse(simctl("list", "devices", "available", "-j"))
  if (options.device) {
    const all = Object.values(devices).flat()
    return options.device.map((wanted) => {
      const found = all.find(
        (device) => device.udid === wanted || device.name === wanted
      )
      if (!found) throw new Error(`No simulator named ${wanted}.`)
      return found
    })
  }
  const picked = [pickIphone(devices), pickIpad(devices)].filter(Boolean)
  if (picked.length === 0) {
    throw new Error("No iPhone or iPad simulator. Add one in Xcode.")
  }
  return picked
}

function prepareDevice(device) {
  if (device.state !== "Booted") {
    console.log(`Booting ${device.name}…`)
    simctl("boot", device.udid)
  }
  simctl("bootstatus", device.udid, "-b")
  try {
    simctl("get_app_container", device.udid, BUNDLE_ID)
  } catch {
    const command = device.deviceTypeIdentifier.includes("iPad")
      ? `bun run mobile:ipad --device "${device.name}"`
      : "bun run mobile"
    throw new Error(
      `The example isn't installed on ${device.name}. Build it there first: ${command}`
    )
  }
}

async function isMetroRunning() {
  const response = await fetch(METRO_URL).catch(() => null)
  return (await response?.text()) === "packager-status:running"
}

/** Metro, if it isn't running yet. Returns how to stop the one it started. */
async function ensureMetro() {
  if (await isMetroRunning()) return () => {}
  console.log("Starting Metro…")
  const metro = spawn(
    path.join(root, "node_modules/.bin/expo"),
    ["start", "--port", "8081"],
    { cwd: root, stdio: "ignore", env: { ...process.env, CI: "1" } }
  )
  for (let elapsed = 0; elapsed < START_TIMEOUT_MS; elapsed += 1000) {
    if (await isMetroRunning()) return () => metro.kill()
    await wait(1000)
  }
  metro.kill()
  throw new Error("Metro didn't start.")
}

/** React Native's entries in the device's native log, while the check runs. */
function streamNativeLog(device) {
  const entries = []
  const stream = spawn("xcrun", [
    "simctl",
    "spawn",
    device.udid,
    "log",
    "stream",
    "--style",
    "ndjson",
    "--predicate",
    'process == "FabricatorUI" AND subsystem == "com.facebook.react.log"',
  ])
  readline.createInterface({ input: stream.stdout }).on("line", (line) => {
    const entry = parseNativeLog(line)
    if (entry) entries.push(entry)
  })
  return { entries, stop: () => stream.kill() }
}

/** Collects each device's reports; the app posts to /start, /screen and /done. */
function createReportServer() {
  const runs = new Map()
  const server = http.createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      const report = JSON.parse(body)
      runs.get(report.device)?.onReport(request.url, report)
      response.writeHead(204).end()
    })
  })
  return { server, runs }
}

async function checkDevice(device, reportUrl, runs) {
  const run = { name: device.name, screens: [], native: [], stopped: null }
  const nativeLog = streamNativeLog(device)
  let started = false
  let lastPath = "launch"
  let lastReport = Date.now()
  let finish
  const finished = new Promise((resolve) => (finish = resolve))
  runs.set(device.udid, {
    onReport(route, report) {
      lastReport = Date.now()
      if (route === "/start") {
        started = true
        console.log(`${device.name}: checking ${report.total} screens`)
      }
      if (route === "/screen") {
        run.screens.push(report)
        lastPath = report.path
        const marks =
          report.logs.length > 0 ? ` (${report.logs.length} logs)` : ""
        console.log(
          `${device.name}: ${report.index + 1}/${report.total} ${report.path}${marks}`
        )
      }
      if (route === "/done") finish()
    },
  })

  const query = new URLSearchParams({ report: reportUrl, device: device.udid })
  if (options.scope !== "all") query.set("scope", options.scope)
  if (options.settle) query.set("settle", options.settle)
  const link = `fabricator-ui://screen-check?${query}`
  simctl("launch", "--terminate-running-process", device.udid, BUNDLE_ID)
  // The app reads the link once it has loaded: until it answers, send it again.
  const launchedAt = Date.now()
  while (!started && Date.now() - launchedAt < START_TIMEOUT_MS) {
    await wait(LINK_RETRY_MS)
    if (!started) simctl("openurl", device.udid, link)
  }
  if (!started) {
    run.stopped = { path: "launch", reason: "the app never started the check" }
  } else {
    const stalled = new Promise((resolve) => {
      const timer = setInterval(() => {
        if (Date.now() - lastReport < SCREEN_TIMEOUT_MS) return
        clearInterval(timer)
        run.stopped = {
          path: lastPath,
          reason: `no report for ${SCREEN_TIMEOUT_MS / 1000}s after this screen: the app may have crashed or hung`,
        }
        resolve()
      }, 1000)
      finished.then(() => clearInterval(timer))
    })
    await Promise.race([finished, stalled])
  }
  // Native entries reach the stream a moment after they're logged.
  await wait(1500)
  nativeLog.stop()
  run.native = nativeLog.entries
  return run
}

function printIssues(title, issues) {
  if (issues.length === 0) return
  console.log(`\n${title}`)
  for (const issue of issues) {
    const times = issue.count > 1 ? ` (${issue.count}×)` : ""
    const [first = "", ...rest] = issue.message.split("\n")
    const line =
      first.length > MESSAGE_WIDTH ? `${first.slice(0, MESSAGE_WIDTH)}…` : first
    const more = rest.length > 0 ? ` (+${rest.length} lines)` : ""
    console.log(`  ${issue.device} ${issue.path}${times}\n    ${line}${more}`)
  }
}

async function main() {
  const devices = getDevices()
  devices.forEach(prepareDevice)
  const stopMetro = await ensureMetro()
  const { server, runs } = createReportServer()
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const reportUrl = `http://localhost:${server.address().port}`

  const results = await Promise.all(
    devices.map((device) => checkDevice(device, reportUrl, runs))
  )
  server.close()
  stopMetro()

  const { failures, warnings } = judgeScreenCheck({
    devices: results,
    strict: options.strict,
  })
  printIssues("Warnings", warnings)
  printIssues("Failures", failures)
  const screens = results.reduce((sum, run) => sum + run.screens.length, 0)
  console.log(
    `\n${screens} screens on ${results.map((run) => run.name).join(", ")}: ` +
      `${failures.length} failures, ${warnings.length} warnings` +
      ` (${EXPECTED_LOGS.length} expected log patterns left out)`
  )
  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
