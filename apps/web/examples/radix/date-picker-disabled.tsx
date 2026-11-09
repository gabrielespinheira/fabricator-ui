import { DatePicker } from "@/styles/radix-fabricator/ui/date-picker"
import { Field, FieldLabel } from "@/styles/radix-fabricator/ui/field"

export function DatePickerDisabled() {
  return (
    <Field data-disabled className="max-w-64">
      <FieldLabel htmlFor="date-picker-disabled">Created</FieldLabel>
      <DatePicker
        id="date-picker-disabled"
        disabled
        defaultValue={new Date(2026, 9, 2)}
      />
    </Field>
  )
}
