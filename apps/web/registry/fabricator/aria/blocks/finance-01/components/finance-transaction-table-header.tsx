import { TableHead, TableHeader } from "@/registry/bases/aria/ui/table"

export function FinanceTransactionTableHeader() {
  return (
    <TableHeader>
      <TableHead isRowHeader>Payee</TableHead>
      <TableHead className="hidden @lg/transactions:table-cell">Date</TableHead>
      <TableHead className="hidden @sm/transactions:table-cell">
        Status
      </TableHead>
      <TableHead className="text-end">Amount</TableHead>
    </TableHeader>
  )
}
