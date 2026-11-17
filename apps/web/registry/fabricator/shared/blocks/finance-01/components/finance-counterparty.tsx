import { type FinanceCounterparty } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-data"
import { Avatar, AvatarFallback } from "@/registry/bases/__base__/ui/avatar"

/** A company's logo on a quiet tile, or a person's avatar, at one size. */
export function FinanceCounterpartyMark({
  counterparty,
}: {
  counterparty: FinanceCounterparty
}) {
  if (counterparty.kind === "person") {
    return (
      <Avatar>
        <AvatarFallback>{counterparty.initials}</AvatarFallback>
      </Avatar>
    )
  }

  const Logo = counterparty.logo
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
    >
      <Logo color="brand" size={16} />
    </span>
  )
}
