"use client"

// Number Field: a number input with decrement and increment steppers, built on
// Base UI's NumberField and drawn by the Input Group, so its frame, focus,
// hover, invalid and disabled states are the input's. Each stepper sits in its
// own addon: at both ends by default, or both at the end with
// align="inline-end" on the decrement.
import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field"
import { cn } from "cn"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/bases/base/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type NumberFieldStepperProps = NumberFieldPrimitive.Decrement.Props & {
  align?: "inline-start" | "inline-end"
}

function NumberField({ className, ...props }: NumberFieldPrimitive.Root.Props) {
  return (
    <NumberFieldPrimitive.Root
      data-slot="number-field"
      className={cn("cn-number-field flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  )
}

function NumberFieldGroup({
  className,
  ...props
}: NumberFieldPrimitive.Group.Props) {
  return (
    <NumberFieldPrimitive.Group
      data-slot="number-field-group"
      render={<InputGroup />}
      className={cn("cn-number-field-group", className)}
      {...props}
    />
  )
}

function NumberFieldInput({
  className,
  ...props
}: NumberFieldPrimitive.Input.Props) {
  return (
    <NumberFieldPrimitive.Input
      data-slot="number-field-input"
      render={<InputGroupInput />}
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
      <NumberFieldPrimitive.Decrement
        data-slot="number-field-decrement"
        aria-label="Decrease"
        render={<InputGroupButton size="icon-xs" variant="ghost" />}
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
      </NumberFieldPrimitive.Decrement>
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
      <NumberFieldPrimitive.Increment
        data-slot="number-field-increment"
        aria-label="Increase"
        render={<InputGroupButton size="icon-xs" variant="ghost" />}
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
      </NumberFieldPrimitive.Increment>
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
