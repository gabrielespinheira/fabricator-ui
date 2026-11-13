import { DatePicker } from "@/styles/aria-fabricator/ui/date-picker"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"

export function DatePickerMonth() {
  return (
    <Field className="max-w-52">
      <FieldLabel htmlFor="date-picker-month">Card expiry</FieldLabel>
      <DatePicker
        id="date-picker-month"
        aria-describedby="date-picker-month-description"
        granularity="month"
        editable
        placeholder="Mar 2028"
      />
      <FieldDescription id="date-picker-month-description">
        Type 3/2028 or Mar 2028, or pick it from the year.
      </FieldDescription>
    </Field>
  )
}
