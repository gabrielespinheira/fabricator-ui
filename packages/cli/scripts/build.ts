// Bundles src/index.ts into dist/index.js for Node. What's in `dependencies` stays
// external; `@fabricator-ui/setup`, private, is bundled in. Then copies what the
// CLI writes into projects, and makes the output executable.
import { execFileSync } from "node:child_process"
import { chmodSync, cpSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import pkg from "../package.json" with { type: "json" }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repo = path.resolve(root, "../..")
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
    ...Object.keys(pkg.dependencies).map((name) => `--external=${name}`),
  ],
  { cwd: root, stdio: "inherit" }
)

const lines = readFileSync(entry, "utf8").split("\n")
const body = lines
  .filter((line, index) => !(index < 2 && line.startsWith("#!")))
  .join("\n")
writeFileSync(entry, `${SHEBANG}\n${body}`)
chmodSync(entry, 0o755)

cpSync(path.join(root, "templates"), path.join(dist, "templates"), {
  recursive: true,
})
cpSync(
  path.join(repo, "skills/fabricator"),
  path.join(dist, "skills/fabricator"),
  {
    recursive: true,
    filter: (file) => path.basename(file) !== "evals",
  }
)

console.log(`Built ${path.relative(process.cwd(), entry)}`)
