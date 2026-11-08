import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/radix-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/radix-fabricator/ui/number-field"

export function NumberFieldField() {
  return (
    <Field className="max-w-xs">
      <FieldLabel htmlFor="number-field-field">Team size</FieldLabel>
      <NumberField
        id="number-field-field"
        name="teamSize"
        defaultValue={5}
        min={1}
        max={50}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-describedby="number-field-field-description" />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <FieldDescription id="number-field-field-description">
        Billing follows the seats in use. Up to 50 on the Team plan.
      </FieldDescription>
    </Field>
  )
}
