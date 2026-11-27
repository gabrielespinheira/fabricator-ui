import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Slide to Confirm is web-only for now (see parity-exceptions.json): the native
// explorer names it and says where it runs.
function SlideToConfirmExample() {
  return (
    <ExampleWrapper>
      <Example title="On the web">
        <View className="gap-2">
          <Text className="text-base font-medium">Slide to pay $240.00</Text>
          <Text className="text-muted-foreground">
            Slide to Confirm runs on the web. Its React Native port, on a pan
            gesture and the same model, follows.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { SlideToConfirmExample }
