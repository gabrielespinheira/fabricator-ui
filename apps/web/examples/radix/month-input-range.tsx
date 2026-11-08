import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/radix-fabricator/ui/field"
import { MonthInput } from "@/styles/radix-fabricator/ui/month-input"

export function MonthInputRange() {
  return (
    <Field className="max-w-52">
      <FieldLabel htmlFor="month-input-report">Report month</FieldLabel>
      <MonthInput
        id="month-input-report"
        aria-describedby="month-input-report-description"
        minMonth="2026-01"
        maxMonth="2026-11"
        defaultValue="2026-10"
      />
      <FieldDescription id="month-input-report-description">
        January to November 2026.
      </FieldDescription>
    </Field>
  )
}
