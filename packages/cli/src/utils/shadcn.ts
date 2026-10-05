import { spawn, type SpawnOptions } from "node:child_process"
import { createRequire } from "node:module"

import pkg from "../../package.json" with { type: "json" }
import { highlight, logger } from "./logger"

export const SHADCN_VERSION: string = pkg.dependencies.shadcn

export interface ShadcnResult {
  code: number
  signal: NodeJS.Signals | null
}

const FORWARDED_SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM"]

let cachedBin: string | undefined

/**
 * Path to the pinned shadcn CLI entry. `shadcn/package.json` is not in its
 * exports map, so resolve a public subpath and swap the `dist/...` suffix.
 */
export function resolveShadcnBin(): string {
  if (cachedBin) return cachedBin
  const require = createRequire(import.meta.url)
  const utilsEntry = require.resolve("shadcn/utils")
  const bin = utilsEntry.replace(/([\\/])dist[\\/].*$/, "$1dist$1index.js")
  if (bin === utilsEntry) {
    throw new Error(`Could not locate the shadcn CLI from ${utilsEntry}.`)
  }
  cachedBin = bin
  return bin
}

/** Quote an argument for display so the printed command can be copied into a shell. */
export function quoteArg(arg: string): string {
  return /^[A-Za-z0-9_./:@=,+-]+$/.test(arg) ? arg : JSON.stringify(arg)
}

/** The equivalent command a user could run themselves. */
export function formatShadcnCommand(args: string[]): string {
  return ["npx", `shadcn@${SHADCN_VERSION}`, ...args].map(quoteArg).join(" ")
}

export function printCommand(args: string[]): void {
  logger.log(highlight.dim(`$ ${formatShadcnCommand(args)}`))
}

/** Runs shadcn with inherited stdio, forwarding SIGINT/SIGTERM to it. */
export function runShadcn(
  args: string[],
  options: { cwd?: string; echo?: boolean } = {}
): Promise<ShadcnResult> {
  if (options.echo !== false && process.env.FABRICATOR_VERBOSE) {
    printCommand(args)
  }
  return spawnShadcn(args, { stdio: "inherit", cwd: options.cwd }).then(
    ({ result }) => result
  )
}

/** Runs shadcn and captures stdout/stderr (used by `doctor` and `docs`). */
export async function captureShadcn(
  args: string[],
  options: { cwd?: string } = {}
): Promise<ShadcnResult & { stdout: string; stderr: string }> {
  const { result, stdout, stderr } = await spawnShadcn(args, {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: options.cwd,
  })
  return { ...result, stdout, stderr }
}

function spawnShadcn(
  args: string[],
  options: SpawnOptions
): Promise<{ result: ShadcnResult; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [resolveShadcnBin(), ...args], {
      ...options,
      env: process.env,
    })
    let stdout = ""
    let stderr = ""
    child.stdout
      ?.setEncoding("utf8")
      .on("data", (chunk: string) => (stdout += chunk))
    child.stderr
      ?.setEncoding("utf8")
      .on("data", (chunk: string) => (stderr += chunk))

    const forward = (signal: NodeJS.Signals) => {
      if (child.exitCode === null && child.signalCode === null)
        child.kill(signal)
    }
    const handlers = FORWARDED_SIGNALS.map((signal) => {
      const handler = () => forward(signal)
      process.on(signal, handler)
      return [signal, handler] as const
    })
    const cleanup = () => {
      for (const [signal, handler] of handlers)
        process.removeListener(signal, handler)
    }

    child.on("error", (error) => {
      cleanup()
      reject(error)
    })
    child.on("close", (code, signal) => {
      cleanup()
      resolve({
        result: { code: code ?? (signal ? 1 : 0), signal },
        stdout,
        stderr,
      })
    })
  })
}

/** Ends the process the same way the child ended: same exit code, or same signal. */
export function exitLike(result: ShadcnResult): never | void {
  if (result.signal) {
    process.kill(process.pid, result.signal)
    return
  }
  process.exitCode = result.code
}
