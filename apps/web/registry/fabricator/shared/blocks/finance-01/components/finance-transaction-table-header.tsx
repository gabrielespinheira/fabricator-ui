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
        <TableHead className="hidden @2xl/transactions:table-cell">
          Account
        </TableHead>
        <TableHead className="hidden @3xl/transactions:table-cell">
          Category
        </TableHead>
        <TableHead className="hidden @sm/transactions:table-cell">
          Status
        </TableHead>
        <TableHead className="text-end">Amount</TableHead>
      </TableRow>
    </TableHeader>
  )
}
