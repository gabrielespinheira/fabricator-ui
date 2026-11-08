import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { DatePicker } from "@/registry/native/ui/date-picker"
import { DensityScope } from "@/registry/native/ui/density"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/registry/native/ui/field"
import { Text } from "@/registry/native/ui/text"

function DatePickerExample() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 10, 12)
  )
  return (
    <ExampleWrapper fit>
      <Example title="Default">
        <DatePicker aria-label="Due date" placeholder="Pick or type a date" />
      </Example>
      <Example title="In a field">
        <Field>
          <FieldLabel>Start date</FieldLabel>
          <DatePicker placeholder="Nov 12, 2026" />
          <FieldDescription>
            Type a date, or press the calendar to pick one.
          </FieldDescription>
        </Field>
      </Example>
      <Example title="Controlled">
        <DatePicker
          aria-label="Publish on"
          value={date}
          onValueChange={setDate}
        />
        <Text className="text-muted-foreground tabular-nums">
          {date
            ? date.toLocaleDateString("en-US", { dateStyle: "full" })
            : "No date"}
        </Text>
      </Example>
      <Example title="Format">
        <DatePicker
          aria-label="Date of birth"
          format="dd/MM/yyyy"
          placeholder="dd/mm/yyyy"
          defaultValue={new Date(1994, 2, 18)}
        />
      </Example>
      <Example title="Minimum and maximum">
        <DatePicker
          aria-label="Delivery date"
          minDate={new Date(2026, 10, 9)}
          maxDate={new Date(2026, 11, 18)}
          defaultValue={new Date(2026, 10, 16)}
        />
      </Example>
      <Example title="Invalid">
        <Field data-invalid>
          <FieldLabel>Renewal date</FieldLabel>
          <DatePicker aria-invalid defaultValue={new Date(2026, 0, 4)} />
          <FieldError>Pick a date after today.</FieldError>
        </Field>
      </Example>
      <Example title="Disabled">
        <DatePicker
          aria-label="Created"
          disabled
          defaultValue={new Date(2026, 9, 2)}
        />
      </Example>
      <Example title="Sizes">
        <DensityScope density="compact">
          <DatePicker
            aria-label="Compact date"
            defaultValue={new Date(2026, 10, 12)}
          />
        </DensityScope>
        <DatePicker aria-label="Date" defaultValue={new Date(2026, 10, 12)} />
        <DensityScope density="spacious">
          <DatePicker
            aria-label="Spacious date"
            defaultValue={new Date(2026, 10, 12)}
          />
        </DensityScope>
      </Example>
    </ExampleWrapper>
  )
}

export { DatePickerExample }
