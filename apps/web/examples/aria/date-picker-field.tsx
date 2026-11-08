import { DatePicker } from "@/styles/aria-fabricator/ui/date-picker"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"

export function DatePickerField() {
  return (
    <Field className="max-w-64">
      <FieldLabel htmlFor="date-picker-start">Start date</FieldLabel>
      <DatePicker
        id="date-picker-start"
        aria-describedby="date-picker-start-description"
        placeholder="Nov 12, 2026"
      />
      <FieldDescription id="date-picker-start-description">
        Type a date, or press Alt+Down to open the calendar.
      </FieldDescription>
    </Field>
  )
}
