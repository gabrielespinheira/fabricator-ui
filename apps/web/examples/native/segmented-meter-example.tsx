import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Segmented Meter is web-only for now (see parity-exceptions.json): the native
// explorer names it and says where it runs.
function SegmentedMeterExample() {
  return (
    <ExampleWrapper>
      <Example title="On the web">
        <View className="gap-2">
          <Text className="text-base font-medium">74.2 GB of 128 GB</Text>
          <Text className="text-muted-foreground">
            Segmented Meter runs on the web. Its React Native port follows, on
            the same model.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { SegmentedMeterExample }
