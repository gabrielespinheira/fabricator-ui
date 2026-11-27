import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Morph Island is web-only for now (see parity-exceptions.json): the native
// explorer names it and says where it runs.
function MorphIslandExample() {
  return (
    <ExampleWrapper>
      <Example title="On the web">
        <View className="gap-2">
          <Text className="text-base font-medium">Focus 04:59</Text>
          <Text className="text-muted-foreground">
            Morph Island runs on the web. Its React Native port, on the same
            springs through Reanimated, follows.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { MorphIslandExample }
