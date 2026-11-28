import { Badge } from "@/styles/base-fabricator/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import { Button } from "@/styles/base-nova/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/styles/base-nova/ui/table"

const statusVariants = {
  Active: "success",
  "Past due": "destructive",
  Trial: "outline",
} as const

const customers: {
  id: string
  name: string
  status: keyof typeof statusVariants
  mrr: string
}[] = [
  { id: "northwind", name: "Northwind", status: "Active", mrr: "$12,400" },
  { id: "globex", name: "Globex", status: "Active", mrr: "$9,850" },
  { id: "initech", name: "Initech", status: "Past due", mrr: "$7,200" },
  { id: "umbrella", name: "Umbrella", status: "Trial", mrr: "$0" },
]

// A Table reaches the card's edges by itself, with its first and last columns
// on the card's inset, and its last row meets the bottom corner.
export function CardTable() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Top customers</CardTitle>
        <CardDescription>By monthly recurring revenue</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" className="-me-3">
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">MRR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium text-foreground">
                  {customer.name}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[customer.status]}>
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {customer.mrr}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
