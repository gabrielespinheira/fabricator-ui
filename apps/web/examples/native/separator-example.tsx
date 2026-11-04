import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Separator } from "@/registry/native/ui/separator"
import { Text } from "@/registry/native/ui/text"

function SeparatorExample() {
  return (
    <ExampleWrapper>
      <Example title="Horizontal" className="items-stretch">
        <Text>Acme Inc</Text>
        <Separator orientation="horizontal" />
        <Text className="text-muted-foreground">gabs@fabricator.dev</Text>
      </Example>
      <Example title="Vertical">
        <View className="h-5 flex-row items-center gap-3">
          <Text>Blog</Text>
          <Separator orientation="vertical" />
          <Text>Docs</Text>
          <Separator orientation="vertical" />
          <Text>Source</Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { SeparatorExample }
