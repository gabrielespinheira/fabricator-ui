"use client"

import * as React from "react"
import { cn } from "cn"

import { FinanceCardLink } from "@/registry/bases/__base__/blocks/finance-01/components/finance-card-link"
import { FinanceCounterpartyMark } from "@/registry/bases/__base__/blocks/finance-01/components/finance-counterparty"
import {
  formatMoney,
  getDueStatus,
  type FinanceApproval,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { useAppShell } from "@/registry/bases/__base__/ui/app-shell"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** Bills and reimbursements waiting on the person, with one way to act. */
export function FinanceApprovalsCard({
  approvals,
  now,
  onApprove,
  className,
}: {
  approvals: readonly FinanceApproval[]
  now: number
  onApprove: (approval: FinanceApproval) => void
  className?: string
}) {
  const { size } = useAppShell()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const nextFocusRef = React.useRef<number | null>(null)

  // The button that was pressed leaves with its row: the row that takes its
  // place keeps the focus, or the card once nothing waits.
  React.useEffect(() => {
    const index = nextFocusRef.current
    const content = contentRef.current
    if (index === null || !content) return
    nextFocusRef.current = null
    const buttons = content.querySelectorAll<HTMLElement>(
      "[data-slot=item-actions] button"
    )
    const target = buttons[Math.min(index, buttons.length - 1)] ?? content
    target.focus({ preventScroll: true })
  }, [approvals])

  const approve = (approval: FinanceApproval, index: number) => {
    nextFocusRef.current = index
    onApprove(approval)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Needs your approval</CardTitle>
        {approvals.length > 0 && (
          <CardDescription>Due soonest first</CardDescription>
        )}
        <CardAction>
          <FinanceCardLink href="/payments/approvals">View all</FinanceCardLink>
        </CardAction>
      </CardHeader>
      <CardContent
        ref={contentRef}
        tabIndex={-1}
        className="@container/approvals flex flex-1 flex-col px-[calc(var(--card-spacing)-var(--density-12))] outline-none"
      >
        {approvals.length === 0 ? (
          <Empty className="flex-1 py-(--density-24)">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconPlaceholder
                  lucide="CircleCheckIcon"
                  tabler="IconCircleCheck"
                  hugeicons="CheckmarkCircle02Icon"
                  phosphor="CheckCircleIcon"
                  remixicon="RiCheckboxCircleLine"
                />
              </EmptyMedia>
              <EmptyTitle>Nothing to approve</EmptyTitle>
              <EmptyDescription>
                Bills and reimbursements over $1,000 wait here for you.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {approvals.map((approval, index) => {
              const amount = formatMoney(approval.amount, { cents: true })
              const due = getDueStatus(approval, now)
              return (
                <Item key={approval.id} role="listitem" size="sm">
                  <ItemMedia>
                    <FinanceCounterpartyMark counterparty={approval.payee} />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle>{approval.payee.name}</ItemTitle>
                    <ItemDescription>
                      {approval.detail} ·{" "}
                      <span
                        className={cn(
                          "whitespace-nowrap",
                          due.isLate && "text-warning-text"
                        )}
                      >
                        {due.label}
                      </span>
                    </ItemDescription>
                  </ItemContent>
                  {/* Narrow cards move the amount and the button under the
                      text, on its edge. */}
                  <ItemActions className="basis-full justify-between gap-(--density-16) ps-[calc(var(--density-32)+var(--density-10))] @md/approvals:basis-auto @md/approvals:ps-0">
                    <span className="font-medium text-foreground tabular-nums">
                      {amount}
                    </span>
                    <Button
                      variant="outline"
                      size={size === "phone" ? "default" : "sm"}
                      aria-label={`Approve ${approval.payee.name}, ${amount}`}
                      onClick={() => approve(approval, index)}
                    >
                      Approve
                    </Button>
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  )
}
