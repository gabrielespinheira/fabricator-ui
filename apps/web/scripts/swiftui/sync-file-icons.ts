import { copyFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { loadFileIcons } from "../../../../packages/icons-core/src/file-icons"
import { renderFileSvg } from "../../../../packages/icons-core/src/runtime/file-svg"
import { renderSvgPng } from "../../../../packages/icons-static/src/render-svg-png"

export async function syncFileIcons(projectRoot: string, resources: string) {
  const { icons, palette, fileNames, fileExtensions, folderNames } =
    loadFileIcons()
  await mkdir(resources, { recursive: true })
  let bytes = 0
  for (const icon of icons) {
    for (const scheme of ["light", "dark"] as const) {
      const png = await renderSvgPng(renderFileSvg(icon, palette, scheme), 48)
      bytes += png.byteLength
      await writeFile(
        path.join(resources, `fabricator-files-${scheme}-${icon.name}@3x.png`),
        png
      )
    }
  }
  await writeFile(
    path.join(resources, "file-icons.json"),
    `${JSON.stringify({ names: icons.map(({ name }) => name), fileNames, fileExtensions, folderNames }, null, 2)}\n`
  )
  await copyFile(
    path.join(projectRoot, "packages/icons-core/sources/files/LICENSE"),
    path.join(resources, "file-icons-license.txt")
  )
  process.stdout.write(
    `Synced ${icons.length} canonical file icons in light/dark (48px; ${bytes} PNG bytes).\n`
  )
}
