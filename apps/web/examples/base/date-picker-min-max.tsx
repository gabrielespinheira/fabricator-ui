import { DatePicker } from "@/styles/base-fabricator/ui/date-picker"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"

export function DatePickerMinMax() {
  return (
    <Field className="max-w-64">
      <FieldLabel htmlFor="date-picker-min-max">Delivery date</FieldLabel>
      <DatePicker
        id="date-picker-min-max"
        minDate={new Date(2026, 10, 9)}
        maxDate={new Date(2026, 11, 18)}
        defaultValue={new Date(2026, 10, 16)}
      />
      <FieldDescription>Between Nov 9 and Dec 18, 2026.</FieldDescription>
    </Field>
  )
}
