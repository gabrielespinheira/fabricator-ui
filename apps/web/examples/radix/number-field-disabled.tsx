import { Field, FieldLabel } from "@/styles/radix-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/radix-fabricator/ui/number-field"

export function NumberFieldDisabled() {
  return (
    <div className="flex w-full max-w-40 flex-col gap-6">
      <Field data-disabled>
        <FieldLabel htmlFor="number-field-disabled">Disabled</FieldLabel>
        <NumberField id="number-field-disabled" defaultValue={3} disabled>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <Field>
        <FieldLabel htmlFor="number-field-read-only">Read-only</FieldLabel>
        <NumberField id="number-field-read-only" defaultValue={3} readOnly>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
    </div>
  )
}
