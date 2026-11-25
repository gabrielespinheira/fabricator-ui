import { type BillingInvoiceStatus } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import { Badge } from "@/registry/bases/__base__/ui/badge"

const STATUSES = {
  paid: { label: "Paid", variant: "outline" },
  processing: { label: "Processing", variant: "info" },
  failed: { label: "Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
} as const satisfies Record<
  BillingInvoiceStatus,
  { label: string; variant: "outline" | "info" | "destructive" }
>

/** Paid is normal and stays quiet; colour is for what is open. */
export function BillingInvoiceStatusBadge({
  status,
  className,
}: {
  status: BillingInvoiceStatus
  className?: string
}) {
  const { label, variant } = STATUSES[status]
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
