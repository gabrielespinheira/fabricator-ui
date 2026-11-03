/** `arrow-up-0-1` → `ArrowUp01`, matching lucide-react's export names. */
export function toPascalCase(name: string) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
}

/** Every icon is exported as `HouseIcon` and `House`. */
export function getExportNames(name: string): [suffixed: string, bare: string] {
  const pascal = toPascalCase(name)
  return [`${pascal}Icon`, pascal]
}
