import { Field, FieldLabel } from "@/styles/base-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/base-fabricator/ui/number-field"

export function NumberFieldSteppersEnd() {
  return (
    <Field className="max-w-48">
      <FieldLabel htmlFor="number-field-steppers-end">Seats</FieldLabel>
      <NumberField
        id="number-field-steppers-end"
        defaultValue={12}
        min={1}
        max={500}
      >
        <NumberFieldGroup>
          <NumberFieldInput />
          <NumberFieldDecrement align="inline-end" />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </Field>
  )
}
