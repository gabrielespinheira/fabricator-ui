"use client"

import type * as React from "react"
import { cn } from "cn"
import {
  composeRenderProps,
  RadioGroup as RadioGroupPrimitive,
  Radio as RadioPrimitive,
  type RadioGroupProps,
  type RadioProps,
} from "react-aria-components"

import { useRadioGlide } from "@/registry/bases/aria/hooks/use-radio-glide"

// Fabricator override of the upstream radio group: the indicator stays
// mounted, and the checked dot glides from the radio it leaves to the one
// picked. A first pick scales the dot in (state attributes in the style map).

function RadioGroup({
  className,
  ref,
  ...props
}: RadioGroupProps & React.RefAttributes<HTMLDivElement>) {
  const glideRef = useRadioGlide<HTMLDivElement>("[data-selected]", ref)
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      ref={glideRef}
      className={cn("cn-radio-group w-full", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, children, ...props }: RadioProps) {
  return (
    <RadioPrimitive
      data-slot="radio-group-item"
      className={cn(
        "cn-radio-group-item cn-radio-group-item-aria group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span
            data-slot="radio-group-indicator"
            data-checked={isSelected ? "" : undefined}
            data-unchecked={isSelected ? undefined : ""}
            className="cn-radio-group-indicator"
          >
            <span className="cn-radio-group-indicator-icon" />
          </span>
          {children}
        </>
      ))}
    </RadioPrimitive>
  )
}

export { RadioGroup, RadioGroupItem }
