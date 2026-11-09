import {
  Field,
  FieldError,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/aria-fabricator/ui/number-field"

export function NumberFieldInvalid() {
  return (
    <Field data-invalid className="max-w-48">
      <NumberField
        defaultValue={16}
        minValue={0}
        isInvalid
        aria-describedby="number-field-invalid-error"
      >
        <FieldLabel>Age</FieldLabel>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <FieldError id="number-field-invalid-error">
        You must be 18 or older.
      </FieldError>
    </Field>
  )
}
