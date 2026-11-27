import { cn } from "cn"

import { BillingCardBrandMark } from "@/registry/bases/__base__/blocks/billing-01/components/billing-card-brand"
import {
  formatCardExpiry,
  getCardBrandName,
  getExpiryState,
  type BillingCard,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-card-model"
import { SAMPLE_NOW } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function CardExpiry({
  card,
  isDeclined,
}: {
  card: BillingCard
  isDeclined: boolean
}) {
  const state = getExpiryState(card, SAMPLE_NOW)
  const date = formatCardExpiry(card)
  if (isDeclined) return <Badge variant="destructive">Declined</Badge>
  if (state === "expired") {
    return <Badge variant="destructive">Expired {date}</Badge>
  }
  if (state === "soon") {
    return (
      <Badge variant="warning">
        <IconPlaceholder
          lucide="TriangleAlertIcon"
          tabler="IconAlertTriangle"
          hugeicons="Alert02Icon"
          phosphor="WarningIcon"
          remixicon="RiErrorWarningLine"
        />
        Expires {date}
      </Badge>
    )
  }
  return (
    <span className="text-(length:--density-text-12) text-muted-foreground tabular-nums">
      Expires {date}
    </span>
  )
}

/** The card that pays, and whether it still will. */
export function BillingPaymentCard({
  card,
  canManage,
  isDeclined,
  onUpdateCard,
  className,
}: {
  card: BillingCard | null
  canManage: boolean
  isDeclined: boolean
  onUpdateCard: () => void
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Payment method</CardTitle>
        <CardDescription>
          {card ? "Charged for every invoice" : "Nothing to charge yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-(--density-12)">
        <span
          className={cn(
            "flex h-(--density-32) w-(--density-48) shrink-0 items-center justify-center rounded-(--radius-control) bg-hover",
            !card && "text-muted-foreground"
          )}
        >
          <BillingCardBrandMark brand={card?.brand ?? "card"} />
        </span>
        {card ? (
          <div className="flex min-w-0 flex-col items-start gap-(--density-4)">
            <span className="tabular-nums">
              {getCardBrandName(card.brand)} ending {card.last4}
            </span>
            <CardExpiry card={card} isDeclined={isDeclined} />
          </div>
        ) : (
          <span className="text-muted-foreground">No card yet</span>
        )}
      </CardContent>
      {canManage && (
        <CardFooter className="mt-auto">
          <Button variant="outline" onClick={onUpdateCard}>
            {card ? "Update card" : "Add card"}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
