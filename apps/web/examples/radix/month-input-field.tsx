import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/radix-fabricator/ui/field"
import { MonthInput } from "@/styles/radix-fabricator/ui/month-input"

export function MonthInputField() {
  return (
    <Field className="max-w-52">
      <FieldLabel htmlFor="month-input-expiry">Card expiry</FieldLabel>
      <MonthInput
        id="month-input-expiry"
        aria-describedby="month-input-expiry-description"
        placeholder="Mar 2028"
      />
      <FieldDescription id="month-input-expiry-description">
        Type 3/2028 or Mar 2028, or press Alt+Down for the months.
      </FieldDescription>
    </Field>
  )
}
