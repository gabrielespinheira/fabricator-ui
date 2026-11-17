import {
  formatDelta,
  getDeltaTone,
  type DeltaUnit,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** A signed change with its arrow, green when it moved the way it should. */
export function FinanceDelta({
  change,
  isGoodWhenUp,
  unit,
}: {
  change: number
  isGoodWhenUp: boolean
  unit: DeltaUnit
}) {
  const tone = getDeltaTone(change, isGoodWhenUp)
  const label = formatDelta(change, unit)
  if (tone === "neutral") return <Badge variant="outline">{label}</Badge>

  return (
    <Badge variant={tone} className="tabular-nums">
      {change > 0 ? (
        <IconPlaceholder
          lucide="ArrowUpRightIcon"
          tabler="IconArrowUpRight"
          hugeicons="ArrowUpRight01Icon"
          phosphor="ArrowUpRightIcon"
          remixicon="RiArrowRightUpLine"
        />
      ) : (
        <IconPlaceholder
          lucide="ArrowDownRightIcon"
          tabler="IconArrowDownRight"
          hugeicons="ArrowDownRight01Icon"
          phosphor="ArrowDownRightIcon"
          remixicon="RiArrowRightDownLine"
        />
      )}
      {label}
    </Badge>
  )
}
