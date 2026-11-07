"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-(--density-20) w-[calc(var(--density-20)+var(--density-14))] shrink-0 cursor-pointer items-center rounded-full border-0 px-0.5 ring-offset-background transition-all duration-feedback ease-feedback outline-none group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-1 aria-invalid:ring-destructive/50 aria-invalid:ring-offset-2 data-[size=sm]:density-compact data-checked:bg-primary data-checked:hover:bg-primary/90 data-unchecked:bg-accent data-unchecked:hover:bg-[color-mix(in_oklab,var(--accent),rgb(var(--overlay))_10%)] data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none relative block size-[calc(var(--density-20)-4px)] rounded-full bg-transparent ring-0 transition-transform duration-move ease-move before:absolute before:inset-0 before:rounded-full before:bg-white before:shadow-[0_1px_2px_rgb(0_0_0/0.15),0_0_0_0.5px_rgb(0_0_0/0.04)] before:transition-[inset,background-color] before:duration-move before:ease-move group-active/switch:before:inset-y-0.5 motion-reduce:before:transition-none data-checked:translate-x-(--density-14) data-checked:before:bg-primary-foreground group-hover/switch:data-checked:before:-left-0.5 group-active/switch:data-checked:before:-left-1 data-unchecked:translate-x-0 group-hover/switch:data-unchecked:before:-right-0.5 group-active/switch:data-unchecked:before:-right-1"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
