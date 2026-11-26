import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Text Motion is web-only for now (see parity-exceptions.json): the native
// explorer shows the same copy at rest, where the motion will play.
function TextMotionExample() {
  return (
    <ExampleWrapper>
      <Example title="At rest">
        <View className="gap-2">
          <Text
            role="heading"
            className="text-3xl font-semibold tracking-tight"
          >
            Interfaces that move with intent
          </Text>
          <Text className="text-muted-foreground">
            Text Motion plays on the web. On React Native the text shows in
            place until its port lands.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { TextMotionExample }
