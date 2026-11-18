import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/bases/__base__/ui/table"

export function FinanceTransactionTableHeader() {
  return (
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
  )
}
