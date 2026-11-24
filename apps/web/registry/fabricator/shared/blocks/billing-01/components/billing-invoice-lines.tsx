import { cn } from "cn"

import {
  formatMoney,
  formatSignedMoney,
  getWaterfall,
  type BillingInvoiceSum,
  type BillingWaterfallStep,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import { Badge } from "@/registry/bases/__base__/ui/badge"

function StepBar({ step }: { step: BillingWaterfallStep }) {
  if (step.end === 0) return null
  return (
    <span
      className={cn(
        "absolute inset-y-0 min-w-0.5 rounded-sm transition-[inset-inline] duration-move ease-move @md/lines:inset-y-[calc(50%-var(--density-10)/2)]",
        step.isTotal && "bg-primary",
        !step.isTotal && !step.isCredit && "bg-(--chart-series-1)",
        // A credit takes away, so it is drawn as the part that is missing.
        step.isCredit &&
          "bg-[repeating-linear-gradient(135deg,var(--chart-series-1)_0_1.5px,transparent_1.5px_5px)]"
      )}
      style={{
        insetInlineStart: `${step.start}%`,
        insetInlineEnd: `${100 - step.end}%`,
      }}
    />
  )
}

/** The running sum, carried from one row's bar down to the next. */
function StepLink({
  at,
  isShown,
  className,
}: {
  at: number
  isShown: boolean
  className: string
}) {
  if (!isShown || at === 0) return null
  return (
    <span
      className={cn(
        "absolute hidden w-px bg-border transition-[inset-inline] duration-move ease-move @md/lines:block",
        className
      )}
      style={{ insetInlineStart: `calc(${at}% - 1px)` }}
    />
  )
}

/**
 * An invoice as a sum people can follow: each bar starts where the one above
 * it ended, and the total is where they arrive. `before` marks what changed.
 */
export function BillingInvoiceLines({
  invoice,
  before,
  label,
}: {
  invoice: BillingInvoiceSum
  before?: BillingInvoiceSum
  label: string
}) {
  const steps = getWaterfall(invoice)
  const previous = before ? getWaterfall(before) : []

  return (
    <ul aria-label={label} className="@container/lines flex flex-col">
      {steps.map((step) => {
        const old = previous.find(({ id }) => id === step.id)
        const change = before ? step.amount - (old?.amount ?? 0) : 0
        return (
          <li
            key={step.id}
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-(--density-16) gap-y-(--density-6) py-(--density-8) @md/lines:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_5.5rem]",
              step.isTotal && "py-(--density-12)"
            )}
          >
            <span className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "flex items-center gap-(--density-8)",
                  step.isTotal && "weight-semibold"
                )}
              >
                {step.label}
                {change !== 0 && (
                  <Badge
                    variant="outline"
                    className="animate-in tabular-nums duration-move ease-move fade-in-0"
                  >
                    {formatSignedMoney(change)}
                  </Badge>
                )}
              </span>
              {step.detail && (
                <span className="text-(length:--density-text-12) text-muted-foreground tabular-nums">
                  {step.detail}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "relative order-last col-span-2 block h-(--density-8) @md/lines:order-none @md/lines:col-span-1 @md/lines:-my-(--density-8) @md/lines:h-auto @md/lines:self-stretch",
                step.isTotal && "@md/lines:-my-(--density-12)"
              )}
            >
              <StepLink
                at={step.before}
                isShown={step.id !== steps[0]?.id}
                className="top-0 bottom-1/2"
              />
              <StepLink
                at={step.after}
                isShown={!step.isTotal}
                className="top-1/2 bottom-0"
              />
              <StepBar step={step} />
            </span>
            <span
              className={cn(
                "text-end tabular-nums",
                step.isTotal &&
                  "text-(length:--density-text-16) weight-semibold"
              )}
            >
              {formatMoney(step.amount)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
