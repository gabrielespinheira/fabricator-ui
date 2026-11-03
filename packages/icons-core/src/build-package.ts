import { spawn } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(import.meta.url)
const TSC = require.resolve("typescript/bin/tsc")

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

/**
 * Compiles a package's src/ to dist/esm and dist/cjs with tsc, one file per
 * module so every icon stays its own tree-shakable file. JavaScript drops
 * comments (the icon previews are large); declarations keep them for editors.
 */
export async function buildPackage(root: string) {
  const dist = path.join(root, "dist")
  fs.rmSync(dist, { recursive: true, force: true })
  await Promise.all([
    tsc(root, [
      "-p",
      "tsconfig.build.json",
      "--removeComments",
      "--declaration",
      "false",
    ]),
    tsc(root, ["-p", "tsconfig.build.json", "--emitDeclarationOnly"]),
    tsc(root, [
      "-p",
      "tsconfig.cjs.json",
      "--removeComments",
      "--declaration",
      "false",
    ]),
    tsc(root, ["-p", "tsconfig.cjs.json", "--emitDeclarationOnly"]),
  ])
  fs.writeFileSync(
    path.join(dist, "cjs", "package.json"),
    `${JSON.stringify({ type: "commonjs" })}\n`
  )
}
