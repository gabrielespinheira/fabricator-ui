import {
  resolveFilePaint,
  type FileIconData,
  type FilePalette,
} from "./files.js"

function attributes(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ")
}

/** Standalone SVGs resolve a scheme; omitted scheme keeps the theme variables. */
export function renderFileSvg(
  icon: FileIconData,
  palette: FilePalette,
  scheme?: "light" | "dark",
  size = 16
) {
  const prefix = `fab-${icon.name}-`
  const shapes = (node: FileIconData["node"]) =>
    node
      .map(
        ([tag, values]) =>
          `<${tag} ${attributes({ ...values, ...(values.mask && { mask: values.mask.replace("url(#", `url(#${prefix}`) }) })}/>`
      )
      .join("")
  const masks =
    icon.masks
      ?.map(
        (mask) =>
          `<mask ${attributes({ ...mask.attributes, id: `${prefix}${mask.id}` })}>${shapes(mask.node)}</mask>`
      )
      .join("") ?? ""
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none">${masks}${shapes(scheme ? resolveFilePaint(icon.node, palette, scheme) : icon.node)}</svg>`
}
