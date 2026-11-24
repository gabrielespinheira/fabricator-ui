// The desktop demos show the website's /desktop route: this starts the
// website's dev server unless one already answers, then opens the window.
// Quitting the window stops the server it started.
import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ORIGIN = process.env.FABRICATOR_DESKTOP_ORIGIN ?? "http://localhost:4000"
const PAGE_URL = `${ORIGIN}/desktop`
// A cold dev server compiles the route on its first request.
const SERVER_TIMEOUT_MS = 300_000

const demosDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const repoDir = path.dirname(demosDir)

async function isServing() {
  try {
    const response = await fetch(PAGE_URL, {
      signal: AbortSignal.timeout(60_000),
    })
    return response.ok
  } catch {
    // Nothing listens yet, or the first compile is still running.
    return false
  }
}

async function waitForServer() {
  const deadline = Date.now() + SERVER_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (await isServing()) return
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(
    `The website didn't answer at ${PAGE_URL} within ${SERVER_TIMEOUT_MS / 1000}s.`
  )
}

async function startWebsite() {
  if (await isServing()) return null
  console.log(`Starting the website on ${ORIGIN}…`)
  // Its own process group, so stopping it stops turbo and Next too.
  const server = spawn("bun", ["run", "dev"], {
    cwd: repoDir,
    stdio: "inherit",
    detached: true,
  })
  await waitForServer()
  return server
}

/** Runs the window `command` starts over the website's /desktop route. */
export async function openDesktop(
  command: readonly [string, ...string[]],
  directory: string
) {
  const server = await startWebsite()
  const [executable, ...args] = command
  const window: ChildProcess = spawn(executable, args, {
    cwd: directory,
    stdio: "inherit",
    env: { ...process.env, FABRICATOR_DESKTOP_URL: PAGE_URL },
  })
  window.on("exit", (code) => {
    if (server?.pid) process.kill(-server.pid, "SIGTERM")
    process.exit(code ?? 0)
  })
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => window.kill(signal))
  }
}
