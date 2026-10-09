"use client"

import * as React from "react"
import { cn } from "cn"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

// Fabricator override of the upstream radio group: the indicator stays
// mounted so the dot scales out as well as in (driven by its state attributes
// in the style map), instead of unmounting when another radio is picked.

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("cn-radio-group w-full", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "cn-radio-group-item group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        forceMount
        data-slot="radio-group-indicator"
        className="cn-radio-group-indicator"
      >
        <span className="cn-radio-group-indicator-icon" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
