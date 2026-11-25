import { cn } from "cn"

import { SAMPLE_NOW } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  formatCount,
  formatDay,
  formatMoney,
  formatQuantity,
  formatStorage,
  getPlan,
  getProration,
  getYearlySaving,
  type BillingAccount,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
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

function PlanStatus({ account }: { account: BillingAccount }) {
  if (account.status === "trial") {
    const { daysLeft } = getProration(account, SAMPLE_NOW)
    return (
      <Badge variant="info" className="-my-1">
        Trial, {formatQuantity(daysLeft, "day", "days")} left
      </Badge>
    )
  }
  if (account.status === "canceled") {
    return (
      <Badge variant="warning" className="-my-1">
        Ends {formatDay(account.periodEnd, SAMPLE_NOW)}
      </Badge>
    )
  }
  return null
}

/** What the workspace is on, and the way to change it. */
export function BillingPlanCard({
  account,
  canManage,
  isPrimary,
  onChangePlan,
  onKeepPlan,
  onResume,
  className,
}: {
  account: BillingAccount
  canManage: boolean
  /** Its button is the page's filled one. */
  isPrimary: boolean
  onChangePlan: () => void
  onKeepPlan: () => void
  onResume: () => void
  className?: string
}) {
  const plan = getPlan(account.planId)
  const { interval, scheduled, status } = account
  const saving = getYearlySaving(account.planId, account.seats)
  const canSave = interval === "month" && saving > 0 && status !== "canceled"
  const facts = [
    {
      label: "Price",
      value: `${formatMoney(plan.seatPrice[interval], { isWhole: true })} a seat each ${interval}`,
    },
    {
      label: "Billed",
      value: `${interval === "month" ? "Monthly" : "Yearly"}, next on ${formatDay(account.periodEnd, SAMPLE_NOW)}`,
    },
    {
      label: "Includes",
      value: `${formatCount(plan.limits.runs)} runs, ${formatStorage(plan.limits.storage)}`,
    },
  ]

  return (
    <Card className={cn("@container/plan", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-(--density-8)">
          {plan.name}
          <PlanStatus account={account} />
        </CardTitle>
        <CardDescription>{plan.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-(--density-12) @md/plan:grid-cols-3 @md/plan:gap-(--density-16)">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="flex justify-between gap-(--density-16) @md/plan:flex-col @md/plan:justify-start @md/plan:gap-(--density-4)"
            >
              <dt className="text-(length:--density-text-12) text-muted-foreground">
                {fact.label}
              </dt>
              <dd className="text-end tabular-nums @md/plan:text-start">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
      {canManage && (
        <CardFooter className="mt-auto flex-wrap justify-between gap-y-(--density-12)">
          {status === "canceled" ? (
            <Button onClick={onResume}>Resume plan</Button>
          ) : (
            <Button
              variant={isPrimary ? "default" : "outline"}
              onClick={onChangePlan}
            >
              Change plan
            </Button>
          )}
          {scheduled ? (
            <span className="flex flex-wrap items-center gap-x-(--density-8) text-(length:--density-text-12) text-muted-foreground">
              {getPlan(scheduled.planId).name},{" "}
              {formatQuantity(scheduled.seats, "seat", "seats")} from{" "}
              {formatDay(account.periodEnd, SAMPLE_NOW)}
              <Button
                variant="ghost"
                size="sm"
                className="-me-3"
                onClick={onKeepPlan}
              >
                Keep {plan.name}
              </Button>
            </span>
          ) : (
            canSave && (
              <span className="text-(length:--density-text-12) text-muted-foreground tabular-nums">
                Yearly billing saves {formatMoney(saving, { isWhole: true })} a
                year
              </span>
            )
          )}
        </CardFooter>
      )}
    </Card>
  )
}
