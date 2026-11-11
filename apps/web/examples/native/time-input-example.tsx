import { Example, ExampleWrapper } from "@/examples/native/example"

import { TimeInput, TimeRangeInput } from "@/registry/native/ui/time-input"

function TimeInputExample() {
  return (
    <ExampleWrapper fit>
      <Example title="12 hour time">
        <TimeInput
          defaultValue="09:30"
          hourCycle={12}
          accessibilityLabel="12 hour time"
        />
      </Example>
      <Example title="24 hour time and seconds">
        <TimeInput
          defaultValue="21:30:15"
          hourCycle={24}
          hasSeconds
          accessibilityLabel="24 hour time"
        />
      </Example>
      <Example title="Range and duration">
        <TimeRangeInput defaultValue={{ start: "09:00", end: "10:30" }} />
      </Example>
      <Example title="Bounds and minute steps">
        <TimeInput
          defaultValue="10:00"
          minTime="09:00"
          maxTime="17:00"
          step={15}
          accessibilityLabel="Appointment time"
        />
      </Example>
      <Example title="Disabled">
        <TimeInput
          defaultValue="12:00"
          disabled
          accessibilityLabel="Disabled time"
        />
      </Example>
    </ExampleWrapper>
  )
}
export { TimeInputExample }
