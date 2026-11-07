"use client"

import * as React from "react"
import { cn } from "cn"
import { Label as LabelPrimitive } from "radix-ui"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-(--density-8) text-(length:--density-text-13) leading-none font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 in-[[data-slot=field]:has([data-slot=checkbox],[data-slot=switch],[data-slot=radio-group-item])]:cursor-pointer has-[[data-slot=checkbox],[data-slot=switch],[data-slot=radio-group-item]]:cursor-pointer has-[~:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch])]:-my-(--density-10) has-[~:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch])]:py-(--density-10) [:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch])~&]:-my-(--density-10) [:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch])~&]:py-(--density-10) [[data-slot=checkbox]~&]:cursor-pointer [[data-slot=radio-group-item]~&]:cursor-pointer [[data-slot=switch]~&]:cursor-pointer",
        className
      )}
      {...props}
    />
  )
}

export { Label }
