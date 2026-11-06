import { spawn } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(import.meta.url)
const TSC = require.resolve("typescript/bin/tsc")
const ABANDONED_AFTER_MS = 60 * 60 * 1000

function tsc(cwd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [TSC, ...args], {
      cwd,
      stdio: "inherit",
    })
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`tsc ${args.join(" ")} exited with ${code}`))
    )
  })
}

// Ctrl-C during a build skips its cleanup. Older than any real build, so a
// build running in another process keeps its folder.
function removeAbandonedBuilds(root: string) {
  for (const name of fs.readdirSync(root)) {
    if (!name.startsWith(".dist-")) continue
    const folder = path.join(root, name)
    if (Date.now() - fs.statSync(folder).mtimeMs < ABANDONED_AFTER_MS) continue
    fs.rmSync(folder, { recursive: true, force: true })
  }
}

/**
 * Compiles a package's src/ to dist/esm and dist/cjs with tsc, one file per
 * module so every icon stays its own tree-shakable file. JavaScript drops
 * comments (the icon previews are large); declarations keep them for editors.
 */
export async function buildPackage(root: string) {
  const dist = path.join(root, "dist")
  const next = path.join(root, `.dist-next-${process.pid}`)
  const previous = path.join(root, `.dist-previous-${process.pid}`)
  const esm = ["-p", "tsconfig.build.json", "--outDir", `${next}/esm`]
  const cjs = ["-p", "tsconfig.cjs.json", "--outDir", `${next}/cjs`]

  removeAbandonedBuilds(root)
  try {
    // Settled, not Promise.all: a failed run must not delete the folder while
    // the other three still write to it.
    const results = await Promise.allSettled([
      tsc(root, [...esm, "--removeComments", "--declaration", "false"]),
      tsc(root, [...esm, "--emitDeclarationOnly"]),
      tsc(root, [...cjs, "--removeComments", "--declaration", "false"]),
      tsc(root, [...cjs, "--emitDeclarationOnly"]),
    ])
    for (const result of results) {
      if (result.status === "rejected") throw result.reason
    }
    fs.writeFileSync(
      path.join(next, "cjs", "package.json"),
      `${JSON.stringify({ type: "commonjs" })}\n`
    )

    // Swapped in only when complete: a running dev server imports dist, and
    // `bun run check` and `bun run test` rebuild it through turbo's ^build.
    if (fs.existsSync(dist)) fs.renameSync(dist, previous)
    fs.renameSync(next, dist)
    fs.rmSync(previous, { recursive: true, force: true })
  } finally {
    fs.rmSync(next, { recursive: true, force: true })
  }
}
