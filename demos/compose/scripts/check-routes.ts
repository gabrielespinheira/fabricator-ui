import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const contract = z
  .object({
    items: z.array(z.object({ name: z.string(), type: z.string() })),
  })
  .parse(
    JSON.parse(
      await readFile(
        resolve(root, "../../apps/web/generated/platforms/contract.json"),
        "utf8"
      )
    )
  )
const gallery = await readFile(
  resolve(
    root,
    "gallery/src/commonMain/kotlin/dev/fabricator/gallery/gallery.kt"
  ),
  "utf8"
)
const missing = contract.items.filter(
  (item) =>
    item.type !== "registry:block" && !gallery.includes(`"${item.name}"`)
)
if (missing.length) {
  process.stderr.write(
    missing.map(({ name }) => `Missing gallery route: ${name}\n`).join("")
  )
  process.exit(1)
}
process.stdout.write(`Every catalog component has a gallery route.\n`)
