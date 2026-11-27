import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Hold Button is web-only for now (see parity-exceptions.json): the native
// explorer names it and says where it runs.
function HoldButtonExample() {
  return (
    <ExampleWrapper>
      <Example title="On the web">
        <View className="gap-2">
          <Text className="text-base font-medium">Delete project</Text>
          <Text className="text-muted-foreground">
            Hold Button confirms when held on the web. On React Native it shows
            here until its port lands, with a long press and haptics.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { HoldButtonExample }
