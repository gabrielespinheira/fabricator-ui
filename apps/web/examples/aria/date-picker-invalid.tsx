import { DatePicker } from "@/styles/aria-fabricator/ui/date-picker"
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"

export function DatePickerInvalid() {
  return (
    <Field data-invalid className="max-w-64">
      <FieldLabel htmlFor="date-picker-invalid">Renewal date</FieldLabel>
      <DatePicker
        id="date-picker-invalid"
        aria-invalid
        aria-describedby="date-picker-invalid-error"
        defaultValue={new Date(2026, 0, 4)}
      />
      <FieldError id="date-picker-invalid-error">
        Pick a date after today.
      </FieldError>
    </Field>
  )
}
