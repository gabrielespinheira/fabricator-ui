// The workspace's web address: what may be typed, what is taken, and the
// nearest address that would work.

export type AddressState =
  | { kind: "current" }
  | { kind: "empty" }
  | { kind: "invalid"; reason: string }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken"; suggestions: string[] }

export const ADDRESS_MIN = 3
export const ADDRESS_MAX = 32

/** What a name becomes as an address: "Acme Inc." is "acme-inc". */
export function toAddress(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, ADDRESS_MAX)
}

/** What is wrong before asking the server, or null. */
export function getAddressError(address: string) {
  if (address.length < ADDRESS_MIN)
    return `Use at least ${ADDRESS_MIN} characters.`
  if (/^-|-$/.test(address)) return "Start and end with a letter or a number."
  return null
}

export function suggestAddresses(
  address: string,
  taken: readonly string[],
  count = 2
) {
  return ["hq", "team", "app", "co"]
    .map((ending) => `${address}-${ending}`)
    .filter((option) => option.length <= ADDRESS_MAX && !taken.includes(option))
    .slice(0, count)
}

/** The answer a server gives once it looked the address up. */
export function lookUpAddress(
  address: string,
  { current, taken }: { current: string; taken: readonly string[] }
): AddressState {
  if (address === current) return { kind: "current" }
  if (address === "") return { kind: "empty" }
  const reason = getAddressError(address)
  if (reason) return { kind: "invalid", reason }
  return taken.includes(address)
    ? { kind: "taken", suggestions: suggestAddresses(address, taken) }
    : { kind: "available" }
}

export function canSaveAddress(state: AddressState) {
  return state.kind === "available"
}
