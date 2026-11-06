// Waits for apps/web's dev server, then opens the window on it. The root's
// `dev:desktop` starts them both. Quitting the window stops this script.
import { spawn } from "node:child_process"
import { createRequire } from "node:module"

const DEV_URL = "__DEV_URL__"
const TIMEOUT_MS = 300_000

async function isServing() {
  try {
    const response = await fetch(DEV_URL, { signal: AbortSignal.timeout(60_000) })
    return response.ok
  } catch {
    return false
  }
}

const deadline = Date.now() + TIMEOUT_MS
while (!(await isServing())) {
  if (Date.now() > deadline) {
    throw new Error(`Nothing answered at ${DEV_URL}. Is apps/web running?`)
  }
  await new Promise((resolve) => setTimeout(resolve, 1000))
}

const electron = createRequire(import.meta.url)("electron")
const child = spawn(electron, ["."], {
  stdio: "inherit",
  env: { ...process.env, DESKTOP_DEV_URL: DEV_URL },
})
child.on("close", (code) => process.exit(code ?? 0))
