"use client"

import * as React from "react"
import { cn } from "cn"

import {
  BillingExtraRunsChoice,
  BillingSeatsField,
} from "@/registry/bases/__base__/blocks/billing-01/components/billing-controls"
import { BillingInvoiceLines } from "@/registry/bases/__base__/blocks/billing-01/components/billing-invoice-lines"
import { SAMPLE_NOW } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  formatCount,
  formatDay,
  formatMoney,
  formatQuantity,
  getExtraRunsRate,
  getInvoiceDate,
  getPlan,
  getProration,
  toEstimateDiff,
  type BillingAccount,
  type BillingEstimate,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import { Skeleton } from "@/registry/bases/__base__/ui/skeleton"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function getActionLabel(seatsAdded: number, draft: BillingEstimate) {
  if (seatsAdded > 0)
    return `Add ${formatQuantity(seatsAdded, "seat", "seats")}`
  if (seatsAdded < 0) {
    return `Remove ${formatQuantity(-seatsAdded, "seat", "seats")}`
  }
  return draft.extraRuns === "pause" ? "Pause at the limit" : "Keep running"
}

/**
 * The page's signature: what the next invoice is made of, and what it becomes
 * as the seats and the limit change, before anything is applied.
 */
export function BillingNextInvoiceCard({
  account,
  draft,
  canManage,
  isLoading,
  onDraftChange,
  onApply,
  className,
}: {
  account: BillingAccount
  draft: BillingEstimate
  canManage: boolean
  isLoading: boolean
  onDraftChange: (draft: BillingEstimate) => void
  onApply: () => void
  className?: string
}) {
  const id = React.useId()
  const diff = toEstimateDiff(account, draft, SAMPLE_NOW)
  const { limits, name } = getPlan(account.planId)
  const date = formatDay(getInvoiceDate(account, SAMPLE_NOW), SAMPLE_NOW)
  const { daysLeft } = getProration(account, SAMPLE_NOW)
  const isEnding = account.status === "canceled"
  const isTooFew = draft.seats < account.people
  const canTry = canManage && !account.scheduled && !isEnding && !isLoading

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Next invoice</CardTitle>
        <CardDescription>
          {isEnding
            ? `None after ${date}`
            : `${date}, estimated from the last 7 days`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-(--density-16)">
        {isLoading && (
          <Skeleton
            role="status"
            aria-busy
            aria-label="Loading the next invoice"
            className="min-h-112 flex-1"
          />
        )}
        {!isLoading && isEnding && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconPlaceholder
                  lucide="ReceiptTextIcon"
                  tabler="IconReceipt"
                  hugeicons="Invoice01Icon"
                  phosphor="ReceiptIcon"
                  remixicon="RiBillLine"
                />
              </EmptyMedia>
              <EmptyTitle>Nothing more to pay</EmptyTitle>
              <EmptyDescription>
                {name} stays on until {date}. Projects, customers and reports
                stay for 90 days after that, read only.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {!isLoading && !isEnding && (
          <BillingInvoiceLines
            label="Next invoice"
            invoice={diff.next}
            before={diff.hasChanged ? diff.current : undefined}
          />
        )}
        {canTry && (
          <div className="mt-auto grid grid-cols-1 gap-(--density-16) rounded-(--radius-control) bg-hover p-(--density-12) @2xl:grid-cols-2">
            <Field>
              <FieldLabel id={`${id}-seats-label`} htmlFor={`${id}-seats`}>
                Seats
              </FieldLabel>
              <BillingSeatsField
                id={`${id}-seats`}
                labelledBy={`${id}-seats-label`}
                describedBy={`${id}-seats-help`}
                value={draft.seats}
                min={account.people}
                max={limits.seats ?? undefined}
                onValueChange={(seats) => onDraftChange({ ...draft, seats })}
              />
              <FieldDescription
                id={`${id}-seats-help`}
                className="text-foreground/70"
              >
                {draft.seats <= account.people
                  ? `${account.people} people have one, so this is the fewest.`
                  : `${account.people} people have one.`}
              </FieldDescription>
            </Field>
            <Field>
              <FieldTitle id={`${id}-runs`}>
                At {formatCount(limits.runs)} runs
              </FieldTitle>
              <BillingExtraRunsChoice
                labelledBy={`${id}-runs`}
                value={draft.extraRuns}
                onValueChange={(extraRuns) =>
                  onDraftChange({ ...draft, extraRuns })
                }
              />
              <FieldDescription className="text-foreground/70">
                {draft.extraRuns === "continue"
                  ? `Extra runs cost ${getExtraRunsRate()}.`
                  : `Automations wait until ${date}.`}
              </FieldDescription>
            </Field>
          </div>
        )}
      </CardContent>
      {canTry && (
        <CardFooter className="min-h-(--density-36) flex-wrap justify-between gap-y-(--density-12)">
          <span
            aria-live="polite"
            className="min-w-0 flex-1 basis-60 text-(length:--density-text-12) text-pretty text-muted-foreground tabular-nums"
          >
            {!diff.hasChanged &&
              "Try a change to see its price. Nothing is charged until you apply it."}
            {diff.hasChanged &&
              diff.seatsAdded > 0 &&
              `${formatMoney(diff.addedNow)} for the ${daysLeft} days left, added to this invoice.`}
            {diff.hasChanged &&
              diff.seatsAdded < 0 &&
              `Your ${account.seats} seats stay until ${date}.`}
            {diff.hasChanged &&
              diff.seatsAdded === 0 &&
              "Applies now. You can change it back."}
          </span>
          <div
            className={cn(
              "flex gap-(--density-8)",
              !diff.hasChanged && "hidden @2xl:invisible @2xl:flex"
            )}
          >
            <Button
              variant="ghost"
              onClick={() =>
                onDraftChange({
                  seats: account.seats,
                  extraRuns: account.extraRuns,
                })
              }
            >
              Reset
            </Button>
            <fieldset disabled={isTooFew} className="contents">
              <Button onClick={onApply}>
                {getActionLabel(diff.seatsAdded, draft)}
              </Button>
            </fieldset>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
