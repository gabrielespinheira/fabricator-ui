import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/aria-fabricator/ui/field"
import { TimeInput } from "@/styles/aria-fabricator/ui/time-input"

export function TimeInputSeconds() {
  return (
    <Field className="max-w-56">
      <FieldLabel htmlFor="time-input-seconds">Alarm</FieldLabel>
      <TimeInput
        id="time-input-seconds"
        aria-describedby="time-input-seconds-description"
        hasSeconds
        defaultValue="06:30:15"
        name="alarm"
      />
      <FieldDescription id="time-input-seconds-description">
        Hours, minutes and seconds.
      </FieldDescription>
    </Field>
  )
}
