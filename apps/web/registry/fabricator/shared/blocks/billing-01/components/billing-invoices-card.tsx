import { cn } from "cn"

import {
  BillingIconButton,
  BillingInvoiceTableHeader,
} from "@/registry/bases/__base__/blocks/billing-01/components/billing-controls"
import { BillingInvoiceStatusBadge } from "@/registry/bases/__base__/blocks/billing-01/components/billing-invoice-status"
import {
  SAMPLE_NOW,
  type BillingInvoiceRecord,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  formatDay,
  formatMoney,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Card,
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
import { Skeleton } from "@/registry/bases/__base__/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/registry/bases/__base__/ui/table"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** What was charged. A date opens the invoice, the icon downloads it. */
export function BillingInvoicesCard({
  invoices,
  isLoading,
  onOpen,
  onDownload,
  className,
}: {
  invoices: BillingInvoiceRecord[]
  isLoading: boolean
  onOpen: (invoice: BillingInvoiceRecord) => void
  onDownload: (invoice: BillingInvoiceRecord) => void
  className?: string
}) {
  return (
    <Card className={cn("@container/invoices", className)}>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Newest first</CardDescription>
      </CardHeader>
      {isLoading && (
        <CardContent>
          <Skeleton
            role="status"
            aria-busy
            aria-label="Loading invoices"
            className="h-60"
          />
        </CardContent>
      )}
      {!isLoading && invoices.length === 0 && (
        <CardContent className="flex flex-1">
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
              <EmptyTitle>No invoices yet</EmptyTitle>
              <EmptyDescription>
                The first one comes when the trial ends.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      )}
      {!isLoading && invoices.length > 0 && (
        <CardContent className="-mb-(--card-spacing) px-0">
          <Table
            aria-label="Invoices"
            className="[&_tr>*:first-child]:ps-(--card-spacing) [&_tr>*:last-child]:pe-[calc(var(--card-spacing)-var(--density-6))]"
          >
            <BillingInvoiceTableHeader />
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-foreground">
                    <Button
                      variant="link"
                      className="-ms-px h-auto px-0 py-(--density-4)"
                      aria-label={`${formatDay(invoice.date, SAMPLE_NOW)}, invoice ${invoice.id}`}
                      onClick={() => onOpen(invoice)}
                    >
                      {formatDay(invoice.date, SAMPLE_NOW)}
                    </Button>
                    {/* A narrow card moves the status under the date. */}
                    <div className="@sm/invoices:hidden">
                      <BillingInvoiceStatusBadge status={invoice.status} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden tabular-nums @lg/invoices:table-cell">
                    {invoice.id}
                  </TableCell>
                  <TableCell className="hidden @sm/invoices:table-cell">
                    <BillingInvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-end text-foreground tabular-nums">
                    {formatMoney(invoice.total)}
                  </TableCell>
                  <TableCell>
                    <BillingIconButton
                      label={`Download ${invoice.id}`}
                      onClick={() => onDownload(invoice)}
                    >
                      <IconPlaceholder
                        lucide="DownloadIcon"
                        tabler="IconDownload"
                        hugeicons="Download01Icon"
                        phosphor="DownloadIcon"
                        remixicon="RiDownloadLine"
                      />
                    </BillingIconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  )
}
