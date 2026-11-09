import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/aria-fabricator/ui/number-field"

export function NumberFieldField() {
  return (
    <Field className="max-w-xs">
      <NumberField
        name="teamSize"
        defaultValue={5}
        minValue={1}
        maxValue={50}
        aria-describedby="number-field-field-description"
      >
        <FieldLabel>Team size</FieldLabel>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <FieldDescription id="number-field-field-description">
        Billing follows the seats in use. Up to 50 on the Team plan.
      </FieldDescription>
    </Field>
  )
}
