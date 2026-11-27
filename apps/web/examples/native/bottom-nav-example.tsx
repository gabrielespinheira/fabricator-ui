import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Bottom Nav is web-only for now (see parity-exceptions.json): the native
// explorer names it and says where it runs.
function BottomNavExample() {
  return (
    <ExampleWrapper>
      <Example title="On the web">
        <View className="gap-2">
          <Text className="text-base font-medium">
            Home, Search, Activity, Profile
          </Text>
          <Text className="text-muted-foreground">
            Bottom Nav is the tab bar for phone web apps. React Native apps get
            theirs from the App Shell's bottom bar.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { BottomNavExample }
