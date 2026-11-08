import { Field, FieldLabel } from "@/styles/radix-fabricator/ui/field"
import { MonthInput } from "@/styles/radix-fabricator/ui/month-input"

export function MonthInputFormat() {
  return (
    <Field className="max-w-60">
      <FieldLabel htmlFor="month-input-format">Start month</FieldLabel>
      <MonthInput
        id="month-input-format"
        format="MMMM yyyy"
        defaultValue="2027-02"
      />
    </Field>
  )
}
