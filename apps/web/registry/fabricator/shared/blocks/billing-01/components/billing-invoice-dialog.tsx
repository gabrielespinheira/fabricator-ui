import { BillingDialog } from "@/registry/bases/__base__/blocks/billing-01/components/billing-controls"
import { BillingInvoiceLines } from "@/registry/bases/__base__/blocks/billing-01/components/billing-invoice-lines"
import {
  SAMPLE_NOW,
  type BillingInvoiceRecord,
  type BillingInvoiceStatus,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import { formatDay } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const SENTENCES = {
  paid: "Paid",
  processing: "The bank is still confirming it. From",
  failed: "The bank declined it. From",
  refunded: "Paid and refunded in full. From",
} satisfies Record<BillingInvoiceStatus, string>

/** One invoice, as the same sum as the next one. */
export function BillingInvoiceDialog({
  invoice,
  isOpen,
  onOpenChange,
  onDownload,
}: {
  invoice: BillingInvoiceRecord | null
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onDownload: (invoice: BillingInvoiceRecord) => void
}) {
  if (!invoice) return null
  return (
    <BillingDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title={`Invoice ${invoice.id}`}
      description={`${SENTENCES[invoice.status]} ${formatDay(invoice.date, SAMPLE_NOW)}.`}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onDownload(invoice)}>
            <IconPlaceholder
              lucide="DownloadIcon"
              tabler="IconDownload"
              hugeicons="Download01Icon"
              phosphor="DownloadIcon"
              remixicon="RiDownloadLine"
              data-icon="inline-start"
            />
            Download PDF
          </Button>
        </>
      }
    >
      <BillingInvoiceLines label={`Invoice ${invoice.id}`} invoice={invoice} />
    </BillingDialog>
  )
}
