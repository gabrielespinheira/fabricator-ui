import { DatePicker } from "@/styles/aria-fabricator/ui/date-picker"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"

export function DatePickerFormat() {
  return (
    <Field className="max-w-64">
      <FieldLabel htmlFor="date-picker-format">Date of birth</FieldLabel>
      <DatePicker
        id="date-picker-format"
        format="dd/MM/yyyy"
        placeholder="dd/mm/yyyy"
        defaultValue={new Date(1994, 2, 18)}
      />
      <FieldDescription>Day, month, then year.</FieldDescription>
    </Field>
  )
}
