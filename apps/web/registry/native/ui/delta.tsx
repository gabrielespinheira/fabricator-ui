import * as React from "react"
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"

import {
  getDelta,
  type DeltaTone,
  type DeltaUnit,
} from "@/registry/fabricator/shared/lib/delta-model"
import { Badge } from "@/registry/native/ui/badge"
import { Text } from "@/registry/native/ui/text"

// A change against the previous period as a status badge, as on the website:
// the arrow and sign carry the direction, so colour is never the only cue.

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
      <Text
        data-slot="delta"
        data-direction="none"
        className={cn("cn-delta-empty", className)}
      >
        {delta.label}
      </Text>
    )
  }
  return (
    <Badge
      data-delta={delta.direction}
      variant={BADGE_VARIANTS[delta.tone]}
      className={cn("cn-delta", className)}
      {...props}
    >
      {delta.direction === "up" && <ArrowUpRightIcon />}
      {delta.direction === "down" && <ArrowDownRightIcon />}
      {delta.label}
    </Badge>
  )
}

export { Delta }
