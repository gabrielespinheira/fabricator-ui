/**
 * Size budget: one icon from this package must cost no more than the same
 * icon from lucide-react, minified and gzipped, React excluded.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
// Inside the package so the entries resolve its dependencies; .tmp* is gitignored.
const scratch = fs.mkdtempSync(path.join(root, ".tmp-size-"))

function measure(label: string, source: string) {
  const entry = path.join(scratch, `${label}.ts`)
  fs.writeFileSync(entry, source)
  const output = execFileSync(
    process.execPath,
    [
      "build",
      entry,
      "--minify",
      "--target=browser",
      "--external",
      "react",
      "--external",
      "react/jsx-runtime",
    ],
    { cwd: root, encoding: "utf8" }
  )
  return gzipSync(output).length
}

try {
  const ours = measure(
    "fabricator",
    `import { HouseIcon } from ${JSON.stringify(path.join(root, "src/index.ts"))}\nconsole.log(HouseIcon)\n`
  )
  const lucide = measure(
    "lucide",
    `import { HouseIcon } from "lucide-react-parity"\nconsole.log(HouseIcon)\n`
  )
  console.log(
    `HouseIcon, min+gzip: @fabricator-ui/icons ${ours} B, lucide-react ${lucide} B`
  )
  if (ours > lucide) {
    console.error("Over budget: a single icon costs more than in lucide-react.")
    process.exit(1)
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true })
}
