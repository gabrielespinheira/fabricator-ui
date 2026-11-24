import {
  canHaveVatId,
  getCountryName,
  type BillingDetails,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"

/** Who the invoices are made out to. */
export function BillingDetailsCard({
  details,
  canManage,
  onEdit,
  className,
}: {
  details: BillingDetails
  canManage: boolean
  onEdit: () => void
  className?: string
}) {
  const { company, address, country, vatId, email } = details
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Billing details</CardTitle>
        <CardDescription>On every invoice</CardDescription>
        {canManage && (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className="-me-3"
              onClick={onEdit}
            >
              Edit
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-(--density-16)">
          <div className="flex flex-col gap-0.5">
            <dt className="text-(length:--density-text-12) text-muted-foreground">
              Company
            </dt>
            <dd>{company}</dd>
            <dd className="text-pretty">
              {address}, {getCountryName(country)}
            </dd>
          </div>
          {canHaveVatId(country) && (
            <div className="flex flex-col items-start gap-0.5">
              <dt className="text-(length:--density-text-12) text-muted-foreground">
                VAT ID
              </dt>
              <dd className="tabular-nums">
                {vatId || <Badge variant="warning">Missing</Badge>}
              </dd>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <dt className="text-(length:--density-text-12) text-muted-foreground">
              Sent to
            </dt>
            <dd className="break-words">{email}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
