import { DatePicker } from "@/styles/base-fabricator/ui/date-picker"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"

export function DatePickerField() {
  return (
    <Field className="max-w-64">
      <FieldLabel htmlFor="date-picker-start">Start date</FieldLabel>
      <DatePicker
        id="date-picker-start"
        aria-describedby="date-picker-start-description"
      />
      <FieldDescription id="date-picker-start-description">
        The day the work begins.
      </FieldDescription>
    </Field>
  )
}
