import { DatePicker } from "@/styles/base-fabricator/ui/date-picker"
import { Field, FieldLabel } from "@/styles/base-fabricator/ui/field"
import { TimeInput } from "@/styles/base-fabricator/ui/time-input"

export function TimeInputDateTime() {
  return (
    <fieldset className="flex w-full max-w-sm flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Event starts</legend>
      <div className="flex gap-2">
        <Field className="flex-1">
          <FieldLabel htmlFor="event-date" className="sr-only">
            Date
          </FieldLabel>
          <DatePicker id="event-date" placeholder="Date" name="date" />
        </Field>
        <Field className="w-36">
          <FieldLabel htmlFor="event-time" className="sr-only">
            Time
          </FieldLabel>
          <TimeInput id="event-time" placeholder="Time" name="time" />
        </Field>
      </div>
    </fieldset>
  )
}
