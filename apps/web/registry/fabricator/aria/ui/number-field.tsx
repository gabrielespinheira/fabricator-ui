"use client"

// Number Field: a number input with decrement and increment steppers, built on
// React Aria's NumberField and drawn by the Input Group, so its frame, focus,
// hover, invalid and disabled states are the input's. The Input Group's Group,
// Input and Button pick up the NumberField's context. Each stepper sits in its
// own addon: at both ends by default, or both at the end with
// align="inline-end" on the decrement.
import type * as React from "react"
import { cn } from "cn"
import {
  NumberField as NumberFieldPrimitive,
  type NumberFieldProps as NumberFieldPrimitiveProps,
} from "react-aria-components"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/bases/aria/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type NumberFieldStepperProps = Omit<
  React.ComponentProps<typeof InputGroupButton>,
  "slot"
> & {
  align?: "inline-start" | "inline-end"
}

function NumberField({
  className,
  ...props
}: Omit<NumberFieldPrimitiveProps, "className"> & { className?: string }) {
  return (
    <NumberFieldPrimitive
      data-slot="number-field"
      className={cn("cn-number-field flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  )
}

function NumberFieldGroup({
  className,
  ...props
}: Omit<React.ComponentProps<typeof InputGroup>, "className"> & {
  className?: string
}) {
  return (
    <InputGroup
      data-slot="number-field-group"
      className={cn("cn-number-field-group", className)}
      {...props}
    />
  )
}

function NumberFieldInput({
  className,
  ...props
}: React.ComponentProps<typeof InputGroupInput>) {
  return (
    <InputGroupInput
      data-slot="number-field-input"
      className={cn(
        "cn-number-field-input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

function NumberFieldDecrement({
  className,
  align = "inline-start",
  children,
  ...props
}: NumberFieldStepperProps) {
  return (
    <InputGroupAddon
      align={align}
      data-stepper="decrement"
      className="cn-number-field-addon"
    >
      <InputGroupButton
        slot="decrement"
        data-slot="number-field-decrement"
        size="icon-xs"
        variant="ghost"
        className={cn("cn-number-field-decrement", className)}
        {...props}
      >
        {children ?? (
          <IconPlaceholder
            lucide="MinusIcon"
            tabler="IconMinus"
            hugeicons="MinusSignIcon"
            phosphor="MinusIcon"
            remixicon="RiSubtractLine"
          />
        )}
      </InputGroupButton>
    </InputGroupAddon>
  )
}

function NumberFieldIncrement({
  className,
  align = "inline-end",
  children,
  ...props
}: NumberFieldStepperProps) {
  return (
    <InputGroupAddon
      align={align}
      data-stepper="increment"
      className="cn-number-field-addon"
    >
      <InputGroupButton
        slot="increment"
        data-slot="number-field-increment"
        size="icon-xs"
        variant="ghost"
        className={cn("cn-number-field-increment", className)}
        {...props}
      >
        {children ?? (
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
          />
        )}
      </InputGroupButton>
    </InputGroupAddon>
  )
}

export {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
  NumberFieldDecrement,
  NumberFieldIncrement,
}
