import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/radix-fabricator/ui/field"
import { TimeInput } from "@/styles/radix-fabricator/ui/time-input"

export function TimeInputRange() {
  return (
    <Field className="max-w-48">
      <FieldLabel htmlFor="time-input-office">Meeting</FieldLabel>
      <TimeInput
        id="time-input-office"
        aria-describedby="time-input-office-description"
        step={30}
        minTime="09:00"
        maxTime="17:00"
        placeholder="9:00 AM"
      />
      <FieldDescription id="time-input-office-description">
        Office hours, every 30 minutes.
      </FieldDescription>
    </Field>
  )
}
