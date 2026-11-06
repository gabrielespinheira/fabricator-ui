export { getExportNames, toPascalCase } from "./runtime/names"

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isKebabCase(name: string) {
  return KEBAB_CASE.test(name)
}
