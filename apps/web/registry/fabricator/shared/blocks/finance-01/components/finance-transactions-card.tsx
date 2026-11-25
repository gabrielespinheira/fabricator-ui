import { cn } from "cn"

import { FinanceCardLink } from "@/registry/bases/__base__/blocks/finance-01/components/finance-card-link"
import { FinanceCounterpartyMark } from "@/registry/bases/__base__/blocks/finance-01/components/finance-counterparty"
import { FinanceTransactionTableHeader } from "@/registry/bases/__base__/blocks/finance-01/components/finance-transaction-table-header"
import {
  formatDate,
  formatMoney,
  type FinanceAccountId,
  type FinanceStatus,
  type FinanceTransaction,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
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
  TableRow,
} from "@/registry/bases/__base__/ui/table"

// Colour only for what isn't over yet: a completed payment needs nobody.
const STATUSES = {
  completed: { label: "Completed", variant: "outline" },
  pending: { label: "Pending", variant: "info" },
  declined: { label: "Declined", variant: "destructive" },
} as const satisfies Record<
  FinanceStatus,
  { label: string; variant: "outline" | "info" | "destructive" }
>

/** The latest money in and out, edge to edge, with its state. */
export function FinanceTransactionsCard({
  transactions,
  accountNames,
  className,
}: {
  transactions: readonly FinanceTransaction[]
  accountNames: Readonly<Record<FinanceAccountId, string>>
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
        <Table
          aria-label="Recent transactions"
          className="[&_tr>*:first-child]:ps-(--card-spacing) [&_tr>*:last-child]:pe-(--card-spacing)"
        >
          <FinanceTransactionTableHeader />
          <TableBody>
            {transactions.map((transaction) => {
              const status = STATUSES[transaction.status]
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="w-full max-w-0 font-medium text-foreground @3xl/transactions:w-2/5">
                    <div className="flex items-center gap-(--density-10)">
                      <FinanceCounterpartyMark
                        counterparty={transaction.payee}
                      />
                      <div className="flex min-w-0 flex-col items-start gap-(--density-4)">
                        {/* A narrow card wraps the name rather than cut it. */}
                        <span className="max-w-full whitespace-normal @lg/transactions:truncate">
                          {transaction.payee.name}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-(--density-8) gap-y-(--density-4) font-normal text-muted-foreground @lg/transactions:hidden">
                          {formatDate(transaction.date)}
                          {transaction.status !== "completed" && (
                            <Badge
                              variant={status.variant}
                              className="@sm/transactions:hidden"
                            >
                              {status.label}
                            </Badge>
                          )}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums @lg/transactions:table-cell">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground @2xl/transactions:table-cell">
                    {accountNames[transaction.accountId]}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground @3xl/transactions:table-cell">
                    {transaction.category}
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
