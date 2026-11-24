import { cn } from "cn"

import { getReadableColor } from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"

/** The workspace's letter on the colour it picked. */
export function OnboardingMark({
  name,
  color,
  className,
}: {
  name: string
  color: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-(--density-28) shrink-0 items-center justify-center rounded-lg transition-colors duration-move ease-move weight-semibold",
        className
      )}
      style={{ background: color, color: getReadableColor(color) }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
