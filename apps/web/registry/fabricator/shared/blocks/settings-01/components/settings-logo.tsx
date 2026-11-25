import { cn } from "cn"

import { getTextOn } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-color-model"

/** The workspace's logo, or its first letter on the brand colour. */
export function SettingsLogo({
  name,
  logo,
  color,
  className,
}: {
  name: string
  logo: string | null
  color: string
  className?: string
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className={cn("size-full rounded-[inherit] object-cover", className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-full items-center justify-center rounded-[inherit] weight-semibold",
        className
      )}
      style={{ background: color, color: getTextOn(color) }}
    >
      {name.trim().charAt(0).toUpperCase() || "A"}
    </span>
  )
}
