import {
  Field,
  FieldError,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/base-fabricator/ui/number-field"

export function NumberFieldInvalid() {
  return (
    <Field data-invalid className="max-w-48">
      <FieldLabel htmlFor="number-field-invalid">Age</FieldLabel>
      <NumberField id="number-field-invalid" defaultValue={16} min={0}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput
            aria-invalid
            aria-describedby="number-field-invalid-error"
          />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <FieldError id="number-field-invalid-error">
        You must be 18 or older.
      </FieldError>
    </Field>
  )
}
