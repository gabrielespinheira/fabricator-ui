import { FinanceCardLink } from "@/registry/bases/__base__/blocks/finance-01/components/finance-card-link"
import { FinanceCounterpartyMark } from "@/registry/bases/__base__/blocks/finance-01/components/finance-counterparty"
import { type FinanceApproval } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-data"
import {
  formatMoney,
  getApprovalSummary,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
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
  onApprove,
  className,
}: {
  approvals: FinanceApproval[]
  onApprove: (id: string) => void
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Needs your approval</CardTitle>
        <CardDescription>{getApprovalSummary(approvals)}</CardDescription>
        <CardAction>
          <FinanceCardLink href="/payments/approvals">View all</FinanceCardLink>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-[calc(var(--card-spacing)-var(--density-12))]">
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
              <EmptyTitle>All caught up</EmptyTitle>
              <EmptyDescription>
                Bills and reimbursements that need you show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {approvals.map((approval) => (
              <Item key={approval.id} role="listitem" size="sm">
                <ItemMedia>
                  <FinanceCounterpartyMark counterparty={approval.payee} />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="w-full">
                    <span className="truncate">{approval.payee.name}</span>
                    <span className="ms-auto tabular-nums">
                      {formatMoney(approval.amount, { cents: true })}
                    </span>
                  </ItemTitle>
                  <ItemDescription className="truncate">
                    {approval.detail}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Approve ${approval.payee.name}, ${formatMoney(approval.amount, { cents: true })}`}
                    onClick={() => onApprove(approval.id)}
                  >
                    Approve
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  )
}
