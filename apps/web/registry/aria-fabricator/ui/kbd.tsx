"use client"

import { cn } from "cn"
import { Keyboard as KbdPrimitive } from "react-aria-components"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <KbdPrimitive
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-(--density-20) w-fit min-w-(--density-20) items-center justify-center gap-1 rounded-[5px] bg-hover px-1 font-sans text-(length:--density-text-11) font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <KbdPrimitive
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
