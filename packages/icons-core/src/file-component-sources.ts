import { loadFileIcons } from "./file-icons"
import { toPascalCase } from "./names"
import { toCamelCaseAttributes, withGeneratedHeader } from "./output"
import type { FileIconData } from "./runtime/files"

export function buildFileComponentSources() {
  const { icons, palette, fileNames, fileExtensions, folderNames } =
    loadFileIcons()
  const files = new Map<string, string>()
  const data = icons.map(
    (icon): FileIconData => ({
      ...icon,
      node: toCamelCaseAttributes(icon.node),
      ...(icon.masks && {
        masks: icon.masks.map((mask) => ({
          ...mask,
          attributes: Object.fromEntries(
            Object.entries(mask.attributes).map(([name, value]) => [
              name.replace(/-([a-z])/g, (_, letter: string) =>
                letter.toUpperCase()
              ),
              value,
            ])
          ),
          node: toCamelCaseAttributes(mask.node),
        })),
      }),
    })
  )
  for (const icon of data) {
    files.set(
      `files/${icon.name}.ts`,
      withGeneratedHeader(
        `import { createFileIcon } from "../../file-icon.js"\nimport type { FileIconData } from "../runtime/files.js"\nexport const fileData: FileIconData = ${JSON.stringify(icon)}\nexport default createFileIcon(fileData)\n`
      )
    )
  }
  files.set(
    "files.ts",
    withGeneratedHeader(
      data
        .map(
          (icon) =>
            `export { default as ${toPascalCase(icon.name)}Icon } from "./files/${icon.name}.js"`
        )
        .join("\n")
    )
  )
  files.set(
    "file-components.ts",
    withGeneratedHeader(
      `${data.map((icon, index) => `import Icon${index} from "./files/${icon.name}.js"`).join("\n")}\nimport type { FileIconComponent } from "../file-icon.js"\nexport const fileComponents: Record<string, FileIconComponent> = { ${data.map((icon, index) => `${JSON.stringify(icon.name)}: Icon${index}`).join(",")} }\n`
    )
  )
  files.set(
    "file-associations.ts",
    withGeneratedHeader(
      `import { resolveFileIconName, resolveFolderIconName } from "./runtime/files.js"\nexport const fileAssociations = ${JSON.stringify({ fileNames, fileExtensions, folderNames })}\nexport function getFileIconName(name: string) { return resolveFileIconName(name, fileAssociations) }\nexport function getFolderIconName(name: string, open = false) { return resolveFolderIconName(name, open, fileAssociations) }\n`
    )
  )
  files.set(
    "file-palette.ts",
    withGeneratedHeader(
      `import type { FilePalette } from "./runtime/files.js"\nexport const filePalette: FilePalette = ${JSON.stringify(palette)}\n`
    )
  )
  return files
}
