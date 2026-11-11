import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { TimeWheel } from "@/registry/native/ui/time-wheel"

function TimeWheelExample() {
  const [value, setValue] = React.useState<string | undefined>("09:30")
  return (
    <ExampleWrapper fit>
      <Example title="12 hour clock">
        <TimeWheel value={value} onValueChange={setValue} hourCycle={12} />
      </Example>
      <Example title="24 hour clock and seconds">
        <TimeWheel
          value={value}
          onValueChange={setValue}
          hourCycle={24}
          hasSeconds
        />
      </Example>
    </ExampleWrapper>
  )
}
export { TimeWheelExample }
