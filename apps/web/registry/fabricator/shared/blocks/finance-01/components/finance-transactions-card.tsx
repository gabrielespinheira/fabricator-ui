import { cn } from "cn"

import { FinanceCardLink } from "@/registry/bases/__base__/blocks/finance-01/components/finance-card-link"
import { FinanceCounterpartyMark } from "@/registry/bases/__base__/blocks/finance-01/components/finance-counterparty"
import {
  type FinanceTransaction,
  type FinanceTransactionStatus,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-data"
import { formatMoney } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/bases/__base__/ui/table"

const STATUSES = {
  completed: { label: "Completed", variant: "success" },
  pending: { label: "Pending", variant: "info" },
  declined: { label: "Declined", variant: "destructive" },
} as const satisfies Record<
  FinanceTransactionStatus,
  { label: string; variant: "success" | "info" | "destructive" }
>

/** The latest money in and out, edge to edge, with their state. */
export function FinanceTransactionsCard({
  transactions,
  className,
}: {
  transactions: FinanceTransaction[]
  className?: string
}) {
  return (
    <Card className={cn("@container/transactions", className)}>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
        <CardDescription>Newest first</CardDescription>
        <CardAction>
          <FinanceCardLink href="/transactions">View all</FinanceCardLink>
        </CardAction>
      </CardHeader>
      <CardContent className="-mb-(--card-spacing) px-0">
        <Table className="[&_tr>*:first-child]:ps-(--card-spacing) [&_tr>*:last-child]:pe-(--card-spacing)">
          <TableHeader>
            <TableRow>
              <TableHead>Payee</TableHead>
              <TableHead className="hidden @lg/transactions:table-cell">
                Date
              </TableHead>
              <TableHead className="hidden @sm/transactions:table-cell">
                Status
              </TableHead>
              <TableHead className="text-end">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const status = STATUSES[transaction.status]
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="max-w-0 min-w-28 font-medium text-foreground">
                    <div className="flex items-center gap-(--density-10)">
                      <FinanceCounterpartyMark
                        counterparty={transaction.payee}
                      />
                      <div className="flex min-w-0 flex-col items-start gap-(--density-4)">
                        <span className="max-w-full truncate">
                          {transaction.payee.name}
                        </span>
                        {/* Narrow cards move the status under the name. */}
                        <Badge
                          variant={status.variant}
                          className="@sm/transactions:hidden"
                        >
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden tabular-nums @lg/transactions:table-cell">
                    {transaction.date}
                  </TableCell>
                  <TableCell className="hidden @sm/transactions:table-cell">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-end text-foreground tabular-nums">
                    {formatMoney(transaction.amount, {
                      cents: true,
                      signed: true,
                    })}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
