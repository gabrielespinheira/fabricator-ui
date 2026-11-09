import { Field, FieldLabel } from "@/styles/aria-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/aria-fabricator/ui/number-field"

export function NumberFieldDemo() {
  return (
    <Field className="max-w-40">
      <NumberField defaultValue={2} minValue={1} maxValue={99}>
        <FieldLabel>Quantity</FieldLabel>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </Field>
  )
}
