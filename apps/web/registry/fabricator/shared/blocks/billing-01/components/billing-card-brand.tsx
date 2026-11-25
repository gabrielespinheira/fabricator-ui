import { type BillingCardBrand } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-card-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** The card network's mark, or a plain card for the ones without one here. */
export function BillingCardBrandMark({ brand }: { brand: BillingCardBrand }) {
  if (brand === "mastercard") {
    return (
      <svg
        viewBox="0 0 24 16"
        aria-hidden="true"
        className="h-(--density-16) w-auto"
      >
        <circle cx="8" cy="8" r="7" fill="#eb001b" />
        <circle cx="16" cy="8" r="7" fill="#f79e1b" />
        <path
          d="M12 2.26a7 7 0 0 1 0 11.48 7 7 0 0 1 0-11.48Z"
          fill="#ff5f00"
        />
      </svg>
    )
  }
  return (
    <IconPlaceholder
      lucide="CreditCardIcon"
      tabler="IconCreditCard"
      hugeicons="CreditCardIcon"
      phosphor="CreditCardIcon"
      remixicon="RiBankCardLine"
      className="size-(--density-icon-16)"
    />
  )
}
