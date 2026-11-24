import { spawn, spawnSync } from "node:child_process"
import { accessSync, constants } from "node:fs"
import { delimiter, join } from "node:path"

export function findExecutable(name: string): string | undefined {
  const extensions =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
      : [""]
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    for (const extension of extensions) {
      const candidate = join(directory, name + extension)
      try {
        accessSync(candidate, constants.X_OK)
        return candidate
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          (error.code === "ENOENT" ||
            error.code === "ENOTDIR" ||
            error.code === "EACCES")
        )
          continue
        throw error
      }
    }
  }
  return undefined
}

export function runProcess(
  command: string,
  arguments_: string[],
  cwd: string
): number {
  const result = spawnSync(command, arguments_, { cwd, stdio: "inherit" })
  if (result.error) throw result.error
  return result.status ?? 1
}

export function readProcess(
  command: string,
  arguments_: string[],
  cwd: string
): { code: number; output: string } {
  const result = spawnSync(command, arguments_, { cwd, encoding: "utf8" })
  if (result.error) throw result.error
  return { code: result.status ?? 1, output: result.stdout }
}

export async function startProcess(
  command: string,
  arguments_: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv
): Promise<number> {
  const child = spawn(command, arguments_, {
    cwd,
    env: environment,
    stdio: "inherit",
  })
  return await new Promise((resolve, reject) => {
    child.on("error", reject)
    child.on("exit", (code) => resolve(code ?? 1))
  })
}
