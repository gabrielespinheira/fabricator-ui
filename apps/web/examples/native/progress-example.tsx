import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { Button } from "@/registry/native/ui/button"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/registry/native/ui/progress"

function ProgressExample() {
  const [value, setValue] = React.useState(40)
  return (
    <ExampleWrapper fit>
      <Example title="Values" className="items-stretch">
        <Progress value={0} accessibilityLabel="Not started" />
        <Progress value={56} accessibilityLabel="Uploading" />
        <Progress value={100} accessibilityLabel="Done" />
      </Example>
      <Example title="Label and value" className="items-stretch">
        <Progress value={56}>
          <ProgressLabel>Upload progress</ProgressLabel>
          <ProgressValue />
        </Progress>
      </Example>
      <Example title="Custom range and format" className="items-stretch">
        <Progress
          value={3}
          min={0}
          max={5}
          format={{ style: "decimal" }}
          getAriaValueText={(formatted) => `Step ${formatted} of 5`}
        >
          <ProgressLabel>Step</ProgressLabel>
          <ProgressValue>{(formatted) => `${formatted} of 5`}</ProgressValue>
        </Progress>
      </Example>
      <Example title="Indeterminate" className="items-stretch">
        <Progress value={null}>
          <ProgressLabel>Waiting for the server</ProgressLabel>
          <ProgressValue />
        </Progress>
      </Example>
      <Example
        title="Controlled, moving on the move timing"
        className="items-stretch"
      >
        <Progress value={value} accessibilityLabel="Controlled">
          <ProgressValue />
        </Progress>
        <Button
          size="sm"
          variant="outline"
          onPress={() => setValue(value >= 100 ? 0 : value + 20)}
        >
          Add 20
        </Button>
      </Example>
    </ExampleWrapper>
  )
}

export { ProgressExample }
