import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Stepper is web-only for now (see parity-exceptions.json): the native
// explorer names it and says where it runs.
function StepperExample() {
  return (
    <ExampleWrapper>
      <Example title="On the web">
        <View className="gap-2">
          <Text className="text-base font-medium">
            Cart, Shipping, Payment, Review
          </Text>
          <Text className="text-muted-foreground">
            Stepper runs on the web. Its React Native port follows, with the
            same parts and the check drawn in SVG.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { StepperExample }
