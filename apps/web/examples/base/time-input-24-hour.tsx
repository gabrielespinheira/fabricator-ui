import { Field, FieldLabel } from "@/styles/base-fabricator/ui/field"
import { TimeInput } from "@/styles/base-fabricator/ui/time-input"

export function TimeInput24Hour() {
  return (
    <Field className="max-w-40">
      <FieldLabel htmlFor="time-input-24">Departure</FieldLabel>
      <TimeInput id="time-input-24" hourCycle={24} defaultValue="18:45" />
    </Field>
  )
}
