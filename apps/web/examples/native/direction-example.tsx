import { Example, ExampleWrapper } from "@/examples/native/example"

import { DirectionProvider, useDirection } from "@/registry/native/ui/direction"
import { Text } from "@/registry/native/ui/text"

function CurrentDirection() {
  const direction = useDirection()
  return <Text>This screen reads {direction}.</Text>
}

function DirectionExample() {
  return (
    <ExampleWrapper>
      <Example title="Left to right, always">
        <DirectionProvider direction="rtl">
          <CurrentDirection />
        </DirectionProvider>
      </Example>
    </ExampleWrapper>
  )
}

export { DirectionExample }
