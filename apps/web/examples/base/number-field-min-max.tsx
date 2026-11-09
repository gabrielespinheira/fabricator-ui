import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/base-fabricator/ui/number-field"

export function NumberFieldMinMax() {
  return (
    <Field className="max-w-48">
      <FieldLabel htmlFor="number-field-min-max">Rating</FieldLabel>
      <NumberField
        id="number-field-min-max"
        defaultValue={4.5}
        min={0}
        max={5}
        step={0.5}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-describedby="number-field-min-max-description" />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <FieldDescription id="number-field-min-max-description">
        From 0 to 5, in steps of 0.5.
      </FieldDescription>
    </Field>
  )
}
