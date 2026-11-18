import { promises as fs } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { registry } from "@/registry/bases/base/registry"
import { createPlatformBotFaceGeometry } from "@/registry/fabricator/platform-bot-face"
import {
  collectPlatformItems,
  createPlatformContract,
} from "@/registry/fabricator/platform-contracts"
import {
  FABRICATOR_EXCLUDED_ITEMS,
  fabricatorItems,
} from "@/registry/fabricator/registry"
import { nativeItems } from "@/registry/native/_registry"

import { loadBrands } from "../../../packages/icons-core/src/brands"
import {
  brandsText,
  licenseText,
} from "../../../packages/icons-core/src/notices"
import { loadOutlineIcons } from "../../../packages/icons-core/src/outline"

export async function buildPlatformContract() {
  const entries = [
    ...registry.items,
    ...fabricatorItems,
    ...nativeItems,
  ].filter(
    (item) =>
      !(item.name in FABRICATOR_EXCLUDED_ITEMS) && item.name !== "example"
  )
  const items = collectPlatformItems(entries)
  const icons = [
    ...loadOutlineIcons().map(({ name, node }) => ({ name, node })),
    ...loadBrands().map(({ name, node }) => ({
      name: `brand-${name}`,
      node: node.map(([tag, attributes]) => [
        tag,
        { fill: "currentColor", stroke: "none", ...attributes },
      ]),
    })),
  ]
  const contract = createPlatformContract(items, icons)
  const output = path.resolve("generated/platforms/contract.json")
  await fs.mkdir(path.dirname(output), { recursive: true })
  const content = `${JSON.stringify(contract, null, 2)}\n`
  if ((await fs.readFile(output, "utf8").catch(() => null)) !== content)
    await fs.writeFile(output, content)
  const botFaceFile = path.join(path.dirname(output), "bot-face.json")
  const botFace = JSON.stringify(createPlatformBotFaceGeometry())
  if ((await fs.readFile(botFaceFile, "utf8").catch(() => null)) !== botFace)
    await fs.writeFile(botFaceFile, botFace)
  await fs.writeFile(
    path.join(path.dirname(output), "icons-license.txt"),
    licenseText()
  )
  await fs.writeFile(
    path.join(path.dirname(output), "brands-notices.md"),
    brandsText()
  )
  return contract
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const contract = await buildPlatformContract()
  console.info(
    `Platform contract: ${contract.items.length} families and blocks, ${contract.icons.length} icons.`
  )
}
