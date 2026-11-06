import { spawn } from "node:child_process"
import { appendFileSync } from "node:fs"

export class CommandError extends Error {
  override name = "CommandError"
}

/**
 * Runs a command with its output going to a log file, or to the terminal when
 * `stream` is set. Forwards Ctrl+C and rejects on a non-zero exit.
 */
export function runLogged(
  command: string,
  args: string[],
  options: {
    cwd: string
    logFile: string
    stream?: boolean
    env?: NodeJS.ProcessEnv
  }
) {
  appendFileSync(options.logFile, `\n$ ${command} ${args.join(" ")}\n`)
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.stream ? "inherit" : ["ignore", "pipe", "pipe"],
    })
    const log = (chunk: Buffer) => appendFileSync(options.logFile, chunk)
    child.stdout?.on("data", log)
    child.stderr?.on("data", log)
    const forward = () => child.kill("SIGINT")
    process.on("SIGINT", forward)
    child.on("error", (error) => {
      process.removeListener("SIGINT", forward)
      reject(error)
    })
    child.on("close", (code) => {
      process.removeListener("SIGINT", forward)
      if (code === 0) resolve()
      else {
        reject(
          new CommandError(
            `\`${command} ${args.join(" ")}\` exited with ${code}.`
          )
        )
      }
    })
  })
}

/** Whether a program is on the PATH. */
export function hasCommand(command: string) {
  return new Promise<boolean>((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" })
    child.on("error", () => resolve(false))
    child.on("close", (code) => resolve(code === 0))
  })
}
