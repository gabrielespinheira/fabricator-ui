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

export function NumberFieldMinMax() {
  return (
    <Field className="max-w-48">
      <NumberField
        defaultValue={4.5}
        minValue={0}
        maxValue={5}
        step={0.5}
        aria-describedby="number-field-min-max-description"
      >
        <FieldLabel>Rating</FieldLabel>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <FieldDescription id="number-field-min-max-description">
        From 0 to 5, in steps of 0.5.
      </FieldDescription>
    </Field>
  )
}
