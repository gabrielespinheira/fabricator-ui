import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { DOCUMENT_TYPE } from "../../registry/native/lib/editor-native-model"
import { bundleDomainEngine } from "./bundle-domain-engine"
import { platformCatalogSchema } from "./schemas"
import { syncEditor } from "./sync-editor"
import { syncFileIcons } from "./sync-file-icons"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
)
const resources = path.join(projectRoot, "apps/web/registry/swiftui/resources")
await mkdir(resources, { recursive: true })
await copyFile(
  path.join(projectRoot, "apps/web/generated/platforms/contract.json"),
  path.join(resources, "contract.json")
)
await copyFile(
  path.join(projectRoot, "apps/web/generated/platforms/bot-face.json"),
  path.join(resources, "bot-face.json")
)
for (const notice of ["icons-license.txt", "brands-notices.md"]) {
  await copyFile(
    path.join(projectRoot, "apps/web/generated/platforms", notice),
    path.join(resources, notice)
  )
}
for (const font of [
  "InterVariable.ttf",
  "InterVariable-Italic.ttf",
  "LICENSE.txt",
  "GeistMonoVariable.ttf",
  "GeistMonoVariable-Italic.ttf",
  "GeistMono-OFL.txt",
]) {
  await copyFile(
    path.join(projectRoot, "apps/web/registry/fabricator/assets/fonts", font),
    path.join(resources, font)
  )
}
for (const notice of ["LICENSE.md", "NOTICE.md"]) {
  await copyFile(
    path.join(projectRoot, notice),
    path.join(projectRoot, "apps/web/registry/swiftui", notice)
  )
}
await syncEditor(projectRoot)
await syncFileIcons(projectRoot, resources)
await bundleDomainEngine(projectRoot, "document")
await bundleDomainEngine(projectRoot, "date-picker")
await writeFile(
  path.join(resources, "document-typography.json"),
  `${JSON.stringify(DOCUMENT_TYPE)}\n`
)
const contract = platformCatalogSchema.parse(
  JSON.parse(await readFile(path.join(resources, "contract.json"), "utf8"))
)
process.stdout.write(
  `Synced SwiftUI tokens, ${contract.items.length} catalog entries, Fabricator Icons, Bot Face contours and Inter fonts.\n`
)
