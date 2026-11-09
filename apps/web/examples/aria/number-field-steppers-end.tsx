import { Field, FieldLabel } from "@/styles/aria-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/aria-fabricator/ui/number-field"

export function NumberFieldSteppersEnd() {
  return (
    <Field className="max-w-48">
      <NumberField defaultValue={12} minValue={1} maxValue={500}>
        <FieldLabel>Seats</FieldLabel>
        <NumberFieldGroup>
          <NumberFieldInput />
          <NumberFieldDecrement align="inline-end" />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </Field>
  )
}
