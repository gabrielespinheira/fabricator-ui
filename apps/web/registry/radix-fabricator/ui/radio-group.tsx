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
      className={cn("grid w-full gap-(--density-16)", className)}
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
        "group/radio-group-item peer relative flex aspect-square size-[calc(var(--density-icon-16)+2px)] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[1.5px]! border-foreground/25 bg-transparent transition-[background-color,border-color,box-shadow,scale] duration-feedback ease-feedback outline-none group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-foreground/45 focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive motion-reduce:transition-none motion-reduce:active:scale-100 data-checked:border-primary data-checked:bg-primary data-checked:hover:border-primary aria-invalid:data-checked:border-destructive aria-invalid:data-checked:bg-destructive",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        forceMount
        data-slot="radio-group-indicator"
        className="flex size-full scale-0 items-center justify-center opacity-0 transition-[opacity,scale] duration-feedback-exit ease-exit motion-reduce:transition-none data-checked:scale-100 data-checked:opacity-100 data-checked:duration-move data-checked:ease-enter"
      >
        <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
