import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Blueprint is web-only for now (see parity-exceptions.json): the native
// explorer names it and says where it runs.
function BlueprintExample() {
  return (
    <ExampleWrapper>
      <Example title="On the web">
        <View className="gap-2">
          <Text className="text-base font-medium">Sketched into place</Text>
          <Text className="text-muted-foreground">
            Blueprint runs on the web. Its React Native port, drawing the same
            timeline with react-native-svg, follows.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { BlueprintExample }
