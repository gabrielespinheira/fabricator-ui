// `bun run desktop` (Electron) and `bun run desktop:tauri`: start the
// website's dev server unless one already answers, then open its /desktop
// route in a desktop window. Quitting the window stops the server it started.
import { spawn, type ChildProcess } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SHELLS = ["electron", "tauri"] as const
type Shell = (typeof SHELLS)[number]

const ORIGIN = process.env.FABRICATOR_DESKTOP_ORIGIN ?? "http://localhost:4000"
const PAGE_URL = `${ORIGIN}/desktop`
// A cold dev server compiles the route on its first request.
const SERVER_TIMEOUT_MS = 300_000

const desktopDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const repoDir = path.resolve(desktopDir, "../..")

function isShell(value: string | undefined): value is Shell {
  return SHELLS.some((shell) => shell === value)
}

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

function getElectronBinary() {
  // In Node, the electron package exports the path to its binary.
  const binary: unknown = createRequire(import.meta.url)("electron")
  if (typeof binary !== "string") {
    throw new Error("The electron package didn't resolve to its binary.")
  }
  return binary
}

function startShell(shell: Shell): ChildProcess {
  const env = { ...process.env, FABRICATOR_DESKTOP_URL: PAGE_URL }
  if (shell === "electron") {
    return spawn(
      getElectronBinary(),
      [path.join(desktopDir, "electron/main.mjs")],
      { cwd: desktopDir, stdio: "inherit", env }
    )
  }
  return spawn("bunx", ["tauri", "dev"], {
    cwd: desktopDir,
    stdio: "inherit",
    env,
  })
}

const shell = process.argv[2]
if (!isShell(shell)) {
  throw new Error(`Pick a shell: ${SHELLS.join(" or ")}.`)
}

let server: ChildProcess | null = null
if (!(await isServing())) {
  console.log(`Starting the website on ${ORIGIN}…`)
  // Its own process group, so stopping it stops turbo and Next too.
  server = spawn("bun", ["run", "dev"], {
    cwd: repoDir,
    stdio: "inherit",
    detached: true,
  })
  await waitForServer()
}

const stopServer = () => {
  if (server?.pid) process.kill(-server.pid, "SIGTERM")
}

const app = startShell(shell)
app.on("exit", (code) => {
  stopServer()
  process.exit(code ?? 0)
})
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => app.kill(signal))
}
