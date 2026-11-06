export type SearchEvent = "escape" | "blur" | "open"

/**
 * What a key press or focus change does to the search, given its text. Escape
 * clears text first and closes on the next press; leaving an empty field closes
 * it. A search that isn't collapsible never closes.
 */
export function nextSearchAction(
  event: SearchEvent,
  { value, collapsible }: { value: string; collapsible: boolean }
): "open" | "clear" | "close" | "none" {
  if (event === "open") return "open"
  if (event === "escape") {
    if (value) return "clear"
    return collapsible ? "close" : "none"
  }
  return collapsible && !value ? "close" : "none"
}

/** The website's `width` is a CSS length; React Native takes points or a percentage. */
export function toDimension(
  width: number | string | undefined
): number | `${number}%` | undefined {
  if (width === undefined || typeof width === "number") return width
  const match = /^([\d.]+)(px|%)?$/.exec(width.trim())
  if (!match) return undefined
  const amount = Number(match[1])
  return match[2] === "%" ? `${amount}%` : amount
}
