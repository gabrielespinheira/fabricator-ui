// Bundles src/index.ts into dist/index.js for Node (dependencies stay external),
// then makes sure the output starts with a node shebang and is executable.
import { execFileSync } from "node:child_process"
import { chmodSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dist = path.join(root, "dist")
const entry = path.join(dist, "index.js")
const SHEBANG = "#!/usr/bin/env node"

rmSync(dist, { recursive: true, force: true })

execFileSync(
  process.execPath,
  [
    "build",
    "./src/index.ts",
    "--target=node",
    "--format=esm",
    "--outdir=dist",
    "--packages=external",
  ],
  { cwd: root, stdio: "inherit" }
)

const lines = readFileSync(entry, "utf8").split("\n")
const body = lines
  .filter((line, index) => !(index < 2 && line.startsWith("#!")))
  .join("\n")
writeFileSync(entry, `${SHEBANG}\n${body}`)
chmodSync(entry, 0o755)

console.log(`Built ${path.relative(process.cwd(), entry)}`)
