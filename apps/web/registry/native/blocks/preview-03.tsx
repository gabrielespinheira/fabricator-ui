import { ScrollView } from "react-native"

import { Text } from "@/registry/native/ui/text"

function Preview03() {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-background"
      contentContainerClassName="p-safe-offset-6"
    >
      <Text>Preview 03</Text>
    </ScrollView>
  )
}

export { Preview03 }
