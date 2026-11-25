import { type FinanceCounterparty } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { Avatar, AvatarFallback } from "@/registry/bases/__base__/ui/avatar"

/** A company's logo on a quiet tile, or initials, at one size. */
export function FinanceCounterpartyMark({
  counterparty,
}: {
  counterparty: FinanceCounterparty
}) {
  if (counterparty.kind === "initials") {
    return (
      <Avatar aria-hidden>
        <AvatarFallback>{counterparty.initials}</AvatarFallback>
      </Avatar>
    )
  }

  const Logo = counterparty.logo
  return (
    <span
      aria-hidden
      className="flex size-(--density-32) shrink-0 items-center justify-center rounded-full bg-hover"
    >
      <Logo color="brand" className="size-(--density-icon-16)" />
    </span>
  )
}
