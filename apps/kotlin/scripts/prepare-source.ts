import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { runProcess } from "./process"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
for (const command of [
  ["run", "--cwd", "../web", "platforms:generate"],
  ["run", "scripts/generate-manifest.ts"],
  ["run", "scripts/generate-contract.ts"],
]) {
  const exitCode = runProcess("bun", command, root)
  if (exitCode !== 0) process.exit(exitCode)
}
