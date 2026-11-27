import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

// Password Strength is web-only for now (see parity-exceptions.json): the native
// explorer names it and says where it runs.
function PasswordStrengthExample() {
  return (
    <ExampleWrapper>
      <Example title="On the web">
        <View className="gap-2">
          <Text className="text-base font-medium">Strong</Text>
          <Text className="text-muted-foreground">
            Password Strength runs on the web, from the same model the native
            port will use.
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { PasswordStrengthExample }
