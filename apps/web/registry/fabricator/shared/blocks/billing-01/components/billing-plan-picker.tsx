"use client"

import * as React from "react"
import { cn } from "cn"

import {
  BillingChoiceCards,
  BillingConfirm,
  BillingIntervalChoice,
  BillingSeatsField,
} from "@/registry/bases/__base__/blocks/billing-01/components/billing-controls"
import {
  getCardBrandName,
  type BillingCard,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-card-model"
import { SAMPLE_NOW } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  BILLING_PLANS,
  formatDay,
  formatMoney,
  formatQuantity,
  getCharge,
  getPlan,
  getPlanChange,
  getPlanDifferences,
  getYearlySaving,
  isBillingPlanId,
  type BillingAccount,
  type BillingDifference,
  type BillingPlan,
  type BillingPlanChange,
  type BillingSelection,
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
import { FieldLabel } from "@/registry/bases/__base__/ui/field"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const PAY_TIME = 1200

function DifferenceMark({ direction }: Pick<BillingDifference, "direction">) {
  if (direction === "more") {
    return (
      <IconPlaceholder
        lucide="PlusIcon"
        tabler="IconPlus"
        hugeicons="PlusSignIcon"
        phosphor="PlusIcon"
        remixicon="RiAddLine"
        className="text-success"
      />
    )
  }
  if (direction === "less") {
    return (
      <IconPlaceholder
        lucide="MinusIcon"
        tabler="IconMinus"
        hugeicons="MinusSignIcon"
        phosphor="MinusIcon"
        remixicon="RiSubtractLine"
        className="text-destructive"
      />
    )
  }
  return (
    <IconPlaceholder
      lucide="CheckIcon"
      tabler="IconCheck"
      hugeicons="Tick02Icon"
      phosphor="CheckIcon"
      remixicon="RiCheckLine"
      className="text-muted-foreground"
    />
  )
}

const DIRECTION_LABELS = {
  more: "More: ",
  less: "Less: ",
  same: "",
} satisfies Record<BillingDifference["direction"], string>

function PlanOption({
  plan,
  account,
  selection,
}: {
  plan: BillingPlan
  account: BillingAccount
  selection: BillingSelection
}) {
  const isCurrent = plan.id === account.planId
  const price = plan.seatPrice[selection.interval]
  return (
    <span className="flex h-full flex-col gap-(--density-16)">
      <span className="flex flex-col gap-0.5">
        <span className="flex min-h-(--density-24) items-center gap-(--density-8) text-(length:--density-text-14) font-medium">
          {plan.name}
          {isCurrent && <Badge variant="secondary">Current</Badge>}
        </span>
        <span className="text-foreground/70">{plan.summary}</span>
      </span>
      <span className="flex flex-col">
        <span className="text-2xl tracking-tight tabular-nums weight-semibold">
          {price === 0 ? "Free" : formatMoney(price, { isWhole: true })}
        </span>
        <span className="text-(length:--density-text-12) text-foreground/70 tabular-nums">
          {price === 0
            ? "For up to 3 people"
            : `a seat each ${selection.interval}, ${formatMoney(getCharge({ ...selection, planId: plan.id }), { isWhole: true })} for ${selection.seats}`}
        </span>
      </span>
      <span className="flex flex-col gap-(--density-6)">
        {getPlanDifferences(account.planId, plan.id).map((difference) => (
          <span
            key={difference.id}
            className="flex items-start gap-(--density-8) [&>svg]:mt-0.5 [&>svg]:size-(--density-icon-14) [&>svg]:shrink-0"
          >
            <DifferenceMark direction={difference.direction} />
            <span>
              <span className="sr-only">
                {DIRECTION_LABELS[difference.direction]}
              </span>
              {difference.to}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}

function getSummary(
  account: BillingAccount,
  selection: BillingSelection,
  change: BillingPlanChange
) {
  const plan = getPlan(selection.planId)
  const date = formatDay(change.renewsOn, SAMPLE_NOW)
  const amount = formatMoney(change.today.total)
  switch (change.kind) {
    case "none":
      return { title: "No change", action: "Change plan", verb: "" }
    case "downgrade":
      return {
        title: `${plan.name} from ${date}`,
        action: `Move to ${plan.name}`,
        verb: `Move to ${plan.name}`,
      }
    case "seats":
      return selection.seats < account.seats
        ? {
            title: `${selection.seats} seats from ${date}`,
            action: "Remove seats",
            verb: "Remove seats",
          }
        : {
            title: "Due today",
            action: `Pay ${amount}`,
            verb: "Pay and add seats",
          }
    case "monthly":
      return {
        title: `Monthly from ${date}`,
        action: "Switch to monthly",
        verb: "Switch to monthly",
      }
    case "yearly":
      return {
        title: "Due today",
        action: `Pay ${amount}`,
        verb: "Pay and switch to yearly",
      }
    case "upgrade":
      return {
        title: "Due today",
        action: `Pay ${amount}`,
        verb: "Pay and upgrade",
      }
  }
}

function getConfirmTitle(
  selection: BillingSelection,
  change: BillingPlanChange
) {
  const { name } = getPlan(selection.planId)
  if (change.kind === "upgrade") return `Upgrade to ${name}?`
  if (change.kind === "downgrade") return `Move to ${name}?`
  if (change.kind === "yearly") return "Switch to yearly?"
  if (change.kind === "monthly") return "Switch to monthly?"
  return `Change to ${formatQuantity(selection.seats, "seat", "seats")}?`
}

/** Plans side by side, what changes, and the exact charge before any of it. */
export function BillingPlanPicker({
  account,
  card,
  onCancel,
  onConfirm,
}: {
  account: BillingAccount
  card: BillingCard | null
  onCancel: () => void
  onConfirm: (selection: BillingSelection, change: BillingPlanChange) => void
}) {
  const id = React.useId()
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const [selection, setSelection] = React.useState<BillingSelection>({
    planId: account.planId,
    interval: account.interval,
    seats: account.seats,
  })
  const [isConfirming, setConfirming] = React.useState(false)
  const [isPaying, setPaying] = React.useState(false)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const plan = getPlan(selection.planId)
  const change = getPlanChange(account, selection, SAMPLE_NOW)
  const summary = getSummary(account, selection, change)
  const renewal = formatDay(change.renewsOn, SAMPLE_NOW)
  const isCharged = change.today.total > 0
  const isBlocked = change.blockers.length > 0
  const saving = getYearlySaving(selection.planId, selection.seats)
  const payer = card
    ? `${getCardBrandName(card.brand)} ending ${card.last4}`
    : "The card you add"

  const confirm = () => {
    if (!isCharged) {
      onConfirm(selection, change)
      return
    }
    setPaying(true)
    timer.current = setTimeout(() => onConfirm(selection, change), PAY_TIME)
  }

  const then =
    change.recurring.total === 0
      ? "Free after that."
      : `${formatMoney(change.recurring.total)} a ${selection.interval} from ${renewal}, VAT included.`

  return (
    <fieldset
      disabled={isPaying}
      className="flex min-w-0 flex-col gap-(--density-24)"
    >
      <legend className="sr-only">Change plan</legend>
      <div className="flex flex-wrap items-center gap-x-(--density-12) gap-y-(--density-8)">
        <BillingIntervalChoice
          value={selection.interval}
          onValueChange={(interval) => setSelection({ ...selection, interval })}
        />
        <span
          aria-live="polite"
          className="text-(length:--density-text-12) text-muted-foreground tabular-nums"
        >
          {saving === 0
            ? "Starter is free either way"
            : selection.interval === "year"
              ? `Saves ${formatMoney(saving, { isWhole: true })} a year`
              : `Yearly saves ${formatMoney(saving, { isWhole: true })} a year`}
        </span>
        <div className="flex items-center gap-(--density-12) @2xl:ms-auto">
          <FieldLabel id={`${id}-seats-label`} htmlFor={`${id}-seats`}>
            Seats
          </FieldLabel>
          <div className="w-32">
            <BillingSeatsField
              id={`${id}-seats`}
              labelledBy={`${id}-seats-label`}
              value={selection.seats}
              min={1}
              max={plan.limits.seats ?? undefined}
              onValueChange={(seats) => setSelection({ ...selection, seats })}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-(--density-16) @4xl:grid-cols-12">
        <BillingChoiceCards
          label="Plan"
          value={selection.planId}
          onValueChange={(planId) => {
            if (!isBillingPlanId(planId)) return
            const max = getPlan(planId).limits.seats ?? selection.seats
            setSelection({
              ...selection,
              planId,
              seats: Math.min(
                max,
                planId === "starter"
                  ? max
                  : Math.max(selection.seats, account.seats)
              ),
            })
          }}
          options={BILLING_PLANS.map((option) => ({
            value: option.id,
            content: (
              <PlanOption
                plan={option}
                account={account}
                selection={selection}
              />
            ),
          }))}
          className="grid grid-cols-1 gap-(--density-16) @3xl:grid-cols-3 @4xl:col-span-12"
        />
        <Card className="@4xl:col-span-8">
          <CardHeader>
            <CardTitle>
              {isBlocked ? "Before you can change" : "What changes"}
            </CardTitle>
            <CardDescription>
              {isBlocked
                ? `${plan.name} has no room for ${formatQuantity(change.blockers.length, "thing", "things")}`
                : change.kind === "none"
                  ? "Pick another plan, billing or number of seats"
                  : `From ${change.timing === "now" ? "today" : renewal}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-[calc(var(--card-spacing)-var(--density-12))]">
            <ItemGroup>
              {change.blockers.map((blocker) => (
                <Item role="listitem" key={blocker.id} size="sm">
                  <ItemMedia variant="icon">
                    <IconPlaceholder
                      lucide="CircleAlertIcon"
                      tabler="IconExclamationCircle"
                      hugeicons="AlertCircleIcon"
                      phosphor="WarningCircleIcon"
                      remixicon="RiErrorWarningLine"
                      className="text-destructive"
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{blocker.title}</ItemTitle>
                    <ItemDescription>{blocker.detail}</ItemDescription>
                  </ItemContent>
                  <Button variant="outline" size="sm">
                    {blocker.id === "people" ? "See members" : "See files"}
                  </Button>
                </Item>
              ))}
              {getPlanDifferences(account.planId, selection.planId)
                .filter(({ direction }) => direction !== "same")
                .map((difference) => (
                  <Item role="listitem" key={difference.id} size="sm">
                    <ItemMedia variant="icon">
                      <DifferenceMark direction={difference.direction} />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{difference.label}</ItemTitle>
                      <ItemDescription className="tabular-nums">
                        {difference.from}, then {difference.to}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              {change.kind !== "none" &&
                selection.interval !== account.interval && (
                  <Item role="listitem" size="sm">
                    <ItemMedia variant="icon">
                      <IconPlaceholder
                        lucide="CalendarIcon"
                        tabler="IconCalendar"
                        hugeicons="CalendarIcon"
                        phosphor="CalendarBlankIcon"
                        remixicon="RiCalendarLine"
                        className="text-muted-foreground"
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>Billing</ItemTitle>
                      <ItemDescription className="tabular-nums">
                        {selection.interval === "year"
                          ? `One charge a year, next on ${renewal}`
                          : `A charge each month, from ${renewal}`}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                )}
              {selection.seats !== account.seats && (
                <Item role="listitem" size="sm">
                  <ItemMedia variant="icon">
                    <IconPlaceholder
                      lucide="UsersIcon"
                      tabler="IconUsers"
                      hugeicons="UserGroupIcon"
                      phosphor="UsersIcon"
                      remixicon="RiGroupLine"
                      className="text-muted-foreground"
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Seats you pay for</ItemTitle>
                    <ItemDescription className="tabular-nums">
                      {account.seats}, then {selection.seats}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              )}
            </ItemGroup>
          </CardContent>
        </Card>
        <Card className="@4xl:col-span-4">
          <CardHeader>
            <CardTitle>{summary.title}</CardTitle>
            <CardDescription>
              {change.timing === "renewal" && change.kind !== "none"
                ? "Nothing to pay today"
                : payer}
            </CardDescription>
          </CardHeader>
          <CardContent
            aria-live="polite"
            className="flex flex-1 flex-col gap-(--density-8) tabular-nums"
          >
            {isCharged && (
              <>
                {[
                  ...change.today.lines,
                  {
                    id: "tax",
                    label: "VAT",
                    detail: change.today.tax.detail,
                    amount: change.today.tax.amount,
                  },
                ].map((line) => (
                  <div
                    key={line.id}
                    className="flex justify-between gap-(--density-12)"
                  >
                    <span className="flex min-w-0 flex-col">
                      {line.label}
                      <span className="text-(length:--density-text-12) text-muted-foreground">
                        {line.detail}
                      </span>
                    </span>
                    {formatMoney(line.amount)}
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-(--density-12) pt-(--density-8) text-(length:--density-text-16) weight-semibold">
                  Total today
                  <span>{formatMoney(change.today.total)}</span>
                </div>
              </>
            )}
            <p className="text-(length:--density-text-12) text-pretty text-muted-foreground">
              {change.kind === "none"
                ? `You stay on ${plan.name} at ${formatMoney(change.recurring.total)} a ${selection.interval}, VAT included.`
                : isCharged
                  ? `Then ${then}`
                  : then}
            </p>
          </CardContent>
          <CardFooter className="mt-auto flex-col items-stretch">
            <fieldset
              disabled={change.kind === "none" || isBlocked}
              className="flex flex-col"
            >
              <Button onClick={() => setConfirming(true)}>
                {isPaying && <Spinner data-icon="inline-start" />}
                {isPaying ? "Paying…" : summary.action}
              </Button>
            </fieldset>
            <Button variant="ghost" onClick={onCancel}>
              Back to billing
            </Button>
          </CardFooter>
        </Card>
      </div>
      <BillingConfirm
        open={isConfirming}
        onOpenChange={setConfirming}
        title={getConfirmTitle(selection, change)}
        description={
          isCharged
            ? `${payer} is charged ${formatMoney(change.today.total)} today, then ${then}`
            : `It starts on ${renewal}. Until then everything stays as it is. ${then}`
        }
        cancelLabel={`Keep ${getPlan(account.planId).name}`}
        actionLabel={summary.verb}
        onConfirm={confirm}
      >
        {change.kind === "downgrade" && (
          <ul
            className={cn(
              "flex flex-col gap-(--density-6) rounded-lg bg-hover p-(--density-12)"
            )}
          >
            {change.losses.map((loss) => (
              <li key={loss.id} className="flex gap-(--density-8)">
                <DifferenceMark direction="less" />
                {loss.to}
              </li>
            ))}
          </ul>
        )}
      </BillingConfirm>
    </fieldset>
  )
}
