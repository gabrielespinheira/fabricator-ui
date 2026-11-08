import { Field, FieldLabel } from "@/styles/aria-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/aria-fabricator/ui/number-field"

export function NumberFieldDisabled() {
  return (
    <div className="flex w-full max-w-40 flex-col gap-6">
      <Field data-disabled>
        <NumberField defaultValue={3} isDisabled>
          <FieldLabel>Disabled</FieldLabel>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <Field>
        <NumberField defaultValue={3} isReadOnly>
          <FieldLabel>Read-only</FieldLabel>
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
