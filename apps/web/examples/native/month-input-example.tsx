import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { DensityScope } from "@/registry/native/ui/density"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/registry/native/ui/field"
import { MonthInput } from "@/registry/native/ui/month-input"
import { Text } from "@/registry/native/ui/text"

function MonthInputExample() {
  const [month, setMonth] = React.useState<string | undefined>("2026-11")
  return (
    <ExampleWrapper fit>
      <Example title="Default">
        <MonthInput
          aria-label="Billing month"
          placeholder="Pick or type a month"
        />
      </Example>
      <Example title="In a field">
        <Field>
          <FieldLabel>Card expiry</FieldLabel>
          <MonthInput placeholder="Mar 2028" />
          <FieldDescription>
            Type 3/2028 or Mar 2028, or press the calendar to pick one.
          </FieldDescription>
        </Field>
      </Example>
      <Example title="Controlled">
        <MonthInput
          aria-label="Statement"
          value={month}
          onValueChange={setMonth}
        />
        <Text className="text-muted-foreground tabular-nums">
          Value: {month ?? "none"}
        </Text>
      </Example>
      <Example title="Format">
        <MonthInput
          aria-label="Start month"
          format="MMMM yyyy"
          defaultValue="2027-02"
        />
      </Example>
      <Example title="Minimum and maximum">
        <MonthInput
          aria-label="Report month"
          minMonth="2026-01"
          maxMonth="2026-11"
          defaultValue="2026-10"
        />
      </Example>
      <Example title="Invalid">
        <Field data-invalid>
          <FieldLabel>Renewal month</FieldLabel>
          <MonthInput aria-invalid defaultValue="2026-01" />
          <FieldError>Pick a month after this one.</FieldError>
        </Field>
      </Example>
      <Example title="Disabled">
        <MonthInput aria-label="Created" disabled defaultValue="2026-09" />
      </Example>
      <Example title="Sizes">
        <DensityScope density="compact">
          <MonthInput aria-label="Compact month" defaultValue="2026-11" />
        </DensityScope>
        <MonthInput aria-label="Default month" defaultValue="2026-11" />
        <DensityScope density="spacious">
          <MonthInput aria-label="Spacious month" defaultValue="2026-11" />
        </DensityScope>
      </Example>
    </ExampleWrapper>
  )
}

export { MonthInputExample }
