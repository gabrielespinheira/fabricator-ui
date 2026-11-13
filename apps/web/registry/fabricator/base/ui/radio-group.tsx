"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "cn"

import { useRadioGlide } from "@/registry/bases/base/hooks/use-radio-glide"

// Fabricator override of the upstream radio group: the indicator stays
// mounted, and the checked dot glides from the radio it leaves to the one
// picked. A first pick scales the dot in (state attributes in the style map).

function RadioGroup({ className, ref, ...props }: RadioGroupPrimitive.Props) {
  const glideRef = useRadioGlide<HTMLDivElement>("[data-checked]", ref)
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      ref={glideRef}
      className={cn("cn-radio-group w-full", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "cn-radio-group-item group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        keepMounted
        data-slot="radio-group-indicator"
        className="cn-radio-group-indicator"
      >
        <span className="cn-radio-group-indicator-icon" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
