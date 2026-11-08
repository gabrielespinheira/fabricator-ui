import { Field, FieldLabel } from "@/styles/base-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/base-fabricator/ui/number-field"

export function NumberFieldDemo() {
  return (
    <Field className="max-w-40">
      <FieldLabel htmlFor="number-field-demo">Quantity</FieldLabel>
      <NumberField id="number-field-demo" defaultValue={2} min={1} max={99}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </Field>
  )
}
