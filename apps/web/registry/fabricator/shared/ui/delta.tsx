import * as React from "react"
import { cn } from "cn"

import {
  getDelta,
  type DeltaTone,
  type DeltaUnit,
} from "@/registry/bases/__base__/lib/delta-model"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A change against the previous period as a status badge: green when it moved
// the way it should, red when it didn't, an outline when nothing changed.
// The arrow and the sign carry the direction, so colour is never the only cue.

const BADGE_VARIANTS = {
  good: "success",
  bad: "destructive",
  neutral: "outline",
} as const satisfies Record<DeltaTone, string>

function Delta({
  change,
  isGoodWhenUp = true,
  unit = "%",
  locale,
  emptyLabel,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "children" | "variant"> & {
  /** The change in the unit's terms; null when there is nothing to compare. */
  change: number | null
  /** False for metrics where down is good: churn, cost, latency. */
  isGoodWhenUp?: boolean
  /** Percent, or points for rates. */
  unit?: DeltaUnit
  locale?: string
  /** Shown when change is null. */
  emptyLabel?: string
}) {
  const delta = getDelta({ change, isGoodWhenUp, unit, locale, emptyLabel })
  if (delta.direction === "none") {
    return (
      <span
        data-slot="delta"
        data-direction="none"
        className={cn("cn-delta-empty", className)}
      >
        {delta.label}
      </span>
    )
  }
  return (
    <Badge
      data-delta={delta.direction}
      variant={BADGE_VARIANTS[delta.tone]}
      className={cn("cn-delta tabular-nums", className)}
      {...props}
    >
      {delta.direction === "up" && (
        <IconPlaceholder
          lucide="ArrowUpRightIcon"
          tabler="IconArrowUpRight"
          hugeicons="ArrowUpRight01Icon"
          phosphor="ArrowUpRightIcon"
          remixicon="RiArrowRightUpLine"
        />
      )}
      {delta.direction === "down" && (
        <IconPlaceholder
          lucide="ArrowDownRightIcon"
          tabler="IconArrowDownRight"
          hugeicons="ArrowDownRight01Icon"
          phosphor="ArrowDownRightIcon"
          remixicon="RiArrowRightDownLine"
        />
      )}
      {delta.label}
    </Badge>
  )
}

export { Delta }
