import * as React from "react"
import {
  getPaymentRows,
  type Payment,
} from "@/examples/native/data-table-model"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import { Checkbox } from "@/registry/native/ui/checkbox"
import { Input } from "@/registry/native/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/native/ui/table"
import { Text } from "@/registry/native/ui/text"

const PAYMENTS: Payment[] = [
  { id: "a", email: "ken99@example.com", amount: 316, status: "success" },
  { id: "b", email: "abe45@example.com", amount: 242, status: "success" },
  {
    id: "c",
    email: "monserrat44@example.com",
    amount: 837,
    status: "processing",
  },
  { id: "d", email: "silas22@example.com", amount: 874, status: "success" },
  { id: "e", email: "carmella@example.com", amount: 721, status: "failed" },
]
function DataTableExample() {
  const [query, setQuery] = React.useState("")
  const [descending, setDescending] = React.useState(false)
  const [page, setPage] = React.useState(0)
  const [selected, setSelected] = React.useState<string[]>([])
  const result = React.useMemo(
    () => getPaymentRows(PAYMENTS, query, descending, page, 3),
    [query, descending, page]
  )
  return (
    <ExampleWrapper>
      <Example
        title="Filtering, sorting, selection and pagination"
        className="items-stretch"
      >
        <Input
          accessibilityLabel="Filter emails"
          placeholder="Filter emails…"
          value={query}
          onChangeText={(value) => {
            setQuery(value)
            setPage(0)
          }}
          autoCapitalize="none"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Select</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onPress={() => setDescending(!descending)}
                >
                  Amount {descending ? "↓" : "↑"}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((payment) => (
              <TableRow
                key={payment.id}
                data-state={
                  selected.includes(payment.id) ? "selected" : undefined
                }
              >
                <TableCell>
                  <Checkbox
                    checked={selected.includes(payment.id)}
                    accessibilityLabel={`Select ${payment.email}`}
                    onCheckedChange={(checked) =>
                      setSelected((current) =>
                        checked
                          ? [...current, payment.id]
                          : current.filter((id) => id !== payment.id)
                      )
                    }
                  />
                </TableCell>
                <TableCell>{payment.status}</TableCell>
                <TableCell>{payment.email}</TableCell>
                <TableCell>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(payment.amount)}
                </TableCell>
              </TableRow>
            ))}
            {!result.rows.length && (
              <TableRow>
                <TableCell colSpan={4}>No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Text className="text-muted-foreground">
          {selected.length} of {PAYMENTS.length} rows selected.
        </Text>
        <View className="flex-row justify-end gap-2">
          <Button
            variant="outline"
            disabled={result.page === 0}
            onPress={() => setPage(result.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={result.page + 1 >= result.pages}
            onPress={() => setPage(result.page + 1)}
          >
            Next
          </Button>
        </View>
      </Example>
    </ExampleWrapper>
  )
}
export { DataTableExample }
