import {
  type ParsedAddress,
  type SendFailure,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"

// Stands in for your server. Sending takes a moment, and a mail server
// outside the company turns the first try away, so a partial result can be
// looked at: invite sofia@northwind.io beside a colleague.

const SEND_TIME = 900

export async function sendInvitations(
  addresses: readonly ParsedAddress[],
  { ownDomains, isRetry }: { ownDomains: readonly string[]; isRetry: boolean }
): Promise<{ sent: ParsedAddress[]; failed: SendFailure[] }> {
  await new Promise((resolve) => setTimeout(resolve, SEND_TIME))
  const isRefused = ({ email }: ParsedAddress) =>
    !isRetry && !ownDomains.includes(email.split("@")[1] ?? "")
  return {
    sent: addresses.filter((address) => !isRefused(address)),
    failed: addresses.filter(isRefused).map(({ email }) => ({
      email,
      reason: `${email.split("@")[1]} didn't answer. It usually does on a second try.`,
    })),
  }
}

export type MembersDemoState = "ready" | "loading" | "error"

/** ?state=loading and ?state=error show those states. */
export function getDemoState(search: string): MembersDemoState {
  const state = new URLSearchParams(search).get("state")
  return state === "loading" || state === "error" ? state : "ready"
}
