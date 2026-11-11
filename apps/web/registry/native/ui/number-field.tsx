import * as React from "react"
import { MinusIcon, PlusIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { View } from "react-native"

import {
  canDecrement,
  canIncrement,
  commitNumberText,
  formatNumberValue,
  stepValue,
  type NumberFieldFormat,
  type NumberFieldStep,
} from "@/registry/native/lib/number-field-model"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/native/ui/input-group"

type NumberFieldProps = React.ComponentProps<typeof View> &
  NumberFieldFormat &
  NumberFieldStep & {
    value?: number | null
    defaultValue?: number | null
    onValueChange?: (value: number | null) => void
    disabled?: boolean
    readOnly?: boolean
    name?: string
  }
const NumberFieldContext = React.createContext<{
  value: number | null
  setValue: (value: number | null) => void
  min?: number
  max?: number
  step?: number | "any"
  format?: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  disabled: boolean
  readOnly: boolean
} | null>(null)

function useNumberField() {
  const context = React.use(NumberFieldContext)
  if (!context) throw new Error("Number Field parts must be inside NumberField")
  return context
}
function NumberField({
  value: prop,
  defaultValue = null,
  onValueChange,
  disabled = false,
  readOnly = false,
  min,
  max,
  step,
  locale,
  format,
  name: _name,
  className,
  ...props
}: NumberFieldProps) {
  const [currentValue, setValue] = useControllableState<number | null>({
    prop,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const value = currentValue ?? null
  return (
    <NumberFieldContext
      value={{
        value,
        setValue,
        disabled,
        readOnly,
        min,
        max,
        step,
        locale,
        format,
      }}
    >
      <View
        data-slot="number-field"
        className={cn("cn-number-field w-full min-w-0 gap-2", className)}
        {...props}
      />
    </NumberFieldContext>
  )
}
function NumberFieldGroup({
  className,
  ...props
}: React.ComponentProps<typeof InputGroup>) {
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
  onChangeText,
  onBlur,
  ...props
}: React.ComponentProps<typeof InputGroupInput>) {
  const field = useNumberField()
  const [text, setText] = React.useState<string | null>(null)
  function commit() {
    if (text !== null) field.setValue(commitNumberText(text, field))
    setText(null)
  }
  return (
    <InputGroupInput
      data-slot="number-field-input"
      keyboardType="decimal-pad"
      editable={!field.disabled && !field.readOnly}
      value={text ?? formatNumberValue(field.value, field)}
      onChangeText={(next) => {
        setText(next)
        onChangeText?.(next)
      }}
      onBlur={(event) => {
        commit()
        onBlur?.(event)
      }}
      onSubmitEditing={commit}
      className={cn("cn-number-field-input tabular-nums", className)}
      {...props}
    />
  )
}
type NumberFieldStepperProps = React.ComponentProps<typeof InputGroupButton> & {
  align?: "inline-start" | "inline-end"
}
function NumberFieldDecrement({
  align = "inline-start",
  className,
  children,
  disabled,
  onPress,
  ...props
}: NumberFieldStepperProps) {
  const field = useNumberField()
  return (
    <InputGroupAddon
      align={align}
      data-stepper="decrement"
      className="cn-number-field-addon"
    >
      <InputGroupButton
        data-slot="number-field-decrement"
        accessibilityLabel="Decrease"
        variant="ghost"
        size="icon-xs"
        disabled={disabled || !canDecrement(field.value, field)}
        onPress={(event) => {
          field.setValue(stepValue(field.value, -1, field))
          onPress?.(event)
        }}
        className={cn("cn-number-field-decrement", className)}
        {...props}
      >
        {children ?? <MinusIcon />}
      </InputGroupButton>
    </InputGroupAddon>
  )
}
function NumberFieldIncrement({
  align = "inline-end",
  className,
  children,
  disabled,
  onPress,
  ...props
}: NumberFieldStepperProps) {
  const field = useNumberField()
  return (
    <InputGroupAddon
      align={align}
      data-stepper="increment"
      className="cn-number-field-addon"
    >
      <InputGroupButton
        data-slot="number-field-increment"
        accessibilityLabel="Increase"
        variant="ghost"
        size="icon-xs"
        disabled={disabled || !canIncrement(field.value, field)}
        onPress={(event) => {
          field.setValue(stepValue(field.value, 1, field))
          onPress?.(event)
        }}
        className={cn("cn-number-field-increment", className)}
        {...props}
      >
        {children ?? <PlusIcon />}
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
