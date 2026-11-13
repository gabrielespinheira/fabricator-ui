import { DatePicker } from "@/styles/base-fabricator/ui/date-picker"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"

export function DatePickerYear() {
  return (
    <Field className="max-w-52">
      <FieldLabel htmlFor="date-picker-year">Graduation year</FieldLabel>
      <DatePicker
        id="date-picker-year"
        aria-describedby="date-picker-year-description"
        granularity="year"
        minDate={new Date(1980, 0, 1)}
        maxDate={new Date(2030, 0, 1)}
      />
      <FieldDescription id="date-picker-year-description">
        From 1980 to 2030.
      </FieldDescription>
    </Field>
  )
}
