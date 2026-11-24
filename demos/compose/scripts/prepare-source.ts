import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { runProcess } from "./process"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
for (const command of [
  ["run", "--cwd", "../../apps/web", "platforms:generate"],
  ["run", "../../apps/web/scripts/compose/generate-manifest.ts"],
  ["run", "../../apps/web/scripts/compose/generate-contract.ts"],
  ["run", "scripts/copy-source.ts"],
]) {
  const exitCode = runProcess("bun", command, root)
  if (exitCode !== 0) process.exit(exitCode)
}
