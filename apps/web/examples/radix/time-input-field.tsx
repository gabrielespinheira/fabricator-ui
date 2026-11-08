import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/radix-fabricator/ui/field"
import { TimeInput } from "@/styles/radix-fabricator/ui/time-input"

export function TimeInputField() {
  return (
    <Field className="max-w-48">
      <FieldLabel htmlFor="time-input-reminder">Reminder</FieldLabel>
      <TimeInput
        id="time-input-reminder"
        aria-describedby="time-input-reminder-description"
        defaultValue="09:30"
      />
      <FieldDescription id="time-input-reminder-description">
        Type 930, 9:30 pm or noon, or pick from the list.
      </FieldDescription>
    </Field>
  )
}
