import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { Button } from "@/registry/native/ui/button"
import { Text } from "@/registry/native/ui/text"

function FabricatorRootExample() {
  const [count, setCount] = React.useState(0)
  return (
    <ExampleWrapper>
      <Example title="Root setup">
        <Text selectable className="font-mono text-sm">
          {
            "<SafeAreaProvider>\n  <FabricatorRoot>\n    <App />\n  </FabricatorRoot>\n</SafeAreaProvider>"
          }
        </Text>
      </Example>
      <Example title="Running inside FabricatorRoot">
        <Text>
          The example app already uses FabricatorRoot for gestures, density,
          safe areas and overlays.
        </Text>
        <Button onPress={() => setCount(count + 1)}>
          Pressed {count} times
        </Button>
      </Example>
    </ExampleWrapper>
  )
}
export { FabricatorRootExample }
